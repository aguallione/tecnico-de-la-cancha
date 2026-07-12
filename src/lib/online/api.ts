'use client';
/**
 * api.ts — helpers cliente del multijugador online.
 *
 * Responsabilidades:
 *  · Gestión de device_id (localStorage) e identidad (Supabase Anonymous Auth).
 *  · Crear / unirse a partidas.
 *  · Polling de partida y jugadores.
 *  · Heartbeat, marcar equipo listo, proponer / aprobar sustituciones.
 *  · Persistir configuración, equipos, modo coop y transiciones de estado.
 *
 * SEGURIDAD: todos los jugadores (incluso anónimos) tienen una sesión real de
 * Supabase Auth. `usuario_id` es siempre un auth.uid() verificable, y las RLS
 * de jugadores_online garantizan que un jugador solo edite/borre su propia fila.
 */

import { supabase } from "@/lib/supabase";
import type { MatchSettings, Team } from "@/lib/football/types";
import type {
  EstadoPartida,
  JugadorOnline,
  ModoCoop,
  PartidaOnline,
  SubPendiente,
  Velocidad,
} from "@/lib/online/types";
import type { SerializedMatchState } from "@/lib/football/serialization";

// ─── device_id ───────────────────────────────────────────────────────────────

const DEVICE_KEY = "dt_online_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

// ─── Identidad: sesión real (cuenta o anónima) ────────────────────────────────

/**
 * Garantiza que exista una sesión de Supabase Auth. Si el usuario no inició
 * sesión con email, crea una sesión ANÓNIMA (auth.signInAnonymously). Devuelve
 * el auth.uid() resultante — nunca null si la operación tiene éxito.
 */
export async function ensureAuthUid(): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(`No se pudo iniciar sesión anónima: ${error.message}`);
  if (!data.user) throw new Error("No se obtuvo usuario tras el login anónimo.");
  return data.user.id;
}

// ─── Utilidades ────────────────────────────────────────────────────────────────

export function generarCodigo(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ─── Crear / unirse ──────────────────────────────────────────────────────────

export interface CrearPartidaResult {
  partida: PartidaOnline;
  jugador: JugadorOnline;
}

/**
 * Crea una partida nueva. El creador queda como admin (y controller por defecto)
 * en el equipo 0.
 */
export async function crearPartida(nombre: string): Promise<CrearPartidaResult> {
  const deviceId = getDeviceId();
  const usuarioId = await ensureAuthUid();

  // Reintenta ante colisión de código único (muy poco probable).
  let partida: PartidaOnline | null = null;
  for (let intento = 0; intento < 5 && !partida; intento++) {
    const codigo = generarCodigo();
    const { data, error } = await supabase
      .from("partidas_online")
      .insert({
        codigo,
        estado: "esperando" as EstadoPartida,
        admin_device_id: deviceId,
        controller_device_id: deviceId,
      })
      .select("*")
      .single();
    if (!error && data) {
      partida = data as PartidaOnline;
      break;
    }
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      throw new Error(error.message);
    }
  }
  if (!partida) throw new Error("No se pudo generar un código único. Intentá de nuevo.");

  const { data: jugData, error: jugError } = await supabase
    .from("jugadores_online")
    .insert({
      partida_id: partida.id,
      device_id: deviceId,
      nombre: nombre.trim() || "Anfitrión",
      equipo_idx: 0,
      rol: "admin",
      usuario_id: usuarioId,
    })
    .select("*")
    .single();
  if (jugError) throw new Error(jugError.message);

  return { partida, jugador: jugData as JugadorOnline };
}

export interface UnirseResult {
  partida: PartidaOnline;
  jugador: JugadorOnline;
}

/**
 * Se une a una partida por código. `equipoIdx` es el equipo elegido (0 o 1).
 */
export async function unirsePorCodigo(
  codigo: string,
  nombre: string,
  equipoIdx: 0 | 1,
): Promise<UnirseResult> {
  const deviceId = getDeviceId();
  const usuarioId = await ensureAuthUid();

  const { data: partidaData, error: partidaError } = await supabase
    .from("partidas_online")
    .select("*")
    .eq("codigo", codigo.trim().toUpperCase())
    .maybeSingle();
  if (partidaError) throw new Error(partidaError.message);
  if (!partidaData) throw new Error("No se encontró ninguna partida con ese código.");

  const partida = partidaData as PartidaOnline;

  const { data: jugData, error: jugError } = await supabase
    .from("jugadores_online")
    .insert({
      partida_id: partida.id,
      device_id: deviceId,
      nombre: nombre.trim() || "Jugador",
      equipo_idx: equipoIdx,
      rol: "jugador",
      usuario_id: usuarioId,
    })
    .select("*")
    .single();
  if (jugError) throw new Error(jugError.message);

  return { partida, jugador: jugData as JugadorOnline };
}

// ─── Lectura (polling) ─────────────────────────────────────────────────────────

export async function fetchPartida(partidaId: string): Promise<PartidaOnline | null> {
  const { data, error } = await supabase
    .from("partidas_online")
    .select("*")
    .eq("id", partidaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as PartidaOnline) ?? null;
}

export async function fetchJugadores(partidaId: string): Promise<JugadorOnline[]> {
  const { data, error } = await supabase
    .from("jugadores_online")
    .select("*")
    .eq("partida_id", partidaId)
    .order("unido_en", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as JugadorOnline[];
}

// ─── Heartbeat ──────────────────────────────────────────────────────────────

export async function enviarHeartbeat(jugadorId: string): Promise<void> {
  await supabase
    .from("jugadores_online")
    .update({ ultimo_heartbeat: new Date().toISOString() })
    .eq("id", jugadorId);
}

/** Elimina la fila del jugador (al salir de la partida). */
export async function salirDeLaPartida(jugadorId: string): Promise<void> {
  await supabase.from("jugadores_online").delete().eq("id", jugadorId);
}

// ─── Estado del jugador ──────────────────────────────────────────────────────

export async function cambiarEquipo(jugadorId: string, equipoIdx: 0 | 1): Promise<void> {
  const { error } = await supabase
    .from("jugadores_online")
    .update({ equipo_idx: equipoIdx, equipo_listo: false })
    .eq("id", jugadorId);
  if (error) throw new Error(error.message);
}

export async function marcarEquipoListo(jugadorId: string, listo: boolean): Promise<void> {
  const { error } = await supabase
    .from("jugadores_online")
    .update({ equipo_listo: listo })
    .eq("id", jugadorId);
  if (error) throw new Error(error.message);
}

/**
 * Guarda la cola de subs pendientes de un jugador. Se sobreescribe entera
 * porque la RLS solo permite editar la propia fila.
 */
export async function guardarSubsPendientes(
  jugadorId: string,
  subs: SubPendiente[],
): Promise<void> {
  const { error } = await supabase
    .from("jugadores_online")
    .update({ subs_pendientes: subs })
    .eq("id", jugadorId);
  if (error) throw new Error(error.message);
}

// ─── Escrituras de partida (permitidas al cliente por el plan) ────────────────

export async function guardarConfiguracion(
  partidaId: string,
  configuracion: MatchSettings,
): Promise<void> {
  const { error } = await supabase
    .from("partidas_online")
    .update({ configuracion, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

export async function guardarEquipo(
  partidaId: string,
  equipoIdx: 0 | 1,
  team: Team,
): Promise<void> {
  const campo = equipoIdx === 0 ? "equipo_0" : "equipo_1";
  const { error } = await supabase
    .from("partidas_online")
    .update({ [campo]: team, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

export async function guardarModoCoop(
  partidaId: string,
  equipoIdx: 0 | 1,
  modo: ModoCoop,
): Promise<void> {
  const campo = equipoIdx === 0 ? "modo_coop_0" : "modo_coop_1";
  const { error } = await supabase
    .from("partidas_online")
    .update({ [campo]: modo, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

export async function actualizarEstado(
  partidaId: string,
  estado: EstadoPartida,
): Promise<void> {
  const { error } = await supabase
    .from("partidas_online")
    .update({ estado, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

export async function guardarAjustesPartida(
  partidaId: string,
  ajustes: { velocidad?: Velocidad; bloque_minutos?: number },
): Promise<void> {
  const { error } = await supabase
    .from("partidas_online")
    .update({ ...ajustes, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

/** Inicializa el match_state serializado en la partida (una sola vez, por el admin). */
export async function guardarMatchState(
  partidaId: string,
  matchState: SerializedMatchState,
  estado: EstadoPartida,
): Promise<void> {
  const { error } = await supabase
    .from("partidas_online")
    .update({ match_state: matchState, estado, actualizado_en: new Date().toISOString() })
    .eq("id", partidaId);
  if (error) throw new Error(error.message);
}

// ─── Equipos públicos ─────────────────────────────────────────────────────────

export interface EquipoPublico {
  id: string;
  nombre: string;
  plantel: import("@/lib/football/types").Player[];
}

export async function fetchEquiposPublicos(): Promise<EquipoPublico[]> {
  const { data, error } = await supabase
    .from("equipos_guardados")
    .select("id, nombre, plantel")
    .eq("es_publico", true)
    .order("creado_en", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as EquipoPublico[];
}
