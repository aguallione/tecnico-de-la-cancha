import type { Player, Position, PositionGroup } from "./types";
import { POSITION_GROUP } from "./types";

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

function attributesFor(pos: Position, base: number) {
  const jitter = () => rand(-8, 8);
  let passing = base + jitter();
  let shooting = base + jitter();
  let dribbling = base + jitter();
  let defense = base + jitter();
  let physical = base + jitter();
  let pace = base + jitter();
  const group: PositionGroup = POSITION_GROUP[pos];
  switch (group) {
    case "GK":
      defense += 12; shooting -= 25; pace -= 8; passing -= 6; dribbling -= 18; physical += 4;
      break;
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
  const clamp = (n: number) => Math.max(30, Math.min(99, n));
  const base6 = {
    passing: clamp(passing),
    shooting: clamp(shooting),
    dribbling: clamp(dribbling),
    defense: clamp(defense),
    physical: clamp(physical),
    pace: clamp(pace),
  };
  // Atributos exclusivos de arquero
  if (group === "GK") {
    return {
      ...base6,
      gkDiving: clamp(base + rand(-6, 10)),
      gkHandling: clamp(base + rand(-6, 10)),
      gkKicking: clamp(base + rand(-10, 6)),
      gkReflexes: clamp(base + rand(-6, 10)),
      gkPositioning: clamp(base + rand(-6, 8)),
    };
  }
  return base6;
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
    const overall = Math.round(
      (attrs.passing + attrs.shooting + attrs.dribbling + attrs.defense + attrs.physical + attrs.pace) / 6,
    );
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
