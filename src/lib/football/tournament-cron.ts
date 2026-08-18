/**
 * tournament-cron.ts — arranque y avance en tiempo real de partidos online
 * de torneo. Invocado periódicamente (cada 1 minuto) por
 * routes/api/resolver-torneos.ts, disparado por pg_cron desde Supabase.
 * Usa service_role: nadie llama esto desde el navegador.
 *
 * Reemplaza el enfoque de 4.4-5 (resolución instantánea en el fondo) por
 * uno de dos fases:
 *   1) arrancarPartidosVencidos: crea una partidas_online real cuando llega
 *      la hora programada, en vez de resolver todo de una.
 *   2) avanzarPartidosEnCurso: hace que cada partido en curso "se ponga al
 *      día" según el ritmo real definido en tournament-pacing.ts (1 minuto
 *      de juego cada 5 segundos reales, con pausa de entretiempo) — no un
 *      bloque fijo de minutos por pasada.
 * Todavía NO conecta intervención humana en vivo (eso es 4.4-6d) ni la IA
 * co-DT (4.4-6c) — mientras nadie interviene, el partido avanza solo con
 * el motor puro, igual que después va a hacerlo la IA en nivel "ninguna".
 */

import { getServiceClient } from "@/lib/online/supabase-server";
import { generarCodigo } from "@/lib/online/api";
import { initMatch, tickMinute } from "./engine";
import { serializeMatchState, deserializeMatchState, type SerializedMatchState } from "./serialization";
import { minutoObjetivo } from "./tournament-pacing";
import { simulatePenaltyShootout } from "./tournament-penalties";
import { escribirResultadoTorneoPartidoInterno } from "./tournament-server-fns";
import {
  avanzarRondaSiCorresponde,
  finalizarLigaSiCorresponde,
  rowToFixtureMatch,
  rowToSlot,
  teamFromSlot,
  type TorneoPartidoRow,
  type TorneoSlotRow,
} from "./tournament-api";
import type { MatchSettings } from "./types";

export interface ResolucionCronResultado {
  arrancados: number;
  avanzados: number;
  terminados: number;
  errores: string[];
}

/**
 * Busca partidos "pendiente" de torneos online en curso, cuya hora
 * programada ya pasó, y les crea una partidas_online real (con el
 * MatchState recién inicializado), pasándolos a estado "en_curso".
 */
async function arrancarPartidosVencidos(): Promise<{ arrancados: number; errores: string[] }> {
  const supabase = getServiceClient();
  const ahoraIso = new Date().toISOString();
  const errores: string[] = [];
  let arrancados = 0;

  const { data: filasRaw, error } = await supabase
    .from("torneo_partidos")
    .select("*, torneos!inner(es_online, estado, config_partido)")
    .eq("estado", "pendiente")
    .eq("torneos.es_online", true)
    .eq("torneos.estado", "en_curso")
    .not("hora_programada", "is", null)
    .lte("hora_programada", ahoraIso);

  if (error) throw new Error(error.message);
  if (!filasRaw || filasRaw.length === 0) return { arrancados: 0, errores: [] };

  for (const row of filasRaw as Array<TorneoPartidoRow & { torneos: { config_partido: MatchSettings } }>) {
    try {
      const match = rowToFixtureMatch(row);

      const { data: slotsData, error: slotsError } = await supabase
        .from("torneo_slots")
        .select("*")
        .in("id", [match.homeSlotId, match.awaySlotId]);
      if (slotsError) throw new Error(slotsError.message);

      const slots = (slotsData ?? []).map((s) => rowToSlot(s as TorneoSlotRow));
      const home = slots.find((s) => s.id === match.homeSlotId);
      const away = slots.find((s) => s.id === match.awaySlotId);
      if (!home || !away) throw new Error(`Faltan slots para el partido ${match.id}.`);

      const teamA = teamFromSlot(home);
      const teamB = teamFromSlot(away);
      const state = initMatch([teamA, teamB], row.torneos.config_partido);
      const serialized = serializeMatchState(state);

      const { data: partidaCreada, error: partidaError } = await supabase
        .from("partidas_online")
        .insert({
          codigo: generarCodigo(),
          estado: "jugando",
          admin_device_id: `torneo:${match.id}`,
          controller_device_id: `torneo:${match.id}`,
          configuracion: row.torneos.config_partido,
          equipo_0: state.teams[0],
          equipo_1: state.teams[1],
          match_state: serialized,
          velocidad: "normal",
          bloque_minutos: 1,
        })
        .select("id")
        .single();
      if (partidaError) throw new Error(partidaError.message);

      const { error: updateError } = await supabase
        .from("torneo_partidos")
        .update({ estado: "en_curso", partida_online_id: partidaCreada.id })
        .eq("id", match.id);
      if (updateError) throw new Error(updateError.message);

      arrancados++;
    } catch (e) {
      errores.push(`Arranque partido ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { arrancados, errores };
}

/**
 * Pone al día UN partido de torneo (según tournament-pacing.ts) hasta el
 * minuto que le corresponda por tiempo real transcurrido. Compartida entre
 * el vigilante de pg_cron (que la llama para todos los partidos en curso,
 * una vez por minuto) y el polling del navegador cuando alguien está
 * mirando en vivo (que la llama cada 5 segundos, para un ritmo suave) —
 * así el comportamiento es idéntico sea quien sea el que la dispare.
 * No valida nada de autorización — quien la exponga al cliente (ver
 * tournament-server-fns.ts) es responsable de esa parte.
 */
export async function ponerAlDiaPartidoTorneo(
  torneoPartidoId: string,
  partidaOnlineId: string,
  formato: string,
): Promise<"avanzo" | "termino" | "sin_cambios"> {
  const supabase = getServiceClient();

  const { data: partida, error: partidaError } = await supabase
    .from("partidas_online")
    .select("id, estado, match_state, creado_en")
    .eq("id", partidaOnlineId)
    .maybeSingle();
  if (partidaError) throw new Error(partidaError.message);
  if (!partida || !partida.match_state) return "sin_cambios";
  if (partida.estado !== "jugando") return "sin_cambios";

  const state = deserializeMatchState(partida.match_state as SerializedMatchState);
  if (state.finished) return "sin_cambios";

  const segundosTranscurridos = (Date.now() - new Date(partida.creado_en).getTime()) / 1000;
  const objetivo = minutoObjetivo(segundosTranscurridos);
  const minutoInicial = state.minute;
  while (state.minute < objetivo && !state.finished) {
    tickMinute(state);
  }
  if (state.minute === minutoInicial && !state.finished) return "sin_cambios";

  if (!state.finished) {
    const { error: updateError } = await supabase
      .from("partidas_online")
      .update({ match_state: serializeMatchState(state), actualizado_en: new Date().toISOString() })
      .eq("id", partida.id);
    if (updateError) throw new Error(updateError.message);
    return "avanzo";
  }

  const { error: cierrePartidaError } = await supabase
    .from("partidas_online")
    .update({ match_state: serializeMatchState(state), estado: "terminado", actualizado_en: new Date().toISOString() })
    .eq("id", partida.id);
  if (cierrePartidaError) throw new Error(cierrePartidaError.message);

  const empatado = state.teams[0].goals === state.teams[1].goals;
  const penalties =
    formato === "eliminacion_directa" && empatado
      ? simulatePenaltyShootout([state.teams[0], state.teams[1]]).result
      : undefined;

  await escribirResultadoTorneoPartidoInterno(torneoPartidoId, {
    homeGoals: state.teams[0].goals,
    awayGoals: state.teams[1].goals,
    stats: { players: state.playerStats },
    events: state.events,
    ...(penalties ? { penalties } : {}),
  });
  return "termino";
}

/**
 * Busca partidos "en_curso" cuya partidas_online todavía dice "jugando",
 * los pone al día según el ritmo real (tournament-pacing.ts), y si
 * terminan, escribe el resultado final (con penales si corresponde) y
 * avanza el torneo.
 */
async function avanzarPartidosEnCurso(): Promise<{ avanzados: number; terminados: number; errores: string[] }> {
  const supabase = getServiceClient();
  const errores: string[] = [];
  let avanzados = 0;
  let terminados = 0;

  const { data: filasRaw, error } = await supabase
    .from("torneo_partidos")
    .select("*, torneos!inner(formato)")
    .eq("estado", "en_curso")
    .not("partida_online_id", "is", null);

  if (error) throw new Error(error.message);
  if (!filasRaw || filasRaw.length === 0) return { avanzados: 0, terminados: 0, errores: [] };

  const torneoIdsAfectados = new Set<string>();

  for (const row of filasRaw as Array<TorneoPartidoRow & { torneos: { formato: string } }>) {
    try {
      const resultado = await ponerAlDiaPartidoTorneo(row.id, row.partida_online_id!, row.torneos.formato);
      if (resultado === "avanzo") avanzados++;
      if (resultado === "termino") { avanzados++; terminados++; }
      if (resultado !== "sin_cambios") torneoIdsAfectados.add(row.torneo_id);
    } catch (e) {
      errores.push(`Avance partido ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const torneoId of torneoIdsAfectados) {
    try {
      await avanzarRondaSiCorresponde(torneoId);
    } catch (e) {
      errores.push(`Avance de ronda, torneo ${torneoId}: ${e instanceof Error ? e.message : String(e)}`);
    }
    try {
      await finalizarLigaSiCorresponde(torneoId);
    } catch (e) {
      errores.push(`Cierre de liga, torneo ${torneoId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { avanzados, terminados, errores };
}

export async function resolverPartidosVencidos(): Promise<ResolucionCronResultado> {
  const { arrancados, errores: erroresArranque } = await arrancarPartidosVencidos();
  const { avanzados, terminados, errores: erroresAvance } = await avanzarPartidosEnCurso();
  return {
    arrancados,
    avanzados,
    terminados,
    errores: [...erroresArranque, ...erroresAvance],
  };
}
