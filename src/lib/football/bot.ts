import { FORMATION_LIST, FORMATIONS, slotsFor, slotGroup as slotGroupForPosition } from "./formations";
import type { FormationName, Player, PositionGroup, Team } from "./types";
import { POSITION_GROUP } from "./types";

/**
 * Elige mejor alineación para una formación dada.
 * Devuelve array de 11 player ids ordenados según slotsFor(formation).
 * Prioridad: 1) coincidencia exacta de posición natural, 2) mismo grupo
 * lógico (GK/DEF/MID/FWD), 3) cualquier jugador disponible como fallback.
 */
export function autoLineup(squad: Player[], formation: FormationName): string[] {
  const sorted = [...squad].sort((a, b) => b.overall - a.overall);
  const used = new Set<string>();
  const slots = slotsFor(formation); // Position[]
  const result: string[] = new Array(slots.length).fill("");

  // Paso 1: coincidencia exacta de posición natural.
  slots.forEach((slot, i) => {
    const cand = sorted.find((p) => !used.has(p.id) && p.position === slot);
    if (cand) {
      used.add(cand.id);
      result[i] = cand.id;
    }
  });

  // Paso 2: mismo grupo lógico, mejor puntaje disponible.
  slots.forEach((slot, i) => {
    if (result[i]) return;
    const group = slotGroupForPosition(slot);
    const cand = sorted.find((p) => !used.has(p.id) && POSITION_GROUP[p.position] === group);
    if (cand) {
      used.add(cand.id);
      result[i] = cand.id;
    }
  });

  // Paso 3: fallback, cualquier jugador disponible.
  slots.forEach((slot, i) => {
    if (result[i]) return;
    const fb = sorted.find((p) => !used.has(p.id));
    if (fb) {
      used.add(fb.id);
      result[i] = fb.id;
    }
  });

  return result;
}

export function autoBotTeam(team: Team): void {
  // Elegir formación al azar entre razonables
  const formation = FORMATION_LIST[Math.floor(Math.random() * FORMATION_LIST.length)];
  team.formation = formation;
  team.starting = autoLineup(team.squad, formation);
  team.style = (["Ofensivo", "Equilibrado", "Defensivo"] as const)[Math.floor(Math.random() * 3)];
  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  const best = starters.reduce((a, b) => (a.overall > b.overall ? a : b));
  team.captainId = best.id;
  team.penaltyTakerId = [...starters].sort((a, b) => b.shooting - a.shooting)[0].id;
  team.setPieceTakerId = team.penaltyTakerId;
}