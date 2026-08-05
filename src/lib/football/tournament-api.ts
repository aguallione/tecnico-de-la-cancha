'use client';
/**
 * tournament-api.ts — helpers cliente de Torneos (sesión normal, no service_role).
 * Convierte entre las filas de Supabase (snake_case, columnas reales) y los
 * tipos de dominio de tournament-types.ts (camelCase). El resultado de un
 * partido NUNCA se escribe desde acá — eso es exclusivo de
 * escribirResultadoTorneoPartido en tournament-server-fns.ts.
 */

import { supabase } from "@/lib/supabase";
import { ensureAuthUid } from "@/lib/online/api";
import type { Player, MatchSettings } from "@/lib/football/types";
import type {
  Tournament,
  TournamentFormat,
  TournamentSlot,
  TournamentFixtureMatch,
} from "./tournament-types";
import {
  generateRoundRobinFixture,
  generateBracketFirstRound,
  totalRondasLiga,
  totalRondasBracket,
} from "./tournament-fixture";

// ─── Filas crudas de Supabase (snake_case, tal cual las columnas) ───────────

interface TorneoRow {
  id: string;
  nombre: string;
  formato: TournamentFormat;
  estado: "armado" | "en_curso" | "finalizado";
  target_slot_count: number;
  ronda_actual: number;
  total_rondas: number;
  es_online: boolean;
  codigo_sala: string | null;
  creado_por: string;
  config_partido: MatchSettings;
  campeon_slot_id: string | null;
  creado_en: string;
  finalizado_en: string | null;
}

interface TorneoSlotRow {
  id: string;
  torneo_id: string;
  nombre_visible: string;
  config_equipo: TournamentSlot["teamConfig"];
  plantel: Player[];
  formacion: string;
  estilo: TournamentSlot["style"];
  altura_linea: TournamentSlot["lineHeight"];
  salida: TournamentSlot["buildUp"];
  presion: TournamentSlot["pressIntensity"];
  usuario_id: string | null;
  equipo_guardado_id: string | null;
  seed: number;
}

interface TorneoPartidoRow {
  id: string;
  torneo_id: string;
  ronda: number;
  slot_local_id: string;
  slot_visitante_id: string;
  estado: "pendiente" | "jugado" | "walkover";
  resultado: TournamentFixtureMatch["result"] | null;
  partida_online_id: string | null;
  posicion_bracket: number | null;
}

// ─── Conversión fila → tipo de dominio ──────────────────────────────────────

function rowToTournament(row: TorneoRow): Tournament {
  return {
    id: row.id,
    name: row.nombre,
    format: row.formato,
    status: row.estado,
    slots: [],
    fixture: [],
    currentRound: row.ronda_actual,
    totalRounds: row.total_rondas,
    isOnline: row.es_online,
    roomCode: row.codigo_sala ?? undefined,
    createdByUserId: row.creado_por,
    matchSettingsTemplate: row.config_partido,
    createdAt: row.creado_en,
    finishedAt: row.finalizado_en ?? undefined,
    championSlotId: row.campeon_slot_id ?? undefined,
    targetSlotCount: row.target_slot_count,
  };
}

function rowToSlot(row: TorneoSlotRow): TournamentSlot {
  return {
    id: row.id,
    displayName: row.nombre_visible,
    teamConfig: row.config_equipo,
    squad: row.plantel,
    formation: row.formacion,
    style: row.estilo,
    lineHeight: row.altura_linea,
    buildUp: row.salida,
    pressIntensity: row.presion,
    ownerUserId: row.usuario_id ?? undefined,
    equipoGuardadoId: row.equipo_guardado_id ?? undefined,
    seed: row.seed,
  };
}

function rowToFixtureMatch(row: TorneoPartidoRow): TournamentFixtureMatch {
  return {
    id: row.id,
    round: row.ronda,
    homeSlotId: row.slot_local_id,
    awaySlotId: row.slot_visitante_id,
    status: row.estado,
    result: row.resultado ?? undefined,
    partidaOnlineId: row.partida_online_id ?? undefined,
    bracketPosition: row.posicion_bracket ?? undefined,
  };
}

// ─── Crear torneo ────────────────────────────────────────────────────────────

export async function crearTorneo(params: {
  nombre: string;
  formato: TournamentFormat;
  targetSlotCount: number;
  matchSettings: MatchSettings;
}): Promise<Tournament> {
  const usuarioId = await ensureAuthUid();
  const { data, error } = await supabase
    .from("torneos")
    .insert({
      nombre: params.nombre.trim(),
      formato: params.formato,
      target_slot_count: params.targetSlotCount,
      es_online: false,
      creado_por: usuarioId,
      config_partido: params.matchSettings,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToTournament(data as TorneoRow);
}

// ─── Agregar cupos ───────────────────────────────────────────────────────────

export async function agregarSlot(params: {
  torneoId: string;
  displayName: string;
  teamConfig: TournamentSlot["teamConfig"];
  squad: Player[];
  formation: string;
  style: TournamentSlot["style"];
  lineHeight: TournamentSlot["lineHeight"];
  buildUp: TournamentSlot["buildUp"];
  pressIntensity: TournamentSlot["pressIntensity"];
  ownerUserId?: string;
  equipoGuardadoId?: string;
  seed: number;
}): Promise<TournamentSlot> {
  const { data, error } = await supabase
    .from("torneo_slots")
    .insert({
      torneo_id: params.torneoId,
      nombre_visible: params.displayName,
      config_equipo: params.teamConfig,
      plantel: params.squad,
      formacion: params.formation,
      estilo: params.style,
      altura_linea: params.lineHeight,
      salida: params.buildUp,
      presion: params.pressIntensity,
      usuario_id: params.ownerUserId ?? null,
      equipo_guardado_id: params.equipoGuardadoId ?? null,
      seed: params.seed,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToSlot(data as TorneoSlotRow);
}

export async function fetchSlots(torneoId: string): Promise<TournamentSlot[]> {
  const { data, error } = await supabase
    .from("torneo_slots")
    .select("*")
    .eq("torneo_id", torneoId)
    .order("seed", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToSlot(r as TorneoSlotRow));
}

// ─── Generar fixture y arrancar el torneo ───────────────────────────────────

export async function generarFixtureYArrancar(torneoId: string): Promise<void> {
  const { data: torneoData, error: torneoError } = await supabase
    .from("torneos")
    .select("*")
    .eq("id", torneoId)
    .single();
  if (torneoError) throw new Error(torneoError.message);
  const torneo = torneoData as TorneoRow;

  const slots = await fetchSlots(torneoId);
  if (slots.length < 2) {
    throw new Error("Hacen falta al menos 2 equipos para arrancar el torneo.");
  }

  const idsPorSeed = [...slots].sort((a, b) => a.seed - b.seed).map((s) => s.id);

  let drafts: ReturnType<typeof generateRoundRobinFixture>;
  let totalRondas: number;
  if (torneo.formato === "eliminacion_directa") {
    drafts = generateBracketFirstRound(idsPorSeed);
    totalRondas = totalRondasBracket(slots.length);
  } else {
    const idaYVuelta = torneo.formato === "liga_ida_vuelta";
    drafts = generateRoundRobinFixture(idsPorSeed, idaYVuelta);
    totalRondas = totalRondasLiga(slots.length, idaYVuelta);
  }

  const filas = drafts.map((d) => ({
    torneo_id: torneoId,
    ronda: d.round,
    slot_local_id: d.homeSlotId,
    slot_visitante_id: d.awaySlotId,
    posicion_bracket: d.bracketPosition ?? null,
  }));

  const { error: insertError } = await supabase.from("torneo_partidos").insert(filas);
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("torneos")
    .update({ estado: "en_curso", ronda_actual: 1, total_rondas: totalRondas })
    .eq("id", torneoId);
  if (updateError) throw new Error(updateError.message);
}

export async function fetchFixture(torneoId: string): Promise<TournamentFixtureMatch[]> {
  const { data, error } = await supabase
    .from("torneo_partidos")
    .select("*")
    .eq("torneo_id", torneoId)
    .order("ronda", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToFixtureMatch(r as TorneoPartidoRow));
}

export async function fetchTorneo(torneoId: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from("torneos")
    .select("*")
    .eq("id", torneoId)
    .single();
  if (error) throw new Error(error.message);
  return rowToTournament(data as TorneoRow);
}