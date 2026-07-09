import type { MatchEvent, MatchSettings, MatchStats, Player, PlayerMatchStats, Position, Team } from "./types";
import { formationMatchup, slotsFor } from "./formations";
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
}

function rand(): number { return Math.random(); }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

/**
 * Peso relativo de probabilidad de que un jugador remate/convierta un gol,
 * según su posición EN CANCHA (no la natural). Refleja el fútbol real:
 * delanteros > mediocampistas > defensores > arqueros.
 * El arquero tiene un peso ínfimo (≈ penal de emergencia): prácticamente nunca convierte.
 */
function scorerWeight(fieldPos: Position | undefined): number {
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
 * Penalización por jugar fuera de posición.
 * Devuelve un multiplicador (0..1) que se aplica a los atributos efectivos.
 *
 * - Cualquier jugador de campo puesto de arquero: -35% (atajar es una
 *   habilidad totalmente distinta).
 * - Arquero puesto de campo: -35% (mismo motivo, inverso).
 * - Puestos de campo vecinos (DEF↔MID, MID↔FWD): -12% (roles parecidos).
 * - Puestos de campo extremos (DEF↔FWD): -25% (roles muy distintos).
 */
export function outOfPositionFactor(player: Player): number {
  if (!player.fieldPosition || player.fieldPosition === player.position) return 1;
  const nat = player.position;
  const field = player.fieldPosition;
  // Arquero vs campo: siempre penalización máxima
  if (nat === "GK" || field === "GK") return 0.65;
  // Puestos de campo: por distancia en la línea DEF-MID-FWD
  const order: Position[] = ["DEF", "MID", "FWD"];
  const dist = Math.abs(order.indexOf(nat) - order.indexOf(field));
  if (dist === 1) return 0.88; // vecinos
  return 0.75; // dist === 2: extremos
}

function teamStrength(team: Team): { attack: number; defense: number; overall: number } {
  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  if (onField.length === 0) return { attack: 40, defense: 40, overall: 40 };
  const staminaFactor = (p: Player) => 0.6 + 0.4 * (p.stamina / 100) * (p.injured ? 0.7 : 1);
  const posFactor = (p: Player) => outOfPositionFactor(p);
  const eff = (p: Player) => staminaFactor(p) * posFactor(p);

  // Nivel de Ataque: FWD + MID en cancha, usando su stat de ataque
  const atkLine = onField.filter((p) => p.fieldPosition === "FWD" || p.fieldPosition === "MID");
  // Nivel de Defensa: DEF + GK en cancha, usando su stat de defensa
  const defLine = onField.filter((p) => p.fieldPosition === "DEF" || p.fieldPosition === "GK");

  const atk = atkLine.length > 0
    ? avg(atkLine.map((p) => p.attack * eff(p)))
    : avg(onField.map((p) => p.attack * eff(p)));
  const def = defLine.length > 0
    ? avg(defLine.map((p) => p.defense * eff(p)))
    : avg(onField.map((p) => p.defense * eff(p)));

  const ov = avg(onField.map((p) => p.overall * eff(p)));
  // Penalización por hombres menos
  const numericPenalty = Math.max(0, 11 - onField.length) * 4;
  return { attack: atk - numericPenalty, defense: def - numericPenalty, overall: ov - numericPenalty };
}

/**
 * Calcula Nivel de Ataque y Nivel de Defensa de un equipo antes del partido
 * (para mostrar en la previa). Usa la lista de starters sin estado de stamina/lesión.
 */
export function previewStrength(team: Team): { attack: number; defense: number } {
  const slots = team.starting.map((id) => team.squad.find((p) => p.id === id)).filter(Boolean) as Player[];
  if (slots.length === 0) return { attack: 50, defense: 50 };
  const atkLine = slots.filter((p) => p.fieldPosition === "FWD" || p.fieldPosition === "MID");
  const defLine = slots.filter((p) => p.fieldPosition === "DEF" || p.fieldPosition === "GK");
  const atk = atkLine.length > 0
    ? Math.round(avg(atkLine.map((p) => p.attack * outOfPositionFactor(p))))
    : Math.round(avg(slots.map((p) => p.attack * outOfPositionFactor(p))));
  const def = defLine.length > 0
    ? Math.round(avg(defLine.map((p) => p.defense * outOfPositionFactor(p))))
    : Math.round(avg(slots.map((p) => p.defense * outOfPositionFactor(p))));
  return { attack: atk, defense: def };
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

  // Reducir stamina
  for (const t of state.teams) {
    for (const p of t.squad) {
      if (p.onField && !p.redCarded) {
        p.stamina = Math.max(20, p.stamina - (0.5 + rand() * 0.8));
      }
    }
  }

  const [A, B] = state.teams;
  const sA = teamStrength(A);
  const sB = teamStrength(B);
  const matchup = formationMatchup(A.formation, B.formation); // positivo favorece A

  // Posesión: quien tiene mejor ataque general presiona más
  const totalOverall = sA.overall + sB.overall || 1;
  const posA = sA.overall / totalOverall;
  if (rand() < posA) A.possession += 1; else B.possession += 1;

  // Probabilidad de evento base
  const eventRoll = rand();
  const styleTotal = (styleAttackMod(A.style) + styleAttackMod(B.style)) * 0.5;

  if (eventRoll < 0.14 + styleTotal * 0.2) {
    // Decidir quién ataca: ataque de A vs defensa de B (y viceversa)
    const attackerIsA = rand() < 0.5 + (sA.attack - sB.defense) / 400 + matchup;
    const attacker = attackerIsA ? A : B;
    const defender = attackerIsA ? B : A;
    handleAttack(state, attacker, defender, attackerIsA ? 0 : 1, newEvents);
  } else if (eventRoll < 0.20) {
    // Falta / amarilla
    const teamIdx = rand() < 0.5 ? 0 : 1;
    const team = state.teams[teamIdx];
    const fouler = pick(team.squad.filter((p) => p.onField && !p.redCarded && p.position !== "GK"));
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
  // posición EN CANCHA (fieldPosition) y su capacidad ofensiva. Un arquero (aunque
  // sea un jugador de campo puesto al arco) tiene un peso ínfimo → casi nunca convierte.
  const candidates = attacker.squad.filter((p) => p.onField && !p.redCarded);
  const shooter = weightedPick(
    candidates,
    (p) => scorerWeight(p.fieldPosition) * (0.5 + (p.attack * outOfPositionFactor(p)) / 100),
  );
  if (!shooter) return;

  const sA = teamStrength(attacker);
  const sD = teamStrength(defender);
  const styleAtk = styleAttackMod(attacker.style);
  const styleDef = styleDefenseMod(defender.style);
  const shooterAtk = shooter.attack * outOfPositionFactor(shooter);
  // Diferencial ataque-vs-defensa: la defensa rival pesa el doble que el nivel
  // individual del rematador para que una defensa débil concierne más goles.
  const diff = (sA.attack + shooterAtk) / 2 - sD.defense;
  const goalProb = Math.max(0.05, Math.min(0.6, 0.18 + diff / 170 + styleAtk * 0.1 - styleDef * 0.1));
  const onTargetProb = Math.max(0.2, Math.min(0.8, 0.35 + diff / 300));

  const roll = rand();
  const xg = Math.max(0.02, Math.min(0.7, goalProb));
  attacker.xg += xg;

  const shooterStats = state.playerStats[shooter.id];
  if (shooterStats) shooterStats.shots += 1;

  // Arquero defensor: su efectividad depende del out-of-position factor.
  const gk = defender.squad.find((p) => p.onField && !p.redCarded && p.fieldPosition === "GK");
  const gkFactor = gk ? outOfPositionFactor(gk) : 0.65;
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
  return Math.round(avg(onField.map((p) => p.overall)));
}

/**
 * Calcula la valoración (1-10 con un decimal) de cada jugador tras el partido.
 * - Base: 5.0
 * - Goles: +1.0 c/u (máx +3)
 * - Atajadas: +0.3 c/u (máx +2.5)
 * - Tiros sin gol: -0.1 c/u (máx -0.5)
 * - Tarjeta amarilla: -0.3
   * - Roja: -1.0
 * - Penalización por fuera de posición: hasta -1.5 según factor
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
  // Penalización por fuera de posición
  const factor = outOfPositionFactor(player);
  if (factor < 1) r -= (1 - factor) * 2.5;
  return Math.max(1, Math.min(10, Math.round(r * 10) / 10));
}

export function computeTeamRating(team: Team, playerStats: Record<string, PlayerMatchStats>): number {
  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  if (!starters.length) return 0;
  const ratings = starters.map((p) => computePlayerRating(p, playerStats[p.id]));
  return Math.round((ratings.reduce((s, n) => s + n, 0) / ratings.length) * 10) / 10;
}
