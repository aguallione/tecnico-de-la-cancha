import type { Player, Position, Team } from "./types";

/**
 * =========================================================================
 * TABLAS DE AJUSTE TÁCTICO (todas configurables desde acá, no hardcodeadas
 * en el motor). Cada valor `attack` / `defense` es un ajuste ADITIVO a los
 * Niveles de Ataque / Defensa que el motor ya calcula. Ajustar acá para
 * afinar el balance del juego sin tocar la lógica de simulación.
 * =========================================================================
 */

export type LineHeight = "Baja" | "Media" | "Alta";
export type BuildUp = "Lento" | "Equilibrado" | "Rápido";
export type PressIntensity = "Baja" | "Media" | "Alta";

/** Factor global que atenúa la suma de efectos de rol para que sean "leves". */
export const ROLE_SCALE = 0.4;

/** Límite (en puntos de nivel) del aporte total de los roles, para mantenerlo acotado. */
export const ROLE_ADJ_CAP = 12;

export interface RoleEffect {
  /** Ajuste al aporte del jugador al Nivel de Ataque del equipo. */
  attack: number;
  /** Ajuste al aporte del jugador al Nivel de Defensa del equipo. */
  defense: number;
  /** Posición base a la que aplica el rol. */
  position: Position;
  /** Subgrupo dentro de la posición (ej. Lateral / Central para defensores). */
  group?: string;
  /** Descripción corta del efecto para mostrar en la UI. */
  blurb: string;
}

/**
 * Roles individuales por posición. El nombre del rol es la clave.
 * Un jugador sin rol asignado no recibe ningún ajuste (efecto neutro).
 */
export const ROLE_TABLE: Record<string, RoleEffect> = {
  // --- Defensor lateral ---
  "Lateral Clásico": { position: "DEF", group: "Lateral", attack: 0, defense: 3, blurb: "Prioriza la marca" },
  "Carrilero": { position: "DEF", group: "Lateral", attack: 3, defense: 0, blurb: "Sube y baja por la banda" },
  "Carrilero Ofensivo": { position: "DEF", group: "Lateral", attack: 6, defense: -4, blurb: "Ataca, deja espacios atrás" },
  "Lateral Invertido": { position: "DEF", group: "Lateral", attack: 3, defense: 1, blurb: "Se mete al medio, equilibrado" },
  // --- Defensor central ---
  "Central Defensivo": { position: "DEF", group: "Central", attack: -2, defense: 6, blurb: "Muro atrás" },
  "Central que sale jugando": { position: "DEF", group: "Central", attack: 4, defense: -1, blurb: "Inicia el juego desde el fondo" },
  // --- Mediocampista ---
  "Organizador": { position: "MID", attack: 4, defense: -1, blurb: "Maneja los tiempos y crea" },
  "Box to Box": { position: "MID", attack: 3, defense: 3, blurb: "Cubre toda la cancha" },
  "Recuperador": { position: "MID", attack: -2, defense: 6, blurb: "Corta y protege la defensa" },
  "Pivote": { position: "MID", attack: 1, defense: 4, blurb: "Ancla frente a la zaga" },
  "Enganche": { position: "MID", attack: 7, defense: -3, blurb: "Toda la creación ofensiva" },
  // --- Delantero ---
  "Hombre de Área": { position: "FWD", attack: 5, defense: -2, blurb: "Definidor puro en el área" },
  "Delantero Móvil": { position: "FWD", attack: 4, defense: 0, blurb: "Se mueve por todo el frente" },
  "Falso 9": { position: "FWD", attack: 3, defense: 2, blurb: "Baja a recibir y asociar" },
  "Cazador del Área": { position: "FWD", attack: 6, defense: -3, blurb: "Vive del gol, poca ayuda" },
  "Presionador": { position: "FWD", attack: 2, defense: 4, blurb: "Presiona la salida rival" },
};

/** Altura de la línea defensiva: alta = más ataque/menos defensa, baja = al revés. */
export const LINE_HEIGHT_TABLE: Record<LineHeight, { attack: number; defense: number; blurb: string }> = {
  Baja: { attack: -3, defense: 5, blurb: "Repliegue: más solidez, menos peso ofensivo" },
  Media: { attack: 0, defense: 0, blurb: "Línea equilibrada" },
  Alta: { attack: 5, defense: -5, blurb: "Presión alta: más ataque, más espacio atrás" },
};

/**
 * Estilo de salida (build-up).
 * - `possession`: sesgo (en puntos porcentuales aprox.) a la posesión estimada.
 * - `riskGoalProb`: ajuste directo a la probabilidad de gol por ocasión propia
 *   (rápido = ataques más directos y arriesgados; lento = más control, menos riesgo).
 */
export const BUILDUP_TABLE: Record<BuildUp, { possession: number; riskGoalProb: number; blurb: string }> = {
  Lento: { possession: 8, riskGoalProb: -0.03, blurb: "Más posesión, menos riesgo" },
  Equilibrado: { possession: 0, riskGoalProb: 0, blurb: "Salida equilibrada" },
  Rápido: { possession: -8, riskGoalProb: 0.04, blurb: "Menos posesión, ataques directos" },
};

/**
 * Intensidad de presión.
 * - `eventBonus`: se suma a la probabilidad de que ocurra una ocasión por minuto.
 * - `staminaDrain`: multiplicador del desgaste físico por minuto.
 */
export const PRESS_TABLE: Record<PressIntensity, { eventBonus: number; staminaDrain: number; blurb: string }> = {
  Baja: { eventBonus: -0.01, staminaDrain: 0.85, blurb: "Menos ocasiones, menos cansancio" },
  Media: { eventBonus: 0, staminaDrain: 1.0, blurb: "Presión equilibrada" },
  Alta: { eventBonus: 0.03, staminaDrain: 1.35, blurb: "Recupera arriba, cansa más rápido" },
};

/** Devuelve el efecto de un rol, o efecto neutro si no tiene rol asignado. */
export function roleEffect(roleName: string | undefined): { attack: number; defense: number } {
  if (!roleName) return { attack: 0, defense: 0 };
  const e = ROLE_TABLE[roleName];
  if (!e) return { attack: 0, defense: 0 };
  return { attack: e.attack, defense: e.defense };
}

/** Lista ordenada de roles disponibles para una posición (vacía para GK). */
export function rolesForPosition(pos: Position): string[] {
  return Object.keys(ROLE_TABLE).filter((k) => ROLE_TABLE[k].position === pos);
}

/** Subgrupo de un rol (ej. "Lateral" / "Central"), si aplica. */
export function roleGroup(roleName: string | undefined): string | undefined {
  if (!roleName) return undefined;
  return ROLE_TABLE[roleName]?.group;
}

/**
 * Ajuste táctico agregado del equipo (roles individuales + altura de línea).
 * Se aplica ADITIVAMENTE a los Niveles de Ataque y Defensa que ya calcula el
 * motor. Es la ÚNICA función que traduce las tablas de arriba a números; tanto
 * la simulación en vivo como la previa la usan, para no tener cálculos paralelos.
 */
export function teamTacticalAdjustment(
  team: Team,
  onFieldStarters: Player[],
): { attack: number; defense: number } {
  let atk = 0;
  let def = 0;
  for (const p of onFieldStarters) {
    // Un rol solo aporta si corresponde a la posición que el jugador ocupa EN CANCHA.
    // Así, si alguien cambia de puesto, un rol viejo incompatible se ignora
    // automáticamente y la UI (que muestra roles por posición de cancha) nunca
    // queda desincronizada del cálculo del motor.
    const e = p.individualRole ? ROLE_TABLE[p.individualRole] : undefined;
    if (!e || e.position !== p.fieldPosition) continue;
    atk += e.attack;
    def += e.defense;
  }
  atk *= ROLE_SCALE;
  def *= ROLE_SCALE;
  // Acotar el aporte de los roles para que nunca domine sobre el nivel real.
  atk = Math.max(-ROLE_ADJ_CAP, Math.min(ROLE_ADJ_CAP, atk));
  def = Math.max(-ROLE_ADJ_CAP, Math.min(ROLE_ADJ_CAP, def));

  const lh = LINE_HEIGHT_TABLE[team.lineHeight ?? "Media"];
  atk += lh.attack;
  def += lh.defense;

  return { attack: atk, defense: def };
}
