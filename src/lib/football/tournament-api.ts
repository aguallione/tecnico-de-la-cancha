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
import { autoLineup } from "@/lib/football/bot";
import type { Player, MatchSettings, Team } from "@/lib/football/types";
import type {
  Tournament,
  TournamentFormat,
  TournamentSlot,
  TournamentFixtureMatch,
  AiInterventionLevel,
} from "./tournament-types";
import {
  generateRoundRobinFixture,
  generateBracketFirstRound,
  totalRondasLiga,
  totalRondasBracket,
} from "./tournament-fixture";
import { computeStandings } from "./tournament-standings";

// ─── Filas crudas de Supabase (snake_case, tal cual las columnas) ───────────

export interface TorneoRow {
  id: string;
  nombre: string;
  formato: TournamentFormat;
  estado: "armado" | "en_curso" | "finalizado";
  target_slot_count: number;
  ronda_actual: number;
  total_rondas: number;
  es_online: boolean;
  codigo_sala: string | null;
  nivel_ia: AiInterventionLevel | null;
  modo_horario: "manual" | "automatico_simultaneo" | "automatico_escalonado" | null;
  horario_aleatorio: boolean;
  rango_horario_inicio: string | null;
  rango_horario_fin: string | null;
  intervalo_horas: number | null;
  creado_por: string;
  config_partido: MatchSettings;
  campeon_slot_id: string | null;
  creado_en: string;
  finalizado_en: string | null;
}

export interface TorneoSlotRow {
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
  titulares: string[] | null;
  capitan_id: string | null;
  pateador_penales_id: string | null;
  pateador_tiros_libres_id: string | null;
}

export interface TorneoPartidoRow {
  id: string;
  torneo_id: string;
  ronda: number;
  slot_local_id: string;
  slot_visitante_id: string;
  estado: "pendiente" | "en_curso" | "jugado" | "walkover";
  resultado: TournamentFixtureMatch["result"] | null;
  partida_online_id: string | null;
  posicion_bracket: number | null;
  hora_programada: string | null;
}

// ─── Conversión fila → tipo de dominio ──────────────────────────────────────

export function rowToTournament(row: TorneoRow): Tournament {
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
    aiInterventionLevel: row.nivel_ia ?? undefined,
    modoHorario: row.modo_horario ?? undefined,
    horarioAleatorio: row.horario_aleatorio,
    rangoHorarioInicio: row.rango_horario_inicio ?? undefined,
    rangoHorarioFin: row.rango_horario_fin ?? undefined,
    intervaloHoras: row.intervalo_horas ?? undefined,
    createdByUserId: row.creado_por,
    matchSettingsTemplate: row.config_partido,
    createdAt: row.creado_en,
    finishedAt: row.finalizado_en ?? undefined,
    championSlotId: row.campeon_slot_id ?? undefined,
    targetSlotCount: row.target_slot_count,
  };
}

export function rowToSlot(row: TorneoSlotRow): TournamentSlot {
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
    starting: row.titulares ?? undefined,
    captainId: row.capitan_id ?? undefined,
    penaltyTakerId: row.pateador_penales_id ?? undefined,
    setPieceTakerId: row.pateador_tiros_libres_id ?? undefined,
  };
}

export function rowToFixtureMatch(row: TorneoPartidoRow): TournamentFixtureMatch {
  return {
    id: row.id,
    round: row.ronda,
    homeSlotId: row.slot_local_id,
    awaySlotId: row.slot_visitante_id,
    status: row.estado,
    result: row.resultado ?? undefined,
    partidaOnlineId: row.partida_online_id ?? undefined,
    bracketPosition: row.posicion_bracket ?? undefined,
    scheduledAt: row.hora_programada ?? undefined,
  };
}

/**
 * Calcula la hora programada de un partido de torneo online: un ancla
 * (normalmente "ahora", el momento en que se genera esa tanda de partidos)
 * más un desplazamiento en horas, y si el torneo tiene horario aleatorio
 * activado, reemplaza la hora del día por un horario al azar dentro del
 * rango configurado (mismo día calculado por el desplazamiento).
 */
function calcularHoraProgramada(params: {
  ancla: Date;
  offsetHoras: number;
  aleatorio: boolean;
  rangoInicio?: string | null;
  rangoFin?: string | null;
}): Date {
  const fecha = new Date(params.ancla.getTime() + params.offsetHoras * 60 * 60 * 1000);
  if (params.aleatorio && params.rangoInicio && params.rangoFin) {
    const [hIni, mIni] = params.rangoInicio.split(":").map(Number);
    const [hFin, mFin] = params.rangoFin.split(":").map(Number);
    const minIni = hIni * 60 + mIni;
    const minFin = hFin * 60 + mFin;
    const rango = Math.max(1, minFin - minIni);
    const minAleatorio = minIni + Math.floor(Math.random() * rango);
    fecha.setHours(Math.floor(minAleatorio / 60), minAleatorio % 60, 0, 0);
  }
  return fecha;
}

// ─── Crear torneo ────────────────────────────────────────────────────────────

const LETRAS_CODIGO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generarCodigoAlAzar(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += LETRAS_CODIGO[Math.floor(Math.random() * LETRAS_CODIGO.length)];
  }
  return codigo;
}

/** Reintenta hasta encontrar un código de 6 letras que no esté en uso todavía. */
async function generarCodigoSalaUnico(): Promise<string> {
  for (let intento = 0; intento < 10; intento++) {
    const codigo = generarCodigoAlAzar();
    const { data, error } = await supabase
      .from("torneos")
      .select("id")
      .eq("codigo_sala", codigo)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return codigo;
  }
  throw new Error("No se pudo generar un código de sala único. Probá crear el torneo de nuevo.");
}

export async function crearTorneo(params: {
  nombre: string;
  formato: TournamentFormat;
  targetSlotCount: number;
  matchSettings: MatchSettings;
  esOnline?: boolean;
  modoHorario?: "manual" | "automatico_simultaneo" | "automatico_escalonado";
  horarioAleatorio?: boolean;
  rangoHorarioInicio?: string;
  rangoHorarioFin?: string;
  intervaloHoras?: number;
  aiInterventionLevel?: AiInterventionLevel;
}): Promise<Tournament> {
  const usuarioId = await ensureAuthUid();
  const codigoSala = params.esOnline ? await generarCodigoSalaUnico() : null;

  const { data, error } = await supabase
    .from("torneos")
    .insert({
      nombre: params.nombre.trim(),
      formato: params.formato,
      target_slot_count: params.targetSlotCount,
      es_online: params.esOnline ?? false,
      codigo_sala: codigoSala,
      creado_por: usuarioId,
      config_partido: params.matchSettings,
      modo_horario: params.esOnline ? (params.modoHorario ?? "manual") : null,
      horario_aleatorio: params.esOnline ? (params.horarioAleatorio ?? false) : false,
      rango_horario_inicio: params.esOnline && params.horarioAleatorio ? params.rangoHorarioInicio ?? null : null,
      rango_horario_fin: params.esOnline && params.horarioAleatorio ? params.rangoHorarioFin ?? null : null,
      intervalo_horas: params.esOnline ? params.intervaloHoras ?? null : null,
      nivel_ia: params.esOnline ? (params.aiInterventionLevel ?? "ninguna") : null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const torneo = rowToTournament(data as TorneoRow);

  if (params.esOnline) {
    const { error: adminError } = await supabase
      .from("torneo_admins")
      .insert({ torneo_id: torneo.id, usuario_id: usuarioId });
    if (adminError) throw new Error(adminError.message);
  }

  return torneo;
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

/**
 * Actualiza formación/táctica/alineación/capitán/pateadores/roles
 * individuales del propio slot en un torneo. NO permite cambiar la
 * composición del plantel (qué jugadores hay) — eso queda fijo desde que
 * te anotás. `squad` se manda igual porque ahí puede haber cambiado el
 * `individualRole` de algún jugador ya existente.
 */
export async function actualizarMiSlot(params: {
  slotId: string;
  formation: string;
  style: TournamentSlot["style"];
  lineHeight: TournamentSlot["lineHeight"];
  buildUp: TournamentSlot["buildUp"];
  pressIntensity: TournamentSlot["pressIntensity"];
  squad: Player[];
  starting: string[];
  captainId?: string;
  penaltyTakerId?: string;
  setPieceTakerId?: string;
}): Promise<TournamentSlot> {
  const { data, error } = await supabase
    .from("torneo_slots")
    .update({
      formacion: params.formation,
      estilo: params.style,
      altura_linea: params.lineHeight,
      salida: params.buildUp,
      presion: params.pressIntensity,
      plantel: params.squad,
      titulares: params.starting,
      capitan_id: params.captainId ?? null,
      pateador_penales_id: params.penaltyTakerId ?? null,
      pateador_tiros_libres_id: params.setPieceTakerId ?? null,
    })
    .eq("id", params.slotId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToSlot(data as TorneoSlotRow);
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

  const ancla = new Date();
  const filas = drafts.map((d, index) => {
    let horaProgramada: string | null = null;
    if (torneo.es_online && torneo.modo_horario && torneo.modo_horario !== "manual") {
      const offsetHoras =
        torneo.modo_horario === "automatico_simultaneo"
          ? (d.round - 1) * (torneo.intervalo_horas ?? 24)
          : index * (torneo.intervalo_horas ?? 24);
      horaProgramada = calcularHoraProgramada({
        ancla,
        offsetHoras,
        aleatorio: torneo.horario_aleatorio,
        rangoInicio: torneo.rango_horario_inicio,
        rangoFin: torneo.rango_horario_fin,
      }).toISOString();
    }
    return {
      torneo_id: torneoId,
      ronda: d.round,
      slot_local_id: d.homeSlotId,
      slot_visitante_id: d.awaySlotId,
      posicion_bracket: d.bracketPosition ?? null,
      hora_programada: horaProgramada,
    };
  });

  const { error: insertError } = await supabase.from("torneo_partidos").insert(filas);
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("torneos")
    .update({ estado: "en_curso", ronda_actual: 1, total_rondas: totalRondas })
    .eq("id", torneoId);
  if (updateError) throw new Error(updateError.message);
}

/** Trae un único partido de torneo por su id — para pantallas que solo necesitan seguir uno. */
export async function fetchTorneoPartido(torneoPartidoId: string): Promise<TournamentFixtureMatch> {
  const { data, error } = await supabase
    .from("torneo_partidos")
    .select("*")
    .eq("id", torneoPartidoId)
    .single();
  if (error) throw new Error(error.message);
  return rowToFixtureMatch(data as TorneoPartidoRow);
}

/**
 * Asigna o cambia el horario de un partido de torneo online en modo manual.
 * La autorización, el estado del partido y las superposiciones se validan
 * dentro de una función segura de la base de datos.
 */
export async function asignarHoraPartido(torneoPartidoId: string, fechaHoraISO: string): Promise<void> {
  const { error } = await supabase.rpc("asignar_hora_partido_torneo", {
    p_torneo_partido_id: torneoPartidoId,
    p_fecha_hora: fechaHoraISO,
  });

  if (error) throw new Error(error.message);
}

/** Verifica si el usuario actual es admin del torneo dado. */
export async function esAdminDeTorneo(torneoId: string): Promise<boolean> {
  const usuarioId = await ensureAuthUid();
  const { data, error } = await supabase
    .from("torneo_admins")
    .select("usuario_id")
    .eq("torneo_id", torneoId)
    .eq("usuario_id", usuarioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return !!data;
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

/**
 * Reconstruye un Team jugable a partir de un TournamentSlot, preservando la
 * formación/táctica guardadas al anotarse (a diferencia de makeTeamFromSquad,
 * que siempre arranca en 4-4-2/Equilibrado). La alineación titular se
 * recalcula con autoLineup en cada partido, porque TournamentSlot no la
 * guarda — el usuario la puede ajustar en el vestuario antes de jugar.
 */
export function teamFromSlot(slot: TournamentSlot): Team {
  const normalizedSquad: Player[] = slot.squad.map((p) => ({
    ...p,
    stamina: 100,
    onField: false,
    redCarded: false,
    yellowCards: 0,
    injured: false,
    fieldPosition: undefined,
    slotIndex: undefined,
  }));

  const squadIds = new Set(normalizedSquad.map((p) => p.id));
  const startingGuardado =
    slot.starting && slot.starting.length === 11 && slot.starting.every((id) => squadIds.has(id))
      ? slot.starting
      : null;
  const starting = startingGuardado ?? autoLineup(normalizedSquad, slot.formation);
  const starters = normalizedSquad.filter((p) => starting.includes(p.id));

  const kicker = starters.length
    ? [...starters].sort((a, b) => b.shooting - a.shooting)[0]
    : normalizedSquad[0];

  const captainGuardado =
    slot.captainId && starters.some((p) => p.id === slot.captainId) ? slot.captainId : undefined;
  const captain = captainGuardado
    ? starters.find((p) => p.id === captainGuardado)
    : starters.length
      ? starters.reduce((a, b) => (a.overall > b.overall ? a : b), starters[0])
      : normalizedSquad[0];

  const penaltyGuardado =
    slot.penaltyTakerId && starters.some((p) => p.id === slot.penaltyTakerId)
      ? slot.penaltyTakerId
      : undefined;
  const setPieceGuardado =
    slot.setPieceTakerId && starters.some((p) => p.id === slot.setPieceTakerId)
      ? slot.setPieceTakerId
      : undefined;

  return {
    config: slot.teamConfig,
    squad: normalizedSquad,
    formation: slot.formation,
    starting,
    style: slot.style,
    lineHeight: slot.lineHeight,
    buildUp: slot.buildUp,
    pressIntensity: slot.pressIntensity,
    captainId: captain?.id,
    penaltyTakerId: penaltyGuardado ?? kicker?.id,
    setPieceTakerId: setPieceGuardado ?? kicker?.id,
    substitutionsLeft: 5,
    redCards: 0,
    yellowCards: 0,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    possession: 0,
    goals: 0,
    xg: 0,
    saves: 0,
  };
}

/**
 * Torneos donde el usuario actual es el creador, MÁS los torneos donde
 * se anotó como participante con su propio equipo (ver 4.4-2b). Se
 * combinan y ordenan por fecha de creación, sin duplicados.
 */
export async function fetchMisTorneos(): Promise<Tournament[]> {
  const usuarioId = await ensureAuthUid();

  const { data: creados, error: creadosError } = await supabase
    .from("torneos")
    .select("*")
    .eq("creado_por", usuarioId);
  if (creadosError) throw new Error(creadosError.message);

  const { data: slotsPropios, error: slotsError } = await supabase
    .from("torneo_slots")
    .select("torneo_id")
    .eq("usuario_id", usuarioId);
  if (slotsError) throw new Error(slotsError.message);

  const idsYaTraidos = new Set((creados ?? []).map((t) => t.id));
  const idsFaltantes = [...new Set((slotsPropios ?? []).map((s) => s.torneo_id))].filter(
    (id) => !idsYaTraidos.has(id),
  );

  let unidos: TorneoRow[] = [];
  if (idsFaltantes.length > 0) {
    const { data, error } = await supabase.from("torneos").select("*").in("id", idsFaltantes);
    if (error) throw new Error(error.message);
    unidos = (data ?? []) as TorneoRow[];
  }

  const todos = [...(creados ?? []), ...unidos] as TorneoRow[];
  todos.sort((a, b) => (a.creado_en < b.creado_en ? 1 : -1));
  return todos.map((r) => rowToTournament(r));
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

/** Busca un torneo por su código de sala de 6 letras (no distingue mayúsculas/minúsculas). */
export async function fetchTorneoPorCodigo(codigo: string): Promise<Tournament> {
  const { data, error } = await supabase
    .from("torneos")
    .select("*")
    .eq("codigo_sala", codigo.trim().toUpperCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No existe ningún torneo con ese código.");
  return rowToTournament(data as TorneoRow);
}

/**
 * Se une a un torneo online existente usando su código de sala, anotando el
 * equipo del usuario actual como un slot nuevo. Valida que el torneo sea
 * online, que todavía esté "armado" (no arrancado), y que el usuario no
 * tenga ya un equipo anotado en ese mismo torneo.
 */
export async function unirseATorneoConCodigo(params: {
  codigo: string;
  displayName: string;
  teamConfig: TournamentSlot["teamConfig"];
  squad: Player[];
  formation: string;
  style: TournamentSlot["style"];
  lineHeight: TournamentSlot["lineHeight"];
  buildUp: TournamentSlot["buildUp"];
  pressIntensity: TournamentSlot["pressIntensity"];
}): Promise<{ torneo: Tournament; slot: TournamentSlot }> {
  const usuarioId = await ensureAuthUid();
  const torneo = await fetchTorneoPorCodigo(params.codigo);

  if (!torneo.isOnline) {
    throw new Error("Ese código no corresponde a un torneo online.");
  }
  if (torneo.status !== "armado") {
    throw new Error("Ese torneo ya arrancó o ya terminó — no se pueden sumar más equipos.");
  }

  const slotsActuales = await fetchSlots(torneo.id);
  if (slotsActuales.some((s) => s.ownerUserId === usuarioId)) {
    throw new Error("Ya tenés un equipo anotado en este torneo.");
  }

  const slot = await agregarSlot({
    torneoId: torneo.id,
    displayName: params.displayName,
    teamConfig: params.teamConfig,
    squad: params.squad,
    formation: params.formation,
    style: params.style,
    lineHeight: params.lineHeight,
    buildUp: params.buildUp,
    pressIntensity: params.pressIntensity,
    ownerUserId: usuarioId,
    seed: slotsActuales.length,
  });

  return { torneo, slot };
}

function ganadorDe(m: TournamentFixtureMatch): string {
  if (!m.result) throw new Error("No se puede determinar el ganador de un partido sin resultado.");
  if (m.result.penalties) {
    return m.result.penalties.homeGoals > m.result.penalties.awayGoals ? m.homeSlotId : m.awaySlotId;
  }
  return m.result.homeGoals >= m.result.awayGoals ? m.homeSlotId : m.awaySlotId;
}

/**
 * Solo aplica a Eliminación directa. Revisa si todos los partidos de la
 * ronda actual del torneo ya están jugados; si es así, genera los cruces
 * de la siguiente ronda emparejando ganadores por posición de bracket, o
 * si solo queda un ganador, declara campeón y cierra el torneo.
 * Idempotente: si se llama de nuevo sin cambios, no hace nada (porque ya
 * no quedan partidos "pendiente" en la ronda actual la próxima vez que
 * se revise, dado que la ronda ya avanzó).
 */
export async function avanzarRondaSiCorresponde(torneoId: string): Promise<void> {
  const torneo = await fetchTorneo(torneoId);
  if (torneo.format !== "eliminacion_directa" || torneo.status === "finalizado") return;

  const fixture = await fetchFixture(torneoId);
  const partidosRonda = fixture.filter((m) => m.round === torneo.currentRound);
  if (partidosRonda.length === 0) return;
  const todosResueltos = partidosRonda.every((m) => m.status === "jugado" || m.status === "walkover");
  if (!todosResueltos) return;

  const ordenados = [...partidosRonda].sort(
    (a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0),
  );
  const ganadores = ordenados.map(ganadorDe);

  if (ganadores.length === 1) {
    const { error } = await supabase
      .from("torneos")
      .update({
        estado: "finalizado",
        campeon_slot_id: ganadores[0],
        finalizado_en: new Date().toISOString(),
      })
      .eq("id", torneoId);
    if (error) throw new Error(error.message);
    return;
  }

  const nuevaRonda = torneo.currentRound + 1;
  const anclaNuevaRonda = new Date();
  const filas = [];
  for (let i = 0; i < ganadores.length / 2; i++) {
    let horaProgramada: string | null = null;
    if (torneo.isOnline && torneo.modoHorario && torneo.modoHorario !== "manual") {
      const offsetHoras =
        torneo.modoHorario === "automatico_simultaneo"
          ? (torneo.intervaloHoras ?? 24)
          : (i + 1) * (torneo.intervaloHoras ?? 24);
      horaProgramada = calcularHoraProgramada({
        ancla: anclaNuevaRonda,
        offsetHoras,
        aleatorio: torneo.horarioAleatorio ?? false,
        rangoInicio: torneo.rangoHorarioInicio,
        rangoFin: torneo.rangoHorarioFin,
      }).toISOString();
    }
    filas.push({
      torneo_id: torneoId,
      ronda: nuevaRonda,
      slot_local_id: ganadores[i * 2],
      slot_visitante_id: ganadores[i * 2 + 1],
      posicion_bracket: i,
      hora_programada: horaProgramada,
    });
  }

  const { error: insertError } = await supabase.from("torneo_partidos").insert(filas);
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("torneos")
    .update({ ronda_actual: nuevaRonda })
    .eq("id", torneoId);
  if (updateError) throw new Error(updateError.message);
}

/**
 * Solo aplica a formatos de Liga (simple o ida y vuelta). Revisa si todos
 * los partidos del fixture ya están resueltos; si es así, declara campeón
 * al primero de la tabla de posiciones (mismo criterio de desempate que
 * computeStandings: puntos, luego diferencia de gol, luego goles a favor)
 * y cierra el torneo. Idempotente por el mismo motivo que
 * avanzarRondaSiCorresponde: no hace nada si ya estaba finalizado.
 */
export async function finalizarLigaSiCorresponde(torneoId: string): Promise<void> {
  const torneo = await fetchTorneo(torneoId);
  if (torneo.format === "eliminacion_directa" || torneo.status === "finalizado") return;

  const fixture = await fetchFixture(torneoId);
  if (fixture.length === 0) return;
  const todosResueltos = fixture.every((m) => m.status === "jugado" || m.status === "walkover");
  if (!todosResueltos) return;

  const slots = await fetchSlots(torneoId);
  const standings = computeStandings(slots, fixture);
  const campeonId = standings[0]?.slotId ?? null;

  const { error } = await supabase
    .from("torneos")
    .update({
      estado: "finalizado",
      campeon_slot_id: campeonId,
      finalizado_en: new Date().toISOString(),
    })
    .eq("id", torneoId);
  if (error) throw new Error(error.message);
}