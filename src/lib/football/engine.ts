import type { MatchEvent, MatchSettings, Player, Position, Team } from "./types";
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
}

function rand(): number { return Math.random(); }
function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }

/**
 * Penalización por jugar fuera de posición.
 * Devuelve un multiplicador (0..1) que se aplica a los atributos efectivos.
 * Mismas posiciones o adyacentes (DEF-MID, MID-FWD) no se penalizan;
 * saltos grandes (GK vs campo, DEF vs FWD) penalizan fuerte.
 */
export function outOfPositionFactor(player: Player): number {
  if (!player.fieldPosition || player.fieldPosition === player.position) return 1;
  const order: Position[] = ["GK", "DEF", "MID", "FWD"];
  const nat = order.indexOf(player.position);
  const field = order.indexOf(player.fieldPosition);
  const dist = Math.abs(nat - field);
  if (dist === 0) return 1;
  if (dist === 1) return 0.92; // adyacente: leve
  if (dist === 2) return 0.7;  // dos saltos: notable
  return 0.5; // tres saltos (GK<->FWD): muy fuerte
}

function teamStrength(team: Team): { attack: number; defense: number; overall: number } {
  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  if (onField.length === 0) return { attack: 40, defense: 40, overall: 40 };
  const staminaFactor = (p: Player) => 0.6 + 0.4 * (p.stamina / 100) * (p.injured ? 0.7 : 1);
  const posFactor = (p: Player) => outOfPositionFactor(p);
  const atk = avg(onField.map((p) => p.attack * staminaFactor(p) * posFactor(p)));
  const def = avg(onField.map((p) => p.defense * staminaFactor(p) * posFactor(p)));
  const ov = avg(onField.map((p) => p.overall * staminaFactor(p) * posFactor(p)));
  // Penalización por hombres menos
  const numericPenalty = Math.max(0, 11 - onField.length) * 4;
  return { attack: atk - numericPenalty, defense: def - numericPenalty, overall: ov - numericPenalty };
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
    }
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
  const totalOverall = sA.overall + sB.overall || 1;
  const posA = sA.overall / totalOverall;

  // Posesión por minuto (aprox)
  if (rand() < posA) A.possession += 1; else B.possession += 1;

  // Probabilidad de evento base
  const eventRoll = rand();
  // Ajuste por estilo (ambos)
  const styleTotal = (styleAttackMod(A.style) + styleAttackMod(B.style)) * 0.5;

  if (eventRoll < 0.14 + styleTotal * 0.2) {
    // Ocurre un evento ofensivo — decidir quién ataca
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
      if (rand() < 0.18) {
        fouler.yellowCards += 1;
        team.yellowCards += 1;
        newEvents.push(C.yellow(state.minute, fouler.name));
        if (fouler.yellowCards >= 2) {
          fouler.redCarded = true;
          fouler.onField = false;
          team.redCards += 1;
          newEvents.push(C.red(state.minute, fouler.name, team.config.name));
        }
      } else if (rand() < 0.02) {
        fouler.redCarded = true;
        fouler.onField = false;
        team.redCards += 1;
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
  const attackers = attacker.squad.filter((p) => p.onField && !p.redCarded && (p.position === "FWD" || p.position === "MID"));
  const shooter = attackers.length ? pick(attackers) : pick(attacker.squad.filter((p) => p.onField && !p.redCarded));
  if (!shooter) return;

  const sA = teamStrength(attacker);
  const sD = teamStrength(defender);
  const styleAtk = styleAttackMod(attacker.style);
  const styleDef = styleDefenseMod(defender.style);
  const shooterAtk = shooter.attack * outOfPositionFactor(shooter);
  const diff = (sA.attack + shooterAtk) / 2 - sD.defense;
  const goalProb = Math.max(0.05, Math.min(0.55, 0.18 + diff / 220 + styleAtk * 0.1 - styleDef * 0.1));
  const onTargetProb = Math.max(0.2, Math.min(0.8, 0.35 + diff / 300));

  const roll = rand();
  const xg = Math.max(0.02, Math.min(0.7, goalProb));
  attacker.xg += xg;

  if (roll < goalProb) {
    attacker.shotsOnTarget += 1;
    attacker.goals += 1;
    out.push(C.goal(state.minute, shooter.name, atkIdx, attacker.config.name));
  } else if (roll < goalProb + onTargetProb * 0.5) {
    attacker.shotsOnTarget += 1;
    out.push(C.chance(state.minute, shooter.name, attacker.config.name));
  } else {
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
