export type Position = "GK" | "DEF" | "MID" | "FWD";
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
  attack: number;
  defense: number;
  physical: number;
  pace: number;
  age: number;
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
  fieldPosition?: Position; // posición asignada en la alineación
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
  kind: "info" | "goal" | "chance" | "card" | "sub" | "foul" | "corner" | "kickoff" | "final";
  team?: 0 | 1;
}

export interface MatchSettings {
  injuriesEnabled: boolean;
  maxSubs: number;
  vsBot: boolean;
}
