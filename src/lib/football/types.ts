/**
 * 15 posiciones específicas del sistema nuevo.
 * Categorías lógicas (para formaciones, engine, etc.):
 *   POR              → arquero
 *   DFC, LI, LD, CAI, CAD  → defensores
 *   MCD, MC, MI, MD, MCO   → mediocampistas
 *   DC, SD, EI, ED         → delanteros
 */
export type Position =
  | "POR"
  | "DFC" | "LI" | "LD" | "CAI" | "CAD"
  | "MCD" | "MC" | "MI" | "MD" | "MCO"
  | "DC" | "SD" | "EI" | "ED";

/** Las 4 categorías lógicas que usa el motor internamente. */
export type PositionGroup = "GK" | "DEF" | "MID" | "FWD";

/** Mapea cada posición específica a su grupo lógico. */
export const POSITION_GROUP: Record<Position, PositionGroup> = {
  POR: "GK",
  DFC: "DEF", LI: "DEF", LD: "DEF", CAI: "DEF", CAD: "DEF",
  MCD: "MID", MC: "MID", MI: "MID", MD: "MID", MCO: "MID",
  DC: "FWD", SD: "FWD", EI: "FWD", ED: "FWD",
};
export type Style = "Ofensivo" | "Equilibrado" | "Defensivo";
export type FormationName = "4-4-2" | "4-3-3" | "3-5-2" | "4-2-3-1" | "5-3-2" | "3-4-3";
// Parámetros tácticos avanzados (ver src/lib/football/tactics.ts para sus efectos)
export type LineHeight = "Baja" | "Media" | "Alta";
export type BuildUp = "Lento" | "Equilibrado" | "Rápido";
export type PressIntensity = "Baja" | "Media" | "Alta";

export interface Player {
  id: string;
  name: string;
  position: Position;
  overall: number;
  // 6 atributos independientes (1-99)
  passing: number;   // Pase
  shooting: number;  // Tiro
  dribbling: number; // Regate
  defense: number;   // Defensa
  physical: number;  // Físico
  pace: number;      // Velocidad
  age: number;
  // Atributos exclusivos de arquero (POR). Solo presentes cuando position === "POR".
  gkDiving?: number;    // Estirada (DIV) 1-99
  gkHandling?: number;  // Paradas (PAR) 1-99
  gkKicking?: number;   // Saque (SAC) 1-99
  gkReflexes?: number;  // Reflejos (REF) 1-99
  gkPositioning?: number; // Colocación (POS) 1-99
  // Reservados para uso futuro
  nationality?: string;
  historicClub?: string;
  year?: number;
  individualRole?: string;
  // Estado dinámico
  stamina: number; // 0-100
  onField: boolean;
  redCarded: boolean;
  yellowCards: number;
  injured: boolean;
  /** Grupo del slot asignado en la formación (GK/DEF/MID/FWD). Distinto de position (específica). */
  fieldPosition?: PositionGroup;
  slotIndex?: number;
}

export interface TeamConfig {
  name: string;
  color: string;
  isBot: boolean;
}

export interface Team {
  config: TeamConfig;
  squad: Player[];
  starting: string[]; // player ids, 11
  formation: FormationName;
  style: Style;
  // Táctica avanzada
  lineHeight: LineHeight;
  buildUp: BuildUp;
  pressIntensity: PressIntensity;
  penaltyTakerId?: string;
  setPieceTakerId?: string;
  captainId?: string;
  substitutionsLeft: number;
  redCards: number;
  yellowCards: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  possession: number; // ticks
  goals: number;
  xg: number;
  saves: number; // atajadas del arquero
}

export interface PlayerMatchStats {
  playerId: string;
  goals: number;
  saves: number;
  shots: number;
  minutesPlayed: number;
  yellowCards: number;
  redCarded: boolean;
}

export interface MatchStats {
  players: Record<string, PlayerMatchStats>;
}

export interface MatchEvent {
  minute: number;
  text: string;
  kind: "info" | "goal" | "chance" | "card" | "sub" | "foul" | "corner" | "kickoff" | "final" | "insight";
  team?: 0 | 1;
}

/** Automatizaciones tácticas configurables por el usuario. Todas off por defecto. */
export interface AutomationRules {
  /** Ganando por 1 después del min 75 → lineHeight "Baja" + style "Defensivo". */
  closingDown: boolean;
  /** Rival expulsado → lineHeight "Alta". */
  exploitRedCard: boolean;
  /** Jugador propio por debajo de 60 % de stamina → notificación de sub sugerida. */
  staminaAlert: boolean;
}

export interface MatchSettings {
  injuriesEnabled: boolean;
  maxSubs: number;
  vsBot: boolean;
  automations: AutomationRules;
  /** Mostrar nombres y posiciones del plantel rival en el vestuario. Default: true. */
  seeRivalSquad: boolean;
  /** Mostrar valoraciones numéricas de los jugadores rivales. Solo aplica si seeRivalSquad es true. Default: true. */
  seeRivalRatings: boolean;
  /** Mostrar valoraciones numéricas de los propios jugadores en el vestuario. Default: true. */
  seeOwnRatings: boolean;
}
