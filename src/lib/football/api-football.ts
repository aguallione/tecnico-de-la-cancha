/**
 * api-football.ts
 * Integración con API-Football (api-sports.io) — plan gratuito.
 * Mapea los datos de la API a la estructura Player usada por el juego.
 *
 * Requiere la variable de entorno VITE_API_FOOTBALL_KEY con la API key del plan gratuito.
 * Si la clave no está configurada, las llamadas devuelven un error descriptivo.
 */

import type { Player, Position } from "./types";
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

/** Traduce la posición de la API al tipo Position del juego. */
function mapPosition(apiPos: string | null | undefined): Position {
  if (!apiPos) return "MID";
  const p = apiPos.toLowerCase();
  if (p.includes("goalkeeper") || p === "g") return "GK";
  if (p.includes("defender") || p === "d") return "DEF";
  if (p.includes("midfielder") || p === "m") return "MID";
  if (p.includes("attacker") || p.includes("forward") || p === "f") return "FWD";
  return "MID";
}

/**
 * Genera los atributos de un jugador a partir de su posición y valoración general.
 * Los atributos Attack/Defense/Physical/Pace no existen en la API, así que se
 * derivan del overall con variación aleatoria coherente por puesto.
 */
function deriveAttributes(pos: Position, overall: number) {
  const jitter = () => Math.floor(Math.random() * 13) - 6; // ±6
  let attack = overall + jitter();
  let defense = overall + jitter();
  let physical = overall + jitter();
  let pace = overall + jitter();

  switch (pos) {
    case "GK":
      defense += 8;
      attack -= 22;
      pace -= 8;
      break;
    case "DEF":
      defense += 9;
      attack -= 9;
      break;
    case "MID":
      // Equilibrado — sin ajuste base
      break;
    case "FWD":
      attack += 10;
      defense -= 10;
      pace += 5;
      break;
  }

  const clamp = (n: number) => Math.max(30, Math.min(99, n));
  return {
    attack: clamp(attack),
    defense: clamp(defense),
    physical: clamp(physical),
    pace: clamp(pace),
  };
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
        (attrs.attack + attrs.defense + attrs.physical + attrs.pace) / 4,
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

  // Asegurar distribución mínima (al menos 1 GK)
  const hasGK = players.some((p) => p.position === "GK");
  if (!hasGK && players.length > 0) {
    players[0].position = "GK";
  }

  return players.sort((a, b) => b.overall - a.overall);
}
