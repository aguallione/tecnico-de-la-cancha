import type { FormationName, Position, PositionGroup } from "./types";
import { POSITION_GROUP } from "./types";

export const FORMATIONS: Record<FormationName, { GK: number; DEF: number; MID: number; FWD: number }> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "4-2-3-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
};

export const FORMATION_LIST: FormationName[] = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];

/**
 * Devuelve los GRUPOS lógicos (GK/DEF/MID/FWD) para cada slot de la formación.
 * El engine y el locker los usan para saber si un jugador está fuera de posición.
 */
export function slotsFor(f: FormationName): PositionGroup[] {
  const s = FORMATIONS[f];
  const arr: PositionGroup[] = [];
  for (let i = 0; i < s.GK; i++) arr.push("GK");
  for (let i = 0; i < s.DEF; i++) arr.push("DEF");
  for (let i = 0; i < s.MID; i++) arr.push("MID");
  for (let i = 0; i < s.FWD; i++) arr.push("FWD");
  return arr;
}

/** Convierte una posición específica a su grupo lógico. */
export function positionGroup(pos: Position): PositionGroup {
  return POSITION_GROUP[pos];
}

// Ventaja piedra-papel-tijera simple entre formaciones (retorna -0.1 a 0.1)
export function formationMatchup(a: FormationName, b: FormationName): number {
  // Basado en delanteros vs defensores
  const A = FORMATIONS[a];
  const B = FORMATIONS[b];
  const attackAdvantage = (A.FWD + A.MID * 0.5) - (B.DEF + B.MID * 0.5);
  return Math.max(-0.12, Math.min(0.12, attackAdvantage * 0.03));
}
