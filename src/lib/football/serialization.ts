/**
 * serialization.ts
 *
 * MatchState contiene `staminaAlertFired: Set<string>`, que no es JSON-serializable
 * directamente (un Set se serializa como `{}`). Estas funciones convierten el Set a
 * array al guardar en JSONB de Supabase y lo reconstruyen al leer.
 *
 * El resto de MatchState (teams, settings, playerStats, arrays y primitivos) es
 * JSON-safe, por lo que solo hay que tratar ese campo especial.
 */

import type { MatchState } from "@/lib/football/engine";

/** Forma serializable de MatchState: idéntica pero con staminaAlertFired como array. */
export type SerializedMatchState = Omit<MatchState, "staminaAlertFired"> & {
  staminaAlertFired: string[];
};

export function serializeMatchState(state: MatchState): SerializedMatchState {
  return {
    ...state,
    staminaAlertFired: Array.from(state.staminaAlertFired),
  };
}

export function deserializeMatchState(raw: SerializedMatchState): MatchState {
  return {
    ...raw,
    staminaAlertFired: new Set<string>(raw.staminaAlertFired ?? []),
  };
}
