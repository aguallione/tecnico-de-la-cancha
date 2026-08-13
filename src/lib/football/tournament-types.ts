import type {
  TeamConfig,
  Player,
  FormationName,
  Style,
  LineHeight,
  BuildUp,
  PressIntensity,
  MatchStats,
  MatchEvent,
  MatchSettings,
} from "./types";

/** Formatos de torneo soportados en esta primera pasada. */
export type TournamentFormat =
  | "liga_simple"
  | "liga_ida_vuelta"
  | "eliminacion_directa";

export type TournamentStatus = "armado" | "en_curso" | "finalizado";

export type FixtureMatchStatus = "pendiente" | "en_curso" | "jugado" | "walkover";

/**
 * Nivel de intervención de la IA "co-DT" cuando el usuario dueño de un slot
 * no está presente en un partido de torneo online que ya arrancó. "ninguna"
 * = el equipo juega con la config guardada, sin ajustes en vivo (equivalente
 * al comportamiento de resolverPartidoAutomatico hasta ahora). Solo aplica
 * a torneos online — no tiene sentido en un torneo local.
 */
export type AiInterventionLevel = "ninguna" | "poca" | "media" | "mucha";

/**
 * Un "cupo" dentro del torneo. El plantel es una foto fija tomada al
 * inscribirse (no una referencia viva al equipo guardado del usuario).
 */
export interface TournamentSlot {
  id: string;
  displayName: string;
  teamConfig: TeamConfig;
  squad: Player[];
  formation: FormationName;
  style: Style;
  lineHeight: LineHeight;
  buildUp: BuildUp;
  pressIntensity: PressIntensity;
  ownerUserId?: string;
  equipoGuardadoId?: string;
  seed: number;
  /**
   * Alineación titular guardada por el dueño del slot en el Vestuario del
   * torneo (ids de Player). Si no está seteada, o quedó inválida (por
   * ejemplo algún id ya no existe en squad), teamFromSlot recurre a
   * autoLineup como hasta ahora.
   */
  starting?: string[];
  captainId?: string;
  penaltyTakerId?: string;
  setPieceTakerId?: string;
}

/** Resultado de una tanda de penales, calculada aparte del resultado reglamentario. */
export interface TournamentPenaltyResult {
  homeGoals: number;
  awayGoals: number;
}

export interface TournamentMatchResult {
  homeGoals: number;
  awayGoals: number;
  stats: MatchStats;
  events: MatchEvent[];
  /** Solo presente si el partido era de Eliminación directa y terminó empatado. */
  penalties?: TournamentPenaltyResult;
}

export interface TournamentFixtureMatch {
  id: string;
  round: number;
  homeSlotId: string;
  awaySlotId: string;
  status: FixtureMatchStatus;
  result?: TournamentMatchResult;
  partidaOnlineId?: string;
  bracketPosition?: number;
  /** Solo para torneos online con modo de horario automático. Ausente en modo manual o en torneos locales. */
  scheduledAt?: string;
}

export interface TournamentStandingRow {
  slotId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  slots: TournamentSlot[];
  fixture: TournamentFixtureMatch[];
  /** Presente solo si el formato es de tipo liga. */
  standings?: TournamentStandingRow[];
  /**
   * Cantidad de equipos que el creador quiere que tenga el torneo (elegida
   * al armarlo). Solo se usa mientras status es "armado", para saber cuántos
   * cupos faltan completar. Una vez arrancado el torneo, la cantidad real de
   * equipos es slots.length — este campo ya no se vuelve a leer.
   */
  targetSlotCount: number;
  currentRound: number;
  totalRounds: number;
  isOnline: boolean;
  roomCode?: string;
  /** Solo tiene sentido si isOnline es true. Configuración de cómo se asignan los horarios de los partidos. */
  modoHorario?: "manual" | "automatico_simultaneo" | "automatico_escalonado";
  horarioAleatorio?: boolean;
  rangoHorarioInicio?: string;
  rangoHorarioFin?: string;
  intervaloHoras?: number;
  /** Solo tiene sentido si isOnline es true. Elegido al crear el torneo, no se puede cambiar después de arrancado. */
  aiInterventionLevel?: AiInterventionLevel;
  createdByUserId: string;
  matchSettingsTemplate: MatchSettings;
  createdAt: string;
  finishedAt?: string;
  championSlotId?: string;
}