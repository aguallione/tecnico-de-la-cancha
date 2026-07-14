/**
 * types.ts — tipos del multijugador online.
 *
 * Reflejan las tablas `partidas_online` y `jugadores_online` de Supabase
 * (ver scripts/setup-online.sql) más los tipos auxiliares de UI.
 */

import type { MatchSettings, Team } from "@/lib/football/types";
import type { SerializedMatchState } from "@/lib/football/serialization";

/** Estado del ciclo de vida de una partida. */
export type EstadoPartida =
  | "esperando"
  | "configurando"
  | "vestuario"
  | "jugando"
  | "terminado";

/** Velocidad de avance del motor. */
export type Velocidad = "manual" | "normal" | "rapido";

/** Modo de coordinación entre compañeros de un mismo equipo. */
export type ModoCoop = "libre" | "roles" | "consenso" | "tiempos";

/** Rol visual del jugador (la autoridad real vive en partidas_online). */
export type RolJugador = "admin" | "controller" | "jugador";

/** En modo "roles": qué controla cada jugador. */
export type RolCoop = "alineacion" | "sustituciones";

/** Pantallas del árbol online. */
export type OnlineScreen =
  | "online-lobby"
  | "online-setup"
  | "online-locker"
  | "online-match"
  | "online-stats";

/** Una sustitución propuesta, en la cola subs_pendientes de un jugador. */
export interface SubPendiente {
  id: string;
  outId: string;
  inId: string;
  /** IDs de jugadores_online que ya aprobaron (para modo consenso). */
  consenso_ids: string[];
  /** 'pendiente' | 'pendiente_consenso' | 'aplicada'. */
  estado: "pendiente" | "pendiente_consenso" | "aplicada";
  propuesta_por: string;
}

/** Fila de partidas_online. */
export interface PartidaOnline {
  id: string;
  codigo: string;
  estado: EstadoPartida;
  admin_device_id: string;
  controller_device_id: string | null;
  configuracion: MatchSettings | null;
  equipo_0: Team | null;
  equipo_1: Team | null;
  match_state: SerializedMatchState | null;
  velocidad: Velocidad;
  bloque_minutos: number;
  modo_coop_0: ModoCoop;
  modo_coop_1: ModoCoop;
  creado_en: string;
  actualizado_en: string;
  /** True cuando un abandono durante el partido provocó victoria automática del rival. */
  abandono_forfeit: boolean;
}

/** Fila de jugadores_online. */
export interface JugadorOnline {
  id: string;
  partida_id: string;
  device_id: string;
  nombre: string;
  equipo_idx: 0 | 1;
  rol: RolJugador;
  equipo_listo: boolean;
  subs_pendientes: SubPendiente[];
  ultimo_heartbeat: string;
  usuario_id: string;
  unido_en: string;
  /** Timestamp en que el servidor detectó la desconexión; null = conectado. */
  desconectado_en: string | null;
}

/** Milisegundos tras los que un jugador se considera desconectado. */
export const HEARTBEAT_TIMEOUT_MS = 15_000;

/** Devuelve true si el jugador tiene un heartbeat reciente (está conectado). */
export function estaConectado(j: JugadorOnline, ahora = Date.now()): boolean {
  return ahora - new Date(j.ultimo_heartbeat).getTime() < HEARTBEAT_TIMEOUT_MS;
}
