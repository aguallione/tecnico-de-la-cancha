/**
 * tournament-bot-resolve.ts — resolución automática de un cruce Bot vs Bot.
 * Corre el mismo motor (initMatch/tickMinute) que usa MatchScreen, pero en
 * un loop cerrado sin pintar ningún ticker en pantalla, hasta que el partido
 * termina. Preserva la misma integridad de "goles = tiros al arco − atajadas"
 * que cualquier partido jugado en vivo, porque es literalmente el mismo motor.
 */

import { initMatch, tickMinute } from "./engine";
import { teamFromSlot } from "./tournament-api";
import { simulatePenaltyShootout } from "./tournament-penalties";
import { escribirResultadoTorneoPartido } from "./tournament-server-fns";
import type { TournamentFixtureMatch, TournamentSlot } from "./tournament-types";
import type { MatchSettings } from "./types";

export async function resolverPartidoBotVsBot(params: {
  match: TournamentFixtureMatch;
  home: TournamentSlot;
  away: TournamentSlot;
  matchSettings: MatchSettings;
  esEliminacionDirecta: boolean;
}): Promise<void> {
  const { match, home, away, matchSettings, esEliminacionDirecta } = params;

  const teamA = teamFromSlot(home);
  const teamB = teamFromSlot(away);
  const state = initMatch([teamA, teamB], matchSettings);

  // Salvaguarda de emergencia: no debería pasar nunca (un partido normal
  // termina en 90+ minutos), pero evita un loop infinito si algo del motor
  // no marca "finished" como se espera.
  let minutosCorridos = 0;
  while (!state.finished) {
    tickMinute(state);
    minutosCorridos++;
    if (minutosCorridos > 500) {
      throw new Error("El motor no terminó el partido dentro de un límite razonable de minutos.");
    }
  }

  const empatado = state.teams[0].goals === state.teams[1].goals;
  const penalties = esEliminacionDirecta && empatado
    ? simulatePenaltyShootout([state.teams[0], state.teams[1]]).result
    : undefined;

  await escribirResultadoTorneoPartido({
    data: {
      torneo_partido_id: match.id,
      resultado: {
        homeGoals: state.teams[0].goals,
        awayGoals: state.teams[1].goals,
        stats: { players: state.playerStats },
        events: state.events,
        ...(penalties ? { penalties } : {}),
      },
    },
  });
}