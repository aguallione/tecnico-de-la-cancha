/**
 * tournament-standings.ts — cálculo de tabla de posiciones, sin Supabase.
 * Sistema de puntos estándar: victoria 3, empate 1, derrota 0.
 */

import type { TournamentFixtureMatch, TournamentSlot, TournamentStandingRow } from "./tournament-types";

export function computeStandings(
  slots: TournamentSlot[],
  fixture: TournamentFixtureMatch[],
): TournamentStandingRow[] {
  const rows = new Map<string, TournamentStandingRow>();
  for (const slot of slots) {
    rows.set(slot.id, {
      slotId: slot.id,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, points: 0,
    });
  }

  for (const m of fixture) {
    if (!m.result) continue;
    const home = rows.get(m.homeSlotId);
    const away = rows.get(m.awaySlotId);
    if (!home || !away) continue;

    const hg = m.result.homeGoals;
    const ag = m.result.awayGoals;
    home.played++; away.played++;
    home.goalsFor += hg; home.goalsAgainst += ag;
    away.goalsFor += ag; away.goalsAgainst += hg;

    if (hg > ag) { home.won++; home.points += 3; away.lost++; }
    else if (hg < ag) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }

  return Array.from(rows.values()).sort(
    (a, b) =>
      b.points - a.points ||
      (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
      b.goalsFor - a.goalsFor,
  );
}