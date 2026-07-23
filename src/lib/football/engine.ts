import type { MatchEvent, MatchSettings, MatchStats, Player, PlayerMatchStats, Position, PositionGroup, Team } from "./types";
import { POSITION_GROUP } from "./types";
import { formationMatchup, slotsFor } from "./formations";
import { BUILDUP_TABLE, PRESS_TABLE, teamTacticalAdjustment } from "./tactics";
import * as C from "./commentary";

export interface MatchState {
  minute: number;
  extraTime: number;
  finished: boolean;
  halfTimeAnnounced: boolean;
  secondHalfAnnounced: boolean;
  events: MatchEvent[];
  teams: [Team, Team];
  settings: MatchSettings;
  playerStats: Record<string, PlayerMatchStats>;
  /** Set to the team index (0|1) when a red card just happened and the UI should pause for a dialog. */
  redCardPausePending: (0 | 1) | null;
  /** Tracks which player ids have already triggered a stamina alert (to fire only once). */
  staminaAlertFired: Set<string>;
  /** Tracks which automation "closingDown" already fired (per team). */
  closingDownFired: [boolean, boolean];
  /** Tracks which automation "exploitRedCard" already fired (per team). */
  exploitRedFired: [boolean, boolean];
  /** Tracks at which minutes AI insights were last emitted. */
  lastInsightMinute: number;
}

function rand(): number { return Math.random(); }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

/**
 * Peso relativo de probabilidad de que un jugador remate/convierta un gol,
 * según su grupo lógico EN CANCHA (no la natural). Refleja el fútbol real:
 * delanteros > mediocampistas > defensores > arqueros.
 * El arquero tiene un peso ínfimo (≈ penal de emergencia): prácticamente nunca convierte.
 */
function scorerWeight(fieldPos: PositionGroup | undefined): number {
  switch (fieldPos) {
    case "FWD": return 1.0;
    case "MID": return 0.5;
    case "DEF": return 0.12;
    case "GK": return 0.005;
    default: return 0.3;
  }
}

/** Selección aleatoria ponderada. Devuelve undefined si la lista está vacía. */
function weightedPick<T>(items: T[], weight: (t: T) => number): T | undefined {
  if (items.length === 0) return undefined;
  const weights = items.map((it) => Math.max(0, weight(it)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Ajuste interno para el motor de simulación.
 * Se mantiene solo en el engine para preservar el comportamiento previo de eventos.
 */
function positionRatingFactor(player: Player): number {
  if (!player.fieldPosition) return 1;
  const effective = computePlayerPositionRating(player, player.fieldPosition);
  return player.overall ? Math.max(0.1, Math.min(1.5, effective / player.overall)) : 1;
}

/**
 * Calcula la valoración general del jugador según la posición del slot en la alineación.
 * Esta función reemplaza completamente la lógica de penalización porcentual por fuera de posición.
 */
export function computePlayerPositionRating(player: Player, fieldPosition?: PositionGroup): number {
  const slotGroup = fieldPosition ?? player.fieldPosition;
  if (!slotGroup) return player.overall;

  if (slotGroup === "GK") {
    if (player.position !== "POR") return 30;
    const div = player.gkDiving ?? 0;
    const par = player.gkHandling ?? 0;
    const sac = player.gkKicking ?? 0;
    const ref = player.gkReflexes ?? 0;
    const vel = player.pace;
    const pos = player.gkPositioning ?? 0;
    return Math.round(Math.max(1, Math.min(99, 0.15 * div + 0.20 * par + 0.10 * sac + 0.25 * ref + 0.05 * vel + 0.25 * pos)));
  }

  const formula = getFieldPositionFormula(player.position, slotGroup);
  const base = formula(player);
  const bonus = slotGroup === POSITION_GROUP[player.position] ? 1 : 0;
  return Math.max(1, Math.min(99, Math.round(base + bonus)));
}

function getFieldPositionFormula(position: Position, slotGroup: PositionGroup) {
  if (slotGroup === "DEF") {
    if (position === "DFC") return defenderCenterFormula;
    if (position === "LI" || position === "LD") return fullbackFormula;
    if (position === "CAI" || position === "CAD") return wingbackFormula;
    return defenderCenterFormula;
  }
  if (slotGroup === "MID") {
    if (position === "MCO") return attackingMidFormula;
    if (position === "MCD") return defensiveMidFormula;
    if (position === "MC") return centralMidFormula;
    if (position === "MI" || position === "MD") return wideMidFormula;
    return centralMidFormula;
  }
  if (slotGroup === "FWD") {
    if (position === "DC") return strikerFormula;
    if (position === "SD") return secondStrikerFormula;
    return wideForwardFormula;
  }
  return centralMidFormula;
}

const strikerFormula = (p: Player) => 0.10 * p.pace + 0.45 * p.shooting + 0.10 * p.passing + 0.20 * p.dribbling + 0.05 * p.defense + 0.10 * p.physical;
const secondStrikerFormula = (p: Player) => 0.10 * p.pace + 0.35 * p.shooting + 0.20 * p.passing + 0.25 * p.dribbling + 0.05 * p.defense + 0.05 * p.physical;
const wideForwardFormula = (p: Player) => 0.20 * p.pace + 0.15 * p.shooting + 0.25 * p.passing + 0.30 * p.dribbling + 0.05 * p.defense + 0.05 * p.physical;
const attackingMidFormula = (p: Player) => 0.05 * p.pace + 0.20 * p.shooting + 0.35 * p.passing + 0.30 * p.dribbling + 0.05 * p.defense + 0.05 * p.physical;
const centralMidFormula = (p: Player) => 0.05 * p.pace + 0.10 * p.shooting + 0.35 * p.passing + 0.20 * p.dribbling + 0.15 * p.defense + 0.15 * p.physical;
const wideMidFormula = (p: Player) => 0.15 * p.pace + 0.10 * p.shooting + 0.30 * p.passing + 0.25 * p.dribbling + 0.10 * p.defense + 0.10 * p.physical;
const defensiveMidFormula = (p: Player) => 0.05 * p.pace + 0.05 * p.shooting + 0.25 * p.passing + 0.10 * p.dribbling + 0.35 * p.defense + 0.20 * p.physical;
const defenderCenterFormula = (p: Player) => 0.10 * p.pace + 0.00 * p.shooting + 0.10 * p.passing + 0.05 * p.dribbling + 0.50 * p.defense + 0.25 * p.physical;
const fullbackFormula = (p: Player) => 0.15 * p.pace + 0.05 * p.shooting + 0.15 * p.passing + 0.10 * p.dribbling + 0.40 * p.defense + 0.15 * p.physical;
const wingbackFormula = (p: Player) => 0.20 * p.pace + 0.05 * p.shooting + 0.20 * p.passing + 0.15 * p.dribbling + 0.25 * p.defense + 0.15 * p.physical;

/**
 * Nivel ofensivo de un jugador para rematar: combinación de Tiro y Regate.
 * Pesa más el Tiro (70%) que el Regate (30%) para la calidad del remate.
 */
function shooterRating(p: Player): number {
  return (p.shooting * 0.7 + p.dribbling * 0.3) * positionRatingFactor(p);
}

/**
 * Nivel de creación / progresión del ataque: combinación de Pase y Velocidad.
 * Pesa más el Pase (75%) que la Velocidad (25%).
 */
function creatorRating(p: Player): number {
  return (p.passing * 0.75 + p.pace * 0.25) * positionRatingFactor(p);
}

/**
 * Capacidad defensiva: combinación de Defensa y Físico.
 * Pesa más la Defensa (70%) que el Físico (30%).
 */
function defenderRating(p: Player): number {
  return (p.defense * 0.7 + p.physical * 0.3) * positionRatingFactor(p);
}

/**
 * Capacidad de sprint / desgaste: combinación de Físico y Velocidad.
 */
function athleticRating(p: Player): number {
  return (p.physical * 0.5 + p.pace * 0.5);
}

function teamStrength(team: Team): { attack: number; defense: number; overall: number } {
  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  if (onField.length === 0) return { attack: 40, defense: 40, overall: 40 };
  const staminaFactor = (p: Player) => 0.6 + 0.4 * (p.stamina / 100) * (p.injured ? 0.7 : 1);

  // Nivel de Ataque: FWD + MID en cancha — combinación de creación (Pase+Velocidad)
  // y remate (Tiro+Regate). Los creadores dan profundidad, los rematadores definen.
  // fieldPosition contiene el PositionGroup del slot (GK/DEF/MID/FWD).
  const atkLine = onField.filter((p) => p.fieldPosition === "FWD" || p.fieldPosition === "MID");
  const defLine = onField.filter((p) => p.fieldPosition === "DEF" || p.fieldPosition === "GK");

  const atk = atkLine.length > 0
    ? avg(atkLine.map((p) => {
        const sf = staminaFactor(p);
        return (creatorRating(p) * 0.4 + shooterRating(p) * 0.6) * sf;
      }))
    : avg(onField.map((p) => {
        const sf = staminaFactor(p);
        return (creatorRating(p) * 0.4 + shooterRating(p) * 0.6) * sf;
      }));

  const def = defLine.length > 0
    ? avg(defLine.map((p) => defenderRating(p) * staminaFactor(p)))
    : avg(onField.map((p) => defenderRating(p) * staminaFactor(p)));

  const ov = avg(onField.map((p) => computePlayerPositionRating(p, p.fieldPosition) * staminaFactor(p)));
  // Penalización por hombres menos
  const numericPenalty = Math.max(0, 11 - onField.length) * 4;
  // Ajuste táctico: roles individuales + altura de línea (tabla configurable en tactics.ts).
  const tac = teamTacticalAdjustment(team, onField);
  return {
    attack: atk - numericPenalty + tac.attack,
    defense: def - numericPenalty + tac.defense,
    overall: ov - numericPenalty,
  };
}

/**
 * Calcula Nivel de Ataque y Nivel de Defensa de un equipo antes del partido
 * (para mostrar en la previa y el vestuario). Resuelve la posición de cancha a
 * partir de los slots de la formación (no depende de que initMatch haya corrido)
 * y aplica el mismo ajuste táctico que la simulación en vivo, para que la previa
 * y el partido usen exactamente el mismo cálculo (sin sistemas paralelos).
 */
export function previewStrength(team: Team): { attack: number; defense: number } {
  const formSlots = slotsFor(team.formation);
  const starters = team.starting
    .map((id, i) => {
      const p = team.squad.find((pp) => pp.id === id);
      return p ? { ...p, fieldPosition: formSlots[i] } : null;
    })
    .filter(Boolean) as Player[];
  if (starters.length === 0) return { attack: 50, defense: 50 };
  const atkLine = starters.filter((p) => p.fieldPosition === "FWD" || p.fieldPosition === "MID");
  const defLine = starters.filter((p) => p.fieldPosition === "DEF" || p.fieldPosition === "GK");
  const baseAtk = atkLine.length > 0
    ? avg(atkLine.map((p) => (creatorRating(p) * 0.4 + shooterRating(p) * 0.6) * positionRatingFactor(p)))
    : avg(starters.map((p) => (creatorRating(p) * 0.4 + shooterRating(p) * 0.6) * positionRatingFactor(p)));
  const baseDef = defLine.length > 0
    ? avg(defLine.map((p) => defenderRating(p) * positionRatingFactor(p)))
    : avg(starters.map((p) => defenderRating(p) * positionRatingFactor(p)));
  const tac = teamTacticalAdjustment(team, starters);
  return {
    attack: Math.round(baseAtk + tac.attack),
    defense: Math.round(baseDef + tac.defense),
  };
}

function avg(a: number[]): number { return a.reduce((s, n) => s + n, 0) / a.length; }

function styleAttackMod(s: Team["style"]): number {
  return s === "Ofensivo" ? 0.25 : s === "Defensivo" ? -0.15 : 0;
}
function styleDefenseMod(s: Team["style"]): number {
  return s === "Defensivo" ? 0.2 : s === "Ofensivo" ? -0.15 : 0;
}

export function initMatch(teams: [Team, Team], settings: MatchSettings): MatchState {
  // Marcar onField segun starting y asignar posición de cancha según slot
  const playerStats: Record<string, PlayerMatchStats> = {};
  for (const t of teams) {
    const slots = slotsFor(t.formation);
    for (const p of t.squad) {
      const slotIdx = t.starting.indexOf(p.id);
      p.onField = slotIdx >= 0;
      p.fieldPosition = slotIdx >= 0 ? slots[slotIdx] : undefined;
      p.slotIndex = slotIdx >= 0 ? slotIdx : undefined;
      p.stamina = 100;
      p.redCarded = false;
      p.yellowCards = 0;
      p.injured = false;
      playerStats[p.id] = {
        playerId: p.id,
        goals: 0,
        saves: 0,
        shots: 0,
        minutesPlayed: 0,
        yellowCards: 0,
        redCarded: false,
      };
    }
    t.saves = 0;
    t.goals = 0;
    t.shots = 0;
    t.shotsOnTarget = 0;
    t.corners = 0;
    t.fouls = 0;
    t.possession = 0;
    t.xg = 0;
    t.redCards = 0;
    t.yellowCards = 0;
    t.substitutionsLeft = settings.maxSubs;
  }
  return {
    minute: 0,
    extraTime: 0,
    finished: false,
    halfTimeAnnounced: false,
    secondHalfAnnounced: false,
    events: [C.kickoff()],
    teams,
    settings,
    playerStats,
    redCardPausePending: null,
    staminaAlertFired: new Set<string>(),
    closingDownFired: [false, false],
    exploitRedFired: [false, false],
    lastInsightMinute: 0,
  };
}

/** Avanza 1 minuto de partido y devuelve nuevos eventos generados. */
export function tickMinute(state: MatchState): MatchEvent[] {
  if (state.finished) return [];
  const newEvents: MatchEvent[] = [];
  state.minute += 1;

  // Half-time
  if (state.minute === 45 && !state.halfTimeAnnounced) {
    state.halfTimeAnnounced = true;
    newEvents.push(C.halftime());
    // Recuperación parcial
    for (const t of state.teams) for (const p of t.squad) if (p.onField) p.stamina = Math.min(100, p.stamina + 15);
  }
  if (state.minute === 46 && !state.secondHalfAnnounced) {
    state.secondHalfAnnounced = true;
    newEvents.push(C.secondHalf());
  }

  // Reducir stamina — la presión alta cansa más rápido (tabla en tactics.ts)
  // El desgaste depende del atlético del jugador (Físico+Velocidad): mejor físico = menos desgaste.
  for (const t of state.teams) {
    const drain = PRESS_TABLE[t.pressIntensity ?? "Media"].staminaDrain;
    for (const p of t.squad) {
      if (p.onField && !p.redCarded) {
        const athleticMod = 0.7 + 0.3 * (athleticRating(p) / 99);
        p.stamina = Math.max(20, p.stamina - (0.5 + rand() * 0.8) * drain / athleticMod);
      }
    }
  }

  const [A, B] = state.teams;
  const sA = teamStrength(A);
  const sB = teamStrength(B);
  const matchup = formationMatchup(A.formation, B.formation); // positivo favorece A

  // Estilo de salida (build-up) e intensidad de presión (tablas en tactics.ts)
  const buA = BUILDUP_TABLE[A.buildUp ?? "Equilibrado"];
  const buB = BUILDUP_TABLE[B.buildUp ?? "Equilibrado"];
  const pressA = PRESS_TABLE[A.pressIntensity ?? "Media"];
  const pressB = PRESS_TABLE[B.pressIntensity ?? "Media"];

  // Posesión: quien tiene mejor nivel general presiona más, sesgada por la salida.
  const totalOverall = sA.overall + sB.overall || 1;
  let posA = sA.overall / totalOverall;
  posA += (buA.possession - buB.possession) / 200; // salida lenta => más posesión
  posA = Math.max(0.15, Math.min(0.85, posA));
  if (rand() < posA) A.possession += 1; else B.possession += 1;

  // Probabilidad de evento base — la presión alta genera más ocasiones.
  const eventRoll = rand();
  const styleTotal = (styleAttackMod(A.style) + styleAttackMod(B.style)) * 0.5;
  const pressBonus = pressA.eventBonus + pressB.eventBonus;

  if (eventRoll < 0.14 + styleTotal * 0.2 + pressBonus) {
    // Decidir quién ataca: ataque de A vs defensa de B (y viceversa)
    const attackerIsA = rand() < 0.5 + (sA.attack - sB.defense) / 400 + matchup;
    const attacker = attackerIsA ? A : B;
    const defender = attackerIsA ? B : A;
    handleAttack(state, attacker, defender, attackerIsA ? 0 : 1, newEvents);
  } else if (eventRoll < 0.20) {
    // Falta / amarilla
    const teamIdx = rand() < 0.5 ? 0 : 1;
    const team = state.teams[teamIdx];
      const fouler = pick(team.squad.filter((p) => p.onField && !p.redCarded && p.position !== "POR"));
    if (fouler) {
      newEvents.push(C.foulEv(state.minute, fouler.name));
      team.fouls += 1;
      const fStats = state.playerStats[fouler.id];
      if (rand() < 0.18) {
        fouler.yellowCards += 1;
        team.yellowCards += 1;
        if (fStats) fStats.yellowCards += 1;
        newEvents.push(C.yellow(state.minute, fouler.name));
        if (fouler.yellowCards >= 2) {
          fouler.redCarded = true;
          fouler.onField = false;
          team.redCards += 1;
          if (fStats) fStats.redCarded = true;
          newEvents.push(C.red(state.minute, fouler.name, team.config.name));
        }
      } else if (rand() < 0.02) {
        fouler.redCarded = true;
        fouler.onField = false;
        team.redCards += 1;
        if (fStats) fStats.redCarded = true;
        newEvents.push(C.red(state.minute, fouler.name, team.config.name));
      }
    }
  } else if (eventRoll < 0.24) {
    // Córner
    const teamIdx = rand() < 0.5 ? 0 : 1;
    state.teams[teamIdx].corners += 1;
    newEvents.push(C.cornerEv(state.minute, state.teams[teamIdx].config.name));
  } else if (state.settings.injuriesEnabled && eventRoll < 0.245) {
    // Lesión rara
    const teamIdx = rand() < 0.5 ? 0 : 1;
    const team = state.teams[teamIdx];
    const victim = pick(team.squad.filter((p) => p.onField && !p.redCarded && !p.injured));
    if (victim) {
      victim.injured = true;
      newEvents.push(C.injuryEv(state.minute, victim.name));
    }
  } else if (state.minute % 7 === 0) {
    newEvents.push(C.tickComment(state.minute));
  }

  // ─── Automatizaciones tácticas ──────────────────────────────────────────────
  const auto = state.settings.automations;
  const rawHumanIdx = state.teams.findIndex((t) => !t.config.isBot);
  const humanTeamIdx: (0 | 1) | null = rawHumanIdx === 0 ? 0 : rawHumanIdx === 1 ? 1 : null;

  if (auto && humanTeamIdx !== null) {
    const humanTeam = state.teams[humanTeamIdx];
    const rivalIdx = humanTeamIdx === 0 ? 1 : 0;
    const rivalTeam = state.teams[rivalIdx];

    // Rule 1: Ganando por 1 después del min 75 → lineHeight Baja + style Defensivo
    if (auto.closingDown && !state.closingDownFired[humanTeamIdx] && state.minute > 75) {
      const lead = humanTeam.goals - rivalTeam.goals;
      if (lead === 1) {
        humanTeam.lineHeight = "Baja";
        humanTeam.style = "Defensivo";
        state.closingDownFired[humanTeamIdx] = true;
        newEvents.push(C.autoClosingDown(state.minute, humanTeam.config.name));
      }
    }

    // Rule 2: Rival queda con un jugador expulsado → lineHeight Alta
    if (auto.exploitRedCard && !state.exploitRedFired[humanTeamIdx]) {
      const rivalReds = rivalTeam.squad.filter((p) => p.redCarded).length;
      if (rivalReds >= 1) {
        humanTeam.lineHeight = "Alta";
        state.exploitRedFired[humanTeamIdx] = true;
        newEvents.push(C.autoExploitRed(state.minute, humanTeam.config.name));
      }
    }

    // Rule 3: Jugador propio con stamina < 60 → notificación (solo una vez por jugador)
    // Se evalúa para el equipo humano identificado, pero como en modo 2 jugadores
    // AMBOS son "humanos", el bloque se repite abajo para el otro equipo también.
    if (auto.staminaAlert) {
      const tired = humanTeam.squad.find(
        (p) => p.onField && !p.redCarded && p.stamina < 60 && !state.staminaAlertFired.has(p.id),
      );
      if (tired) {
        state.staminaAlertFired.add(tired.id);
        newEvents.push(C.autoStaminaAlert(state.minute, tired.name, humanTeam.config.name));
      }
    }
  }

  // En modo 2 jugadores ambos equipos son "humanos": el bloque anterior solo detecta
  // el primero (índice 0). Evaluamos el segundo equipo de forma explícita si también
  // es humano y es distinto del que ya procesamos arriba.
  if (auto && auto.staminaAlert) {
    for (const [idx, team] of state.teams.entries()) {
      // Saltar si ya fue cubierto por el bloque principal (humanTeamIdx)
      if (idx === humanTeamIdx) continue;
      // Solo si no es bot
      if (team.config.isBot) continue;
      const tired = team.squad.find(
        (p) => p.onField && !p.redCarded && p.stamina < 60 && !state.staminaAlertFired.has(p.id),
      );
      if (tired) {
        state.staminaAlertFired.add(tired.id);
        newEvents.push(C.autoStaminaAlert(state.minute, tired.name, team.config.name));
      }
    }
  }

  // ─── Señal de pausa para expulsión del equipo humano (modo interactivo) ─────
  if (state.redCardPausePending === null && humanTeamIdx !== null) {
    const redThisTick = newEvents.find((ev) => ev.kind === "card" && ev.text.includes("ROJA"));
    if (redThisTick) {
      const humanTeam = state.teams[humanTeamIdx];
      const humanHadRed = humanTeam.squad.some(
        (p) => p.redCarded && !state.staminaAlertFired.has("__red_checked_" + p.id),
      );
      if (humanHadRed) {
        for (const p of humanTeam.squad) {
          if (p.redCarded) state.staminaAlertFired.add("__red_checked_" + p.id);
        }
        state.redCardPausePending = humanTeamIdx;
      }
    }
  }

  // ─── Sugerencias de IA cada 15–20 minutos simulados ─────────────────────────
  // Se generan sugerencias para AMBOS equipos (humanos y bots por igual),
  // cada una identificada con el equipo al que corresponde, para que en modo
  // 2 jugadores ambos reciban información relevante en el relato compartido.
  const insightInterval = 15 + Math.floor(rand() * 6); // 15–20 minutos
  if (state.minute - state.lastInsightMinute >= insightInterval && state.minute > 5 && !state.finished) {
    state.lastInsightMinute = state.minute;
    const [TA, TB] = state.teams;
    const [posA, posB] = possessionPct(state);

    // Genera insights para un equipo concreto frente a su rival.
    function insightsFor(team: Team, rival: Team, possession: number): string[] {
      const results: string[] = [];
      const prefix = team.config.name;

      // Posesión muy baja → sugerir salida más lenta
      if (possession <= 35) {
        results.push(`${prefix}: posesión muy baja (${possession}%). Considerá una salida más lenta para mantener la pelota.`);
      }
      // Posesión dominante
      if (possession >= 65) {
        results.push(`${prefix}: domina la posesión (${possession}%). Bien parado en el mediocampo.`);
      }

      // Jugador con stamina crítica
      const veryTired = team.squad
        .filter((p) => p.onField && !p.redCarded && p.stamina < 50)
        .sort((x, y) => x.stamina - y.stamina)[0];
      if (veryTired) {
        results.push(`${prefix}: ${veryTired.name} tiene el físico muy bajo (${Math.round(veryTired.stamina)}%). Considerá un cambio.`);
      }

      // Eficacia del rival contra este equipo
      if (rival.shots > 0 && rival.shotsOnTarget / rival.shots > 0.55) {
        results.push(`${prefix}: el rival es muy eficaz (${rival.shotsOnTarget} tiros al arco de ${rival.shots}). Reforzá la defensa.`);
      }

      // Diferencia de xG marcada
      if (team.xg > 0 && rival.xg > 0) {
        if (rival.xg > team.xg * 1.6) {
          results.push(`${prefix}: el rival genera más peligro real (xG ${rival.xg.toFixed(1)} vs ${team.xg.toFixed(1)}). Está siendo más efectivo.`);
        } else if (team.xg > rival.xg * 1.6) {
          results.push(`${prefix}: generás más peligro que el rival (xG ${team.xg.toFixed(1)} vs ${rival.xg.toFixed(1)}). Bien posicionados.`);
        }
      }

      return results;
    }

    // Generar un insight para cada equipo (independientemente de si es bot o humano)
    const insightsA = insightsFor(TA, TB, posA);
    const insightsB = insightsFor(TB, TA, posB);

    if (insightsA.length > 0) {
      newEvents.push(C.aiInsight(state.minute, insightsA[Math.floor(Math.random() * insightsA.length)]));
    }
    if (insightsB.length > 0) {
      newEvents.push(C.aiInsight(state.minute, insightsB[Math.floor(Math.random() * insightsB.length)]));
    }
  }

  // Final
  if (state.minute >= 90) {
    if (state.extraTime === 0) {
      state.extraTime = 1 + Math.floor(rand() * 5);
    }
    if (state.minute >= 90 + state.extraTime) {
      state.finished = true;
      newEvents.push(
        C.fullTime(state.minute, [A.goals, B.goals], [A.config.name, B.config.name]),
      );
    }
  }

  state.events.push(...newEvents);
  return newEvents;
}

function handleAttack(state: MatchState, attacker: Team, defender: Team, atkIdx: 0 | 1, out: MatchEvent[]) {
  attacker.shots += 1;

  // Rematador: se elige entre TODOS los jugadores de campo, ponderando por la
  // posición EN CANCHA (fieldPosition) y su capacidad ofensiva específica.
  // Usa shooterRating (Tiro+Regate) en vez de un "attack" genérico.
  // Un arquero tiene peso ínfimo → casi nunca convierte.
  const candidates = attacker.squad.filter((p) => p.onField && !p.redCarded);
  const shooter = weightedPick(
    candidates,
    (p) => scorerWeight(p.fieldPosition) * (0.5 + shooterRating(p) / 100),
  );
  if (!shooter) return;

  // El atacante progresa con creadores (Pase+Velocidad) antes de rematar.
  // Tomamos el promedio de creatorRating del equipo atacante como bonus de ocasión.
  const atkCreators = candidates.filter((p) => p.fieldPosition === "MID" || p.fieldPosition === "FWD");
  const creationBonus = atkCreators.length > 0
    ? avg(atkCreators.map((p) => creatorRating(p)))
    : avg(candidates.map((p) => creatorRating(p)));

  const sA = teamStrength(attacker);
  const sD = teamStrength(defender);
  const styleAtk = styleAttackMod(attacker.style);
  const styleDef = styleDefenseMod(defender.style);
  const shooterAtk = shooterRating(shooter);
  // Diferencial: combina el rematador, la creación del equipo y la defensa rival.
  // La defensa rival pesa el doble que el rematador individual.
  const diff = (sA.attack + shooterAtk + creationBonus * 0.3) / 2.3 - sD.defense;
  // Estilo de salida del atacante: rápido = ataques más directos y arriesgados.
  const buRisk = BUILDUP_TABLE[attacker.buildUp ?? "Equilibrado"].riskGoalProb;
  const goalProb = Math.max(0.05, Math.min(0.6, 0.18 + diff / 170 + styleAtk * 0.1 - styleDef * 0.1 + buRisk));
  const onTargetProb = Math.max(0.2, Math.min(0.8, 0.35 + diff / 300));

  const roll = rand();
  const xg = Math.max(0.02, Math.min(0.7, goalProb));
  attacker.xg += xg;

  const shooterStats = state.playerStats[shooter.id];
  if (shooterStats) shooterStats.shots += 1;

  // Arquero defensor: su efectividad depende del out-of-position factor.
  // La capacidad de atajada del arquero usa su Defensa (atributo principal para GK).
  const gk = defender.squad.find((p) => p.onField && !p.redCarded && p.fieldPosition === "GK");
  const gkFactor = gk ? positionRatingFactor(gk) : 0.65;
  // Un arquero fuera de posición encaja más goles.
  const adjustedGoalProb = Math.min(0.75, goalProb + (1 - gkFactor) * 0.25);

  // shotsOnTarget representa SIEMPRE los tiros al arco que EJECUTÓ el equipo.
  // Los "tiros al arco recibidos" del arquero se derivan del shotsOnTarget del rival,
  // por lo que un tiro al arco solo se contabiliza en el atacante (nunca en el defensor).
  // Invariante garantizada: para cada equipo,
  //   shotsOnTarget(rival) === saves(equipo) + goles_recibidos(equipo)
  // porque cada tiro al arco del rival termina en gol o en atajada de este arquero.
  if (roll < adjustedGoalProb) {
    // Gol: cuenta como tiro al arco del atacante y gol del atacante.
    attacker.shotsOnTarget += 1;
    attacker.goals += 1;
    if (shooterStats) shooterStats.goals += 1;
    out.push(C.goal(state.minute, shooter.name, atkIdx, attacker.config.name));
  } else if (roll < adjustedGoalProb + onTargetProb * 0.5) {
    // Tiro al arco. Con arquero en cancha → atajada; sin arquero (expulsado) → gol,
    // para que la invariante shotsOnTarget = saves + goles_recibidos nunca se rompa.
    attacker.shotsOnTarget += 1;
    if (gk) {
      defender.saves += 1;
      const gkStats = state.playerStats[gk.id];
      if (gkStats) gkStats.saves += 1;
      out.push(C.chance(state.minute, shooter.name, attacker.config.name));
    } else {
      attacker.goals += 1;
      if (shooterStats) shooterStats.goals += 1;
      out.push(C.goal(state.minute, shooter.name, atkIdx, attacker.config.name));
    }
  } else {
    // Tiro desviado: solo cuenta como tiro total, no al arco.
    out.push(C.chance(state.minute, shooter.name, attacker.config.name));
  }
}

export function substitute(state: MatchState, teamIdx: 0 | 1, outId: string, inId: string): boolean {
  const team = state.teams[teamIdx];
  if (team.substitutionsLeft <= 0) return false;
  const outP = team.squad.find((p) => p.id === outId);
  const inP = team.squad.find((p) => p.id === inId);
  if (!outP || !inP) return false;
  if (!outP.onField || inP.onField || inP.redCarded) return false;
  outP.onField = false;
  inP.onField = true;
  inP.stamina = 100;
  inP.fieldPosition = outP.fieldPosition;
  inP.slotIndex = outP.slotIndex;
  outP.fieldPosition = undefined;
  outP.slotIndex = undefined;
  team.substitutionsLeft -= 1;
  const ev = C.subEv(state.minute, outP.name, inP.name, team.config.name);
  state.events.push(ev);
  return true;
}

export function possessionPct(state: MatchState): [number, number] {
  const total = state.teams[0].possession + state.teams[1].possession;
  if (total === 0) return [50, 50];
  const a = Math.round((state.teams[0].possession / total) * 100);
  return [a, 100 - a];
}

export function teamRating(team: Team): number {
  const onField = team.squad.filter((p) => team.starting.includes(p.id));
  if (!onField.length) return 0;
  return Math.round(avg(onField.map((p) => computePlayerPositionRating(p, p.fieldPosition))));
}

/**
 * Calcula la valoración (1-10 con un decimal) de cada jugador tras el partido.
 * - Base: 5.0
 * - Goles: +1.0 c/u (máx +3)
 * - Atajadas: +0.3 c/u (máx +2.5)
 * - Tiros sin gol: -0.1 c/u (máx -0.5)
 * - Tarjeta amarilla: -0.3
   * - Roja: -1.0
 */
export function computePlayerRating(
  player: Player,
  stats: PlayerMatchStats | undefined,
): number {
  if (!stats) return 5.0;
  let r = 5.0;
  r += Math.min(3, stats.goals * 1.0);
  r += Math.min(2.5, stats.saves * 0.3);
  r -= Math.min(0.5, Math.max(0, stats.shots - stats.goals) * 0.1);
  r -= stats.yellowCards * 0.3;
  if (stats.redCarded) r -= 1.0;
  return Math.max(1, Math.min(10, Math.round(r * 10) / 10));
}

export function computeTeamRating(team: Team, playerStats: Record<string, PlayerMatchStats>): number {
  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  if (!starters.length) return 0;
  const ratings = starters.map((p) => computePlayerRating(p, playerStats[p.id]));
  return Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10;
}
