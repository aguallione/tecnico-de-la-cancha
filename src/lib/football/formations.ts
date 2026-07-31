import type { FormationName, Position, PositionGroup } from "./types";
import { POSITION_GROUP } from "./types";

export const FORMATION_ROWS: Record<string, Position[][]> = {
  "4-4-2":   [["POR"], ["LI", "DFC", "DFC", "LD"], ["MI", "MC", "MC", "MD"], ["DC", "SD"]],
  "4-3-3":   [["POR"], ["LI", "DFC", "DFC", "LD"], ["MCD", "MC", "MCO"], ["EI", "DC", "ED"]],
  "3-5-2":   [["POR"], ["DFC", "DFC", "DFC"], ["CAI", "MC", "MC", "MC", "CAD"], ["DC", "SD"]],
  "4-2-3-1": [["POR"], ["LI", "DFC", "DFC", "LD"], ["MCD", "MCD"], ["MI", "MCO", "MD"], ["DC"]],
  "5-3-2":   [["POR"], ["LI", "DFC", "DFC", "DFC", "LD"], ["MC", "MC", "MC"], ["DC", "SD"]],
  "3-4-3":   [["POR"], ["DFC", "DFC", "DFC"], ["CAI", "MC", "MC", "CAD"], ["EI", "DC", "ED"]],
};

export const FORMATION_LIST: FormationName[] = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "3-4-3"];

/**
 * Registro en memoria de formaciones personalizadas del usuario (id → filas).
 * Se llena al cargar la cuenta (ver LockerScreen). No persiste solo: si el
 * usuario no está logueado o no cargó sus formaciones todavía, una formación
 * personalizada desconocida cae al fallback de abajo.
 */
const customFormations = new Map<string, Position[][]>();

export function registerCustomFormation(id: string, filas: Position[][]) {
  customFormations.set(id, filas);
}

export function isCustomFormation(name: string): boolean {
  return customFormations.has(name);
}

function rowsForAny(f: string): Position[][] {
  if (customFormations.has(f)) return customFormations.get(f)!;
  if (f in FORMATION_ROWS) return FORMATION_ROWS[f];
  return FORMATION_ROWS["4-4-2"];
}

/** Devuelve la posición específica de cada slot de la formación, en orden fijo (atrás → adelante). */
export function slotsFor(f: FormationName): Position[] {
  return rowsForAny(f).flat();
}

/** Filas de la formación, para renderizar la cancha respetando líneas reales. */
export function rowsFor(f: FormationName): Position[][] {
  return rowsForAny(f).map((row) => [...row]);
}

/** Convierte un slot lógico o específico a su grupo lógico. */
export function slotGroup(pos: Position | PositionGroup | undefined): PositionGroup | undefined {
  if (!pos) return undefined;
  return pos in POSITION_GROUP ? POSITION_GROUP[pos as Position] : (pos as PositionGroup);
}

/** Convierte una posición específica a su grupo lógico. */
export function positionGroup(pos: Position): PositionGroup {
  return POSITION_GROUP[pos];
}

function countsFor(f: string): { GK: number; DEF: number; MID: number; FWD: number } {
  const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const pos of rowsForAny(f).flat()) counts[POSITION_GROUP[pos]] += 1;
  return counts;
}

// Ventaja piedra-papel-tijera simple entre formaciones (retorna -0.1 a 0.1).
// Calculado a partir de las filas reales, así que funciona igual para
// formaciones predefinidas y personalizadas, sin tabla aparte.
export function formationMatchup(a: FormationName, b: FormationName): number {
  const A = countsFor(a);
  const B = countsFor(b);
  const attackAdvantage = (A.FWD + A.MID * 0.5) - (B.DEF + B.MID * 0.5);
  return Math.max(-0.12, Math.min(0.12, attackAdvantage * 0.03));
}