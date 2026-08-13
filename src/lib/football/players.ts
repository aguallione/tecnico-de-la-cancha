import type { Player, Position, PositionGroup } from "./types";
import { POSITION_GROUP } from "./types";
import { computePlayerPositionRating } from "./engine";

const FIRST = [
  "Juan","Diego","Carlos","Martín","Facundo","Nicolás","Sebastián","Lucas","Mateo","Franco",
  "Emiliano","Rodrigo","Iván","Alejandro","Gonzalo","Pablo","Julián","Bruno","Cristian","Leonardo",
  "Agustín","Tomás","Santiago","Ezequiel","Fernando","Ricardo","Marcelo","Andrés","Hernán","Damián",
  "Maximiliano","Federico","Gastón","Ignacio","Jorge","Manuel","Nahuel","Óscar","Rafael","Sergio",
];
const LAST = [
  "Gómez","Fernández","López","Rodríguez","Martínez","Pérez","García","Sánchez","Romero","Silva",
  "Álvarez","Torres","Ramírez","Vázquez","Ruiz","Molina","Ortiz","Castro","Herrera","Ríos",
  "Medina","Aguirre","Sosa","Benítez","Cabrera","Núñez","Ibarra","Acuña","Vega","Peralta",
  "Correa","Cardozo","Ferreira","Godoy","Ledesma","Villalba","Ojeda","Quiroga","Salazar","Toledo",
];

let counter = 0;
export function uid(): string {
  counter++;
  return `p_${Date.now().toString(36)}_${counter}_${Math.random().toString(36).slice(2, 7)}`;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
const clamp = (n: number) => Math.max(30, Math.min(99, n));

/** Valor aleatorio como fracción de `base` (ej: fracOf(75, 0.6, 0.7) da algo entre 45 y 52). */
function fracOf(base: number, loFrac: number, hiFrac: number): number {
  return clamp(Math.round(base * (loFrac + Math.random() * (hiFrac - loFrac))));
}

function attributesFor(pos: Position, base: number) {
  const group: PositionGroup = POSITION_GROUP[pos];

  if (group === "GK") {
    // Los arqueros son deliberadamente flojos como jugadores de campo — su
    // calidad real está en sus 5 atributos de arquero, no acá. Cada atributo
    // de campo es una fracción de `base`, no un promedio simple, para que un
    // arquero nunca rinda como un defensor o delantero real jugando de campo.
    const base6 = {
      passing: fracOf(base, 0.60, 0.70),   // cerca de dos tercios
      shooting: fracOf(base, 0.28, 0.38),  // cerca de un tercio
      dribbling: fracOf(base, 0.60, 0.70), // cerca de dos tercios
      defense: fracOf(base, 0.18, 0.25),   // un cuarto o un poco menos
      physical: fracOf(base, 0.65, 0.75),  // entre dos tercios y tres cuartos
      pace: fracOf(base, 0.45, 0.55),      // cerca de la mitad
    };
    return {
      ...base6,
      gkDiving: clamp(base + rand(-6, 10)),
      gkHandling: clamp(base + rand(-6, 10)),
      gkKicking: clamp(base + rand(-10, 6)),
      gkReflexes: clamp(base + rand(-6, 10)),
      gkPositioning: clamp(base + rand(-6, 8)),
    };
  }

  const jitter = () => rand(-8, 8);
  let passing = base + jitter();
  let shooting = base + jitter();
  let dribbling = base + jitter();
  let defense = base + jitter();
  let physical = base + jitter();
  let pace = base + jitter();
  switch (group) {
    case "DEF":
      defense += 10; shooting -= 10; dribbling -= 6; passing -= 2;
      break;
    case "MID":
      passing += 6; dribbling += 2;
      break;
    case "FWD":
      shooting += 10; dribbling += 8; defense -= 10; pace += 4; passing += 2;
      break;
  }
  return {
    passing: clamp(passing),
    shooting: clamp(shooting),
    dribbling: clamp(dribbling),
    defense: clamp(defense),
    physical: clamp(physical),
    pace: clamp(pace),
  };
}

/**
 * Distribución de 23 slots (recortada al tamaño pedido):
 * 3 POR, 2 DFC, 1 LI, 1 LD, 1 CAI, 1 CAD, 1 MCD, 2 MC, 1 MI, 1 MD, 1 MCO,
 * 2 DC, 1 SD, 1 EI, 1 ED → total 20 base.
 * Para size > 20 se repiten los puestos de campo más comunes.
 */
const SQUAD_TEMPLATE: Position[] = [
  "POR", "POR", "POR",
  "DFC", "DFC", "LI", "LD", "CAI", "CAD",
  "MCD", "MC", "MC", "MI", "MD", "MCO",
  "DC", "DC", "SD", "EI", "ED",
  // Extra slots si size > 20
  "MC", "DFC", "SD",
];

export function generateSquad(size = 20): Player[] {
  const positions = SQUAD_TEMPLATE.slice(0, size) as Position[];
  return positions.map((pos) => {
    const base = rand(55, 88);
    const attrs = attributesFor(pos, base);
    const isGK = POSITION_GROUP[pos] === "GK";
    // Para arqueros, la valoración general sale de sus atributos de arquero
    // (misma fórmula que usa todo el resto del juego), no del promedio de
    // los 6 atributos de campo, que ahora son deliberadamente bajos.
    const overall = isGK
      ? computePlayerPositionRating({ ...attrs, position: pos } as Player, "POR")
      : Math.round((attrs.passing + attrs.shooting + attrs.dribbling + attrs.defense + attrs.physical + attrs.pace) / 6);
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    return {
      id: uid(),
      name,
      position: pos,
      overall,
      ...attrs,
      age: rand(17, 36),
      nationality: "",
      historicClub: "",
      year: undefined,
      individualRole: "",
      stamina: 100,
      onField: false,
      redCarded: false,
      yellowCards: 0,
      injured: false,
    };
  }).sort((a, b) => b.overall - a.overall);
}