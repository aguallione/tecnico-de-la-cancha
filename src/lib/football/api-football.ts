/**
 * api-football.ts
 * Integración con API-Football (api-sports.io) — plan gratuito.
 * Mapea los datos de la API a la estructura Player usada por el juego.
 *
 * Requiere la variable de entorno VITE_API_FOOTBALL_KEY con la API key del plan gratuito.
 * Si la clave no está configurada, las llamadas devuelven un error descriptivo.
 */

import type { Player, Position } from "./types";
import { POSITION_GROUP } from "./types";
import { uid } from "./players";

const BASE_URL = "https://v3.football.api-sports.io";
// La clave se expone del lado del cliente (solo lectura, plan gratuito con límite de 100 req/día).
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY as string | undefined;

/** Respuesta cruda del endpoint /teams?search=... */
interface ApiTeam {
  team: { id: number; name: string; country: string };
  venue: { city: string };
}

/** Respuesta cruda del endpoint /players?team=...&season=... */
interface ApiPlayer {
  player: {
    id: number;
    name: string;
    age: number;
    nationality: string;
  };
  statistics: Array<{
    team: { name: string };
    games: { position: string | null; rating: string | null };
  }>;
}

// ─── Mapeos ────────────────────────────────────────────────────────────────────

/** Traduce la posición de la API al tipo Position del juego (posiciones específicas). */
function mapPosition(apiPos: string | null | undefined): Position {
  if (!apiPos) return "MC";
  const p = apiPos.toLowerCase();
  if (p.includes("goalkeeper") || p === "g") return "POR";
  if (p.includes("defender") || p === "d") return "DFC";
  if (p.includes("midfielder") || p === "m") return "MC";
  if (p.includes("attacker") || p.includes("forward") || p === "f") return "DC";
  return "MC";
}

/**
 * Genera los 6 atributos de un jugador a partir de su posición y valoración general.
 * Los atributos no existen en la API, así que se derivan del overall con variación
 * aleatoria coherente por puesto.
 */
function deriveAttributes(pos: Position, overall: number) {
  const jitter = () => Math.floor(Math.random() * 13) - 6; // ±6
  let passing = overall + jitter();
  let shooting = overall + jitter();
  let dribbling = overall + jitter();
  let defense = overall + jitter();
  let physical = overall + jitter();
  let pace = overall + jitter();

  const group = POSITION_GROUP[pos];
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
  if (group === "GK") {
    return {
      ...base6,
      gkDiving: clamp(overall + Math.round(Math.random() * 10 - 4)),
      gkHandling: clamp(overall + Math.round(Math.random() * 10 - 4)),
      gkKicking: clamp(overall + Math.round(Math.random() * 8 - 5)),
      gkReflexes: clamp(overall + Math.round(Math.random() * 10 - 4)),
      gkPositioning: clamp(overall + Math.round(Math.random() * 8 - 3)),
    };
  }
  return base6;
}

/** Convierte el rating string de la API ("7.45") en un overall 30–99. */
function ratingToOverall(rating: string | null | undefined, pos: Position): number {
  if (!rating) {
    // Sin rating: generar uno razonable según posición
    const base: Record<Position, number> = { GK: 72, DEF: 70, MID: 71, FWD: 72 };
    return base[pos] + Math.floor(Math.random() * 10) - 5;
  }
  const r = parseFloat(rating);
  if (isNaN(r)) return 70;
  // La API devuelve entre ~5.0 y ~9.5 → escalar a 50–95
  const scaled = Math.round(50 + ((r - 5) / 4.5) * 45);
  return Math.max(30, Math.min(99, scaled));
}

// ─── Funciones públicas ────────────────────────────────────────────────────────

/** Busca equipos por nombre. Devuelve lista de { id, name, country }. */
export async function searchTeams(
  query: string,
): Promise<Array<{ id: number; name: string; country: string }>> {
  if (!API_KEY) throw new Error("Falta la clave VITE_API_FOOTBALL_KEY en las variables de entorno.");
  if (!query.trim()) return [];

  const res = await fetch(`${BASE_URL}/teams?search=${encodeURIComponent(query)}`, {
    headers: { "x-apisports-key": API_KEY },
  });
  if (!res.ok) throw new Error(`Error de API (${res.status}): ${res.statusText}`);

  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    const msg = Object.values(json.errors).join(", ");
    throw new Error(`Error de API-Football: ${msg}`);
  }

  return (json.response as ApiTeam[]).slice(0, 10).map((t) => ({
    id: t.team.id,
    name: t.team.name,
    country: t.team.country,
  }));
}

/** Descarga el plantel actual de un equipo (temporada pasada o la más reciente). */
export async function fetchSquad(
  teamId: number,
  teamName: string,
  season: number,
): Promise<Player[]> {
  if (!API_KEY) throw new Error("Falta la clave VITE_API_FOOTBALL_KEY en las variables de entorno.");

  const res = await fetch(
    `${BASE_URL}/players?team=${teamId}&season=${season}&page=1`,
    { headers: { "x-apisports-key": API_KEY } },
  );
  if (!res.ok) throw new Error(`Error de API (${res.status}): ${res.statusText}`);

  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    const msg = Object.values(json.errors).join(", ");
    throw new Error(`Error de API-Football: ${msg}`);
  }

  const rawPlayers: ApiPlayer[] = json.response ?? [];

  // Puede haber varias páginas; para el plan gratuito tomamos solo la primera (20 jugadores)
  // y filtramos los que tienen estadísticas válidas.
  const players: Player[] = rawPlayers
    .filter((rp) => rp.statistics && rp.statistics.length > 0)
    .map((rp) => {
      const stats = rp.statistics[0];
      const pos = mapPosition(stats.games.position);
      const overall = ratingToOverall(stats.games.rating, pos);
      const attrs = deriveAttributes(pos, overall);
      const computedOverall = Math.round(
        (attrs.passing + attrs.shooting + attrs.dribbling + attrs.defense + attrs.physical + attrs.pace) / 6,
      );

      return {
        id: uid(),
        name: rp.player.name,
        position: pos,
        overall: computedOverall,
        ...attrs,
        age: rp.player.age ?? 25,
        nationality: rp.player.nationality ?? "",
        historicClub: teamName,
        year: season,
        individualRole: "",
        stamina: 100,
        onField: false,
        redCarded: false,
        yellowCards: 0,
        injured: false,
      } satisfies Player;
    });

  if (players.length === 0) {
    throw new Error(
      `No se encontraron jugadores para la temporada ${season}. Probá con ${season - 1}.`,
    );
  }

  // Asegurar distribución mínima (al menos 1 POR)
  const hasGK = players.some((p) => p.position === "POR");
  if (!hasGK && players.length > 0) {
    players[0].position = "POR";
    if (!players[0].gkDiving) {
      const gkOverall = players[0].overall;
      players[0].gkDiving = Math.max(1, Math.min(99, gkOverall + Math.round(Math.random() * 10 - 4)));
      players[0].gkHandling = Math.max(1, Math.min(99, gkOverall + Math.round(Math.random() * 10 - 4)));
      players[0].gkKicking = Math.max(1, Math.min(99, gkOverall + Math.round(Math.random() * 8 - 5)));
      players[0].gkReflexes = Math.max(1, Math.min(99, gkOverall + Math.round(Math.random() * 10 - 4)));
      players[0].gkPositioning = Math.max(1, Math.min(99, gkOverall + Math.round(Math.random() * 8 - 3)));
    }
  }

  return players.sort((a, b) => b.overall - a.overall);
}
