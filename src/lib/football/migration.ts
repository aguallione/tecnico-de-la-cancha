import type { Player } from "./types";

/**
 * Conversión de la estructura vieja (4 atributos: attack, defense, physical, pace)
 * a la nueva (6 atributos: passing, shooting, dribbling, defense, physical, pace).
 *
 * Fórmula:
 *   shooting  = attack            (el ataque viejo se mapea directo a tiro)
 *   dribbling = attack + jitter   (regate derivado del ataque con pequeña variación)
 *   passing   = (attack + defense) / 2  (pase = promedio entre ataque y defensa)
 *   defense   = defense           (se conserva)
 *   physical  = physical          (se conserva)
 *   pace      = pace              (se conserva)
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
      ? clamp(typeof p.overall === "number" ? p.overall : 65)
      : Math.round((passing + shooting + dribbling + defense + physical + pace) / 6);

  return {
    id: typeof p.id === "string" ? p.id : `migrated_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: typeof p.name === "string" ? p.name : "Jugador",
    position: (typeof p.position === "string" ? p.position : "MID") as Player["position"],
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

function clamp(n: number): number {
  return Math.max(1, Math.min(99, Math.round(n)));
}
