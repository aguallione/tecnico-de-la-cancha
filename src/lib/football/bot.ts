import { FORMATION_LIST, FORMATIONS, slotsFor, slotGroup as slotGroupForPosition } from "./formations";
import { computePlayerPositionRating } from "./engine";
import type { FormationName, Player, PositionGroup, Team } from "./types";
import { POSITION_GROUP } from "./types";

/**
 * Elige la mejor alineación posible para una formación dada, maximizando la
 * suma total de valoración de los 11 (cada jugador evaluado con su fórmula
 * de posición real en cada puesto, incluyendo el bonus de posición natural).
 * Devuelve array de 11 player ids ordenados según slotsFor(formation).
 */
export function autoLineup(squad: Player[], formation: FormationName): string[] {
  const slots = slotsFor(formation); // Position[]
  const result: string[] = new Array(slots.length).fill("");
  const usedPlayers = new Set<string>();
  const filledSlots = new Set<number>();

  // Todas las combinaciones posibles (puesto, jugador) con su valoración real.
  const pairs: { slotIndex: number; playerId: string; rating: number }[] = [];
  slots.forEach((slot, slotIndex) => {
    for (const p of squad) {
      pairs.push({ slotIndex, playerId: p.id, rating: computePlayerPositionRating(p, slot) });
    }
  });

  // De mayor a menor valoración: nos quedamos con la primera pareja disponible
  // (ni el puesto ni el jugador usados todavía), repitiendo hasta llenar todo.
  pairs.sort((a, b) => b.rating - a.rating);
  for (const pair of pairs) {
    if (filledSlots.size === slots.length) break;
    if (filledSlots.has(pair.slotIndex) || usedPlayers.has(pair.playerId)) continue;
    result[pair.slotIndex] = pair.playerId;
    filledSlots.add(pair.slotIndex);
    usedPlayers.add(pair.playerId);
  }

  return result;
}

export function autoBotTeam(team: Team): void {
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