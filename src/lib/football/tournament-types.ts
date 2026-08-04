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

export type FixtureMatchStatus = "pendiente" | "jugado" | "walkover";

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
  createdByUserId: string;
  matchSettingsTemplate: MatchSettings;
  createdAt: string;
  finishedAt?: string;
  championSlotId?: string;
}