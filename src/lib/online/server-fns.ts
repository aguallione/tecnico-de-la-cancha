/**
 * server-fns.ts — funciones de servidor (autoridad única del motor).
 *
 * Todas usan el cliente service_role (bypassa RLS). El cliente jamás corre el
 * motor: solo pide bloques de simulación y lee el resultado por polling.
 *
 * Funciones:
 *   · tickPartida     — avanza N minutos, aplica subs pendientes, sucesión admin.
 *   · verificarAdmin  — comprueba heartbeat del admin y transfiere si cayó.
 *   · transferirAdmin — transferencia manual a otro device conectado.
 *   · confirmarSub    — agrega/aprueba una sustitución en la cola de un jugador.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceClient } from "@/lib/online/supabase-server";
import { substitute, tickMinute, type MatchState } from "@/lib/football/engine";
import {
  deserializeMatchState,
  serializeMatchState,
  type SerializedMatchState,
} from "@/lib/football/serialization";
import type { MatchEvent } from "@/lib/football/types";
import type { JugadorOnline, ModoCoop, PartidaOnline, SubPendiente } from "@/lib/online/types";

const HEARTBEAT_TIMEOUT_MS = 15_000;

// ─── Helpers internos ─────────────────────────────────────────────────────────

function conectado(j: JugadorOnline, ahora: number): boolean {
  return ahora - new Date(j.ultimo_heartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
}

async function leerPartida(partidaId: string): Promise<PartidaOnline> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("partidas_online")
    .select("*")
    .eq("id", partidaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("La partida no existe.");
  return data as PartidaOnline;
}

async function leerJugadores(partidaId: string): Promise<JugadorOnline[]> {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from("jugadores_online")
    .select("*")
    .eq("partida_id", partidaId)
    .order("unido_en", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as JugadorOnline[];
}

/**
 * Aplica la sucesión automática de admin si el admin actual está desconectado.
 * Nuevo admin = jugador con unido_en más antiguo entre los conectados, excluyendo
 * al admin caído. Devuelve el device_id del admin resultante.
 */
async function aplicarSucesion(
  partida: PartidaOnline,
  jugadores: JugadorOnline[],
): Promise<string> {
  const ahora = Date.now();
  const adminConectado = jugadores.some(
    (j) => j.device_id === partida.admin_device_id && conectado(j, ahora),
  );
  if (adminConectado) return partida.admin_device_id;

  const candidatos = jugadores
    .filter((j) => j.device_id !== partida.admin_device_id && conectado(j, ahora))
    .sort((a, b) => new Date(a.unido_en).getTime() - new Date(b.unido_en).getTime());

  if (candidatos.length === 0) return partida.admin_device_id;

  const nuevoAdmin = candidatos[0].device_id;
  const nuevoController =
    (partida.controller_device_id ?? partida.admin_device_id) === partida.admin_device_id
      ? nuevoAdmin
      : partida.controller_device_id;

  const supabase = getServiceClient();
  await supabase
    .from("partidas_online")
    .update({
      admin_device_id: nuevoAdmin,
      controller_device_id: nuevoController,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", partida.id);

  await supabase
    .from("jugadores_online")
    .update({ rol: "jugador" })
    .eq("partida_id", partida.id)
    .eq("rol", "admin");
  await supabase
    .from("jugadores_online")
    .update({ rol: "admin" })
    .eq("partida_id", partida.id)
    .eq("device_id", nuevoAdmin);

  return nuevoAdmin;
}

/**
 * Consume las subs pendientes respetando el modo de coordinación del equipo.
 */
async function consumirSubs(
  partida: PartidaOnline,
  jugadores: JugadorOnline[],
  state: MatchState,
): Promise<void> {
  const supabase = getServiceClient();
  const modoPorEquipo: Record<0 | 1, ModoCoop> = {
    0: partida.modo_coop_0,
    1: partida.modo_coop_1,
  };
  const jugadoresPorEquipo: Record<0 | 1, number> = {
    0: jugadores.filter((j) => j.equipo_idx === 0).length,
    1: jugadores.filter((j) => j.equipo_idx === 1).length,
  };

  for (const jugador of jugadores) {
    const subs = Array.isArray(jugador.subs_pendientes) ? jugador.subs_pendientes : [];
    if (subs.length === 0) continue;

    const equipoIdx = (jugador.equipo_idx === 1 ? 1 : 0) as 0 | 1;
    const modo = modoPorEquipo[equipoIdx];
    const restantes: SubPendiente[] = [];
    let cambio = false;

    for (const sub of subs) {
      if (sub.estado === "aplicada") {
        cambio = true;
        continue;
      }
      const requiereConsenso = modo === "consenso";
      const aprobada =
        !requiereConsenso ||
        (sub.consenso_ids?.length ?? 0) >= jugadoresPorEquipo[equipoIdx];

      if (aprobada) {
        substitute(state, equipoIdx, sub.outId, sub.inId);
        cambio = true;
      } else {
        restantes.push(sub);
      }
    }

    if (cambio) {
      await supabase
        .from("jugadores_online")
        .update({ subs_pendientes: restantes })
        .eq("id", jugador.id);
    }
  }
}

// ─── tickPartida ───────────────────────────────────────────────────────────────

export const tickPartida = createServerFn({ method: "POST" })
  .validator(z.object({ partida_id: z.string(), bloque: z.number().min(1).max(15) }))
  .handler(async ({ data }) => {
    const partida = await leerPartida(data.partida_id);
    const jugadores = await leerJugadores(data.partida_id);

    await aplicarSucesion(partida, jugadores);

    if (!partida.match_state) {
      return {
        ok: false as const,
        finished: false,
        eventos_nuevos: [] as MatchEvent[],
        error: "match_state no inicializado",
      };
    }

    const state = deserializeMatchState(partida.match_state as SerializedMatchState);

    if (state.finished) {
      return { ok: true as const, finished: true, eventos_nuevos: [] as MatchEvent[] };
    }

    await consumirSubs(partida, jugadores, state);

    const eventosNuevos: MatchEvent[] = [];
    for (let i = 0; i < data.bloque && !state.finished; i++) {
      state.redCardPausePending = null;
      const evs = tickMinute(state);
      eventosNuevos.push(...evs);
    }

    const supabase = getServiceClient();
    const serialized = serializeMatchState(state);
    const nuevoEstado = state.finished ? "terminado" : "jugando";
    const { error } = await supabase
      .from("partidas_online")
      .update({
        match_state: serialized,
        estado: nuevoEstado,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", data.partida_id);
    if (error) throw new Error(error.message);

    return { ok: true as const, finished: state.finished, eventos_nuevos: eventosNuevos };
  });

// ─── verificarAdmin ─────────────────────────────────────────────────────────

export const verificarAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ partida_id: z.string() }))
  .handler(async ({ data }) => {
    const partida = await leerPartida(data.partida_id);
    const jugadores = await leerJugadores(data.partida_id);
    const nuevoAdmin = await aplicarSucesion(partida, jugadores);
    return { ok: true as const, admin_device_id: nuevoAdmin };
  });

// ─── transferirAdmin (manual) ─────────────────────────────────────────────────

export const transferirAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ partida_id: z.string(), nuevo_device_id: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getServiceClient();
    const partida = await leerPartida(data.partida_id);

    const nuevoController =
      (partida.controller_device_id ?? partida.admin_device_id) === partida.admin_device_id
        ? data.nuevo_device_id
        : partida.controller_device_id;

    const { error } = await supabase
      .from("partidas_online")
      .update({
        admin_device_id: data.nuevo_device_id,
        controller_device_id: nuevoController,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", data.partida_id);
    if (error) throw new Error(error.message);

    await supabase
      .from("jugadores_online")
      .update({ rol: "jugador" })
      .eq("partida_id", data.partida_id)
      .eq("rol", "admin");
    await supabase
      .from("jugadores_online")
      .update({ rol: "admin" })
      .eq("partida_id", data.partida_id)
      .eq("device_id", data.nuevo_device_id);

    return { ok: true as const };
  });

// ─── confirmarSub ─────────────────────────────────────────────────────────────

export const confirmarSub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      partida_id: z.string(),
      jugador_id: z.string(),
      sub: z.object({ outId: z.string(), inId: z.string() }),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceClient();
    const jugadores = await leerJugadores(data.partida_id);
    const jugador = jugadores.find((j) => j.id === data.jugador_id);
    if (!jugador) throw new Error("Jugador no encontrado.");

    const partida = await leerPartida(data.partida_id);
    const modo = jugador.equipo_idx === 0 ? partida.modo_coop_0 : partida.modo_coop_1;

    const subs: SubPendiente[] = Array.isArray(jugador.subs_pendientes)
      ? [...jugador.subs_pendientes]
      : [];

    const existente = subs.find(
      (s) => s.outId === data.sub.outId && s.inId === data.sub.inId && s.estado !== "aplicada",
    );

    if (existente) {
      if (!existente.consenso_ids.includes(data.jugador_id)) {
        existente.consenso_ids.push(data.jugador_id);
      }
    } else {
      subs.push({
        id: crypto.randomUUID(),
        outId: data.sub.outId,
        inId: data.sub.inId,
        consenso_ids: [data.jugador_id],
        estado: modo === "consenso" ? "pendiente_consenso" : "pendiente",
        propuesta_por: data.jugador_id,
      });
    }

    const { error } = await supabase
      .from("jugadores_online")
      .update({ subs_pendientes: subs })
      .eq("id", data.jugador_id);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });
