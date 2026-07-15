import { FORMATION_LIST, FORMATIONS, slotsFor } from "./formations";
import type { FormationName, Player, PositionGroup, Team } from "./types";
import { POSITION_GROUP } from "./types";

/**
 * Elige mejor alineación para una formación dada.
 * Devuelve array de 11 player ids ordenados según slotsFor(formation).
 * Agrupa jugadores por su grupo lógico (GK/DEF/MID/FWD).
 * Si no hay suficientes jugadores para un grupo, rellena con los mejores restantes.
 */
export function autoLineup(squad: Player[], formation: FormationName): string[] {
  const byGroup: Record<PositionGroup, Player[]> = {
    GK: [], DEF: [], MID: [], FWD: [],
  };
  const sorted = [...squad].sort((a, b) => b.overall - a.overall);
  for (const p of sorted) byGroup[POSITION_GROUP[p.position]].push(p);

  const used = new Set<string>();
  const slots = slotsFor(formation); // devuelve PositionGroup[]
  const result: string[] = [];
  for (const group of slots) {
    const cand = byGroup[group].find((p) => !used.has(p.id));
    if (cand) {
      used.add(cand.id);
      result.push(cand.id);
    } else {
      // fallback: mejor jugador disponible
      const fb = sorted.find((p) => !used.has(p.id));
      if (fb) {
        used.add(fb.id);
        result.push(fb.id);
      }
    }
  }
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
