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

export const FORMATION_SLOTS: Record<FormationName, Position[]> = {
  "4-4-2": ["POR", "DFC", "LI", "DFC", "LD", "MCD", "MI", "MC", "MD", "DC", "SD"],
  "4-3-3": ["POR", "DFC", "LI", "DFC", "LD", "MCD", "MC", "MCO", "EI", "DC", "ED"],
  "3-5-2": ["POR", "DFC", "LI", "DFC", "LD", "CAI", "MC", "MC", "MCD", "CAD", "DC", "SD"],
  "4-2-3-1": ["POR", "DFC", "LI", "DFC", "LD", "MCD", "MCD", "MCO", "MI", "MD", "DC"],
  "5-3-2": ["POR", "DFC", "LI", "DFC", "DFC", "LD", "MCD", "MC", "MCO", "DC", "SD"],
  "3-4-3": ["POR", "DFC", "LI", "LD", "CAI", "MC", "MCO", "CAD", "EI", "DC", "ED"],
};

export const FORMATION_LIST: FormationName[] = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];

/**
 * Devuelve la posición específica de cada slot de la formación.
 * El engine y la UI usan estas posiciones para calcular el Efectivo y mostrar la etiqueta exacta.
 */
export function slotsFor(f: FormationName): Position[] {
  return [...FORMATION_SLOTS[f]];
}

/** Convierte un slot lógico o específico a su grupo lógico. */
export function slotGroup(pos: Position | PositionGroup | undefined): PositionGroup | undefined {
  if (!pos) return undefined;
  return pos in POSITION_GROUP ? POSITION_GROUP[pos as Position] : pos as PositionGroup;
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
