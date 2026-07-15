import type { Player, Position } from "./types";

// ─── Migración v1: 4 atributos (attack/defense/physical/pace) → 6 atributos ──

/**
 * Conversión de la estructura vieja (4 atributos: attack, defense, physical, pace)
 * a la nueva (6 atributos: passing, shooting, dribbling, defense, physical, pace).
 */
export function migratePlayer(p: Record<string, unknown>): Player {
  const attack = typeof p.attack === "number" ? p.attack : 65;
  const defense = typeof p.defense === "number" ? p.defense : 65;
  const physical = typeof p.physical === "number" ? p.physical : 65;
  const pace = typeof p.pace === "number" ? p.pace : 65;

  const shooting = clamp(attack);
  const dribbling = clamp(attack + Math.round((Math.random() * 8) - 4));
  const passing = clamp(Math.round((attack + defense) / 2));

  const overall =
    typeof p.overall === "number"
      ? clamp(p.overall)
      : Math.round((passing + shooting + dribbling + defense + physical + pace) / 6);

  return {
    id: typeof p.id === "string" ? p.id : `migrated_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: typeof p.name === "string" ? p.name : "Jugador",
    position: (typeof p.position === "string" ? p.position : "MC") as Player["position"],
    overall,
    passing,
    shooting,
    dribbling,
    defense,
    physical,
    pace,
    age: typeof p.age === "number" ? p.age : 25,
    nationality: typeof p.nationality === "string" ? p.nationality : "",
    historicClub: typeof p.historicClub === "string" ? p.historicClub : "",
    year: typeof p.year === "number" ? p.year : undefined,
    individualRole: typeof p.individualRole === "string" ? p.individualRole : "",
    stamina: 100,
    onField: false,
    redCarded: false,
    yellowCards: 0,
    injured: false,
    fieldPosition: undefined,
    slotIndex: undefined,
  };
}

/**
 * Detecta si un jugador (objeto plano) tiene la estructura vieja de 4 atributos.
 */
export function hasOldAttributes(p: Record<string, unknown>): boolean {
  return typeof p.attack === "number" && typeof p.passing !== "number";
}

/**
 * Si el plantel contiene jugadores con la estructura vieja, los migra a la nueva.
 * Devuelve el plantel original si ya están en la nueva estructura.
 */
export function migrateSquadIfNeeded(squad: Player[]): Player[] {
  if (squad.length === 0) return squad;
  const first = squad[0] as unknown as Record<string, unknown>;
  if (!hasOldAttributes(first)) return squad;
  return squad.map((p) => migratePlayer(p as unknown as Record<string, unknown>));
}

// ─── Migración v2: posiciones genéricas (GK/DEF/MID/FWD) → 15 posiciones ─────

/**
 * Mapas de migración: de cada categoría vieja a un array de posiciones específicas
 * que se distribuyen de forma rotativa (round-robin) entre los jugadores del plantel.
 * El orden refleja lo más común en un equipo real: p.ej. los primeros Delanteros
 * tienden a ser DC (centro), luego extremos, etc.
 */
const MIGRATION_MAP: Record<string, Position[]> = {
  // Valores viejos posibles (pueden venir en inglés o español)
  Delantero:       ["DC", "SD", "EI", "ED"],
  FWD:             ["DC", "SD", "EI", "ED"],
  Mediocampista:   ["MC", "MCO", "MCD", "MI", "MD"],
  MID:             ["MC", "MCO", "MCD", "MI", "MD"],
  Defensor:        ["DFC", "LI", "LD", "CAI", "CAD"],
  DEF:             ["DFC", "LI", "LD", "CAI", "CAD"],
  Arquero:         ["POR"],
  GK:              ["POR"],
};

/**
 * Detecta si el plantel tiene posiciones del sistema viejo (4 categorías).
 */
export function hasOldPositions(squad: Player[]): boolean {
  if (squad.length === 0) return false;
  const OLD_POSITIONS = new Set(["GK", "DEF", "MID", "FWD", "Arquero", "Defensor", "Mediocampista", "Delantero"]);
  return squad.some((p) => OLD_POSITIONS.has(p.position as string));
}

/**
 * Genera los 5 atributos de arquero a partir del overall del jugador.
 * Se usan rangos razonables coherentes con el nivel general.
 */
function generateGkAttributes(overall: number): {
  gkDiving: number; gkHandling: number; gkKicking: number;
  gkReflexes: number; gkPositioning: number;
} {
  const base = clamp(overall + Math.round((Math.random() * 10) - 5));
  return {
    gkDiving: clamp(base + Math.round((Math.random() * 12) - 4)),
    gkHandling: clamp(base + Math.round((Math.random() * 12) - 4)),
    gkKicking: clamp(base + Math.round((Math.random() * 10) - 6)),
    gkReflexes: clamp(base + Math.round((Math.random() * 12) - 4)),
    gkPositioning: clamp(base + Math.round((Math.random() * 10) - 4)),
  };
}

/**
 * Migra el plantel de 4 posiciones genéricas a las 15 posiciones específicas.
 * La distribución es balanceada (round-robin por categoría) para que la
 * alineación siga siendo coherente como equipo real.
 * A los arqueros que queden como POR se les generan los 5 atributos nuevos.
 */
export function migratePositions(squad: Player[]): Player[] {
  // Contador por categoría para distribuir en round-robin
  const counters: Record<string, number> = {};

  return squad.map((player) => {
    const oldPos = player.position as string;
    const candidates = MIGRATION_MAP[oldPos];

    // Si ya es una posición específica del nuevo sistema, no migrar
    if (!candidates) return player;

    // Round-robin: elegir la siguiente posición del array para esta categoría
    if (!(oldPos in counters)) counters[oldPos] = 0;
    const newPos = candidates[counters[oldPos] % candidates.length] as Position;
    counters[oldPos]++;

    const updated: Player = { ...player, position: newPos };

    // Si queda como POR y no tiene atributos de arquero, generarlos
    if (newPos === "POR" && updated.gkDiving === undefined) {
      Object.assign(updated, generateGkAttributes(player.overall));
    }

    return updated;
  });
}

/**
 * Aplica ambas migraciones en cadena si son necesarias:
 * 1. Si tiene atributos viejos (4 attrs) → migratePlayer
 * 2. Si tiene posiciones viejas (4 genéricas) → migratePositions
 */
export function migrateSquadFull(squad: Player[]): Player[] {
  // Paso 1: migrar atributos viejos si los hay
  let result = migrateSquadIfNeeded(squad);
  // Paso 2: migrar posiciones viejas si las hay
  if (hasOldPositions(result)) {
    result = migratePositions(result);
  }
  return result;
}

function clamp(n: number): number {
  return Math.max(1, Math.min(99, Math.round(n)));
}
