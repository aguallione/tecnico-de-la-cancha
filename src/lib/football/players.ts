import type { Player, Position } from "./types";

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
  let attack = base + jitter();
  let defense = base + jitter();
  let physical = base + jitter();
  let pace = base + jitter();
  switch (pos) {
    case "GK": defense += 6; attack -= 20; pace -= 6; break;
    case "DEF": defense += 8; attack -= 8; break;
    case "MID": /* balanced */ break;
    case "FWD": attack += 8; defense -= 8; pace += 4; break;
  }
  const clamp = (n: number) => Math.max(30, Math.min(99, n));
  return { attack: clamp(attack), defense: clamp(defense), physical: clamp(physical), pace: clamp(pace) };
}

export function generateSquad(size = 20): Player[] {
  // Distribución: 3 GK, 7 DEF, 7 MID, 6 FWD por defecto (recortada al tamaño)
  const template: Position[] = [
    "GK","GK","GK",
    "DEF","DEF","DEF","DEF","DEF","DEF","DEF",
    "MID","MID","MID","MID","MID","MID","MID",
    "FWD","FWD","FWD","FWD","FWD","FWD",
  ];
  const positions = template.slice(0, size);
  return positions.map((pos) => {
    const base = rand(55, 88);
    const attrs = attributesFor(pos, base);
    const overall = Math.round((attrs.attack + attrs.defense + attrs.physical + attrs.pace) / 4);
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
