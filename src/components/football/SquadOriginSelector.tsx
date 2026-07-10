'use client';
/**
 * SquadOriginSelector.tsx
 *
 * Selector del origen del plantel para cada equipo en la pantalla de configuración.
 * Tres modos que conviven sin modificar el motor del partido:
 *   1. "auto"   → generateSquad (comportamiento previo, sin cambios)
 *   2. "file"   → el usuario sube un JSON con la estructura de Player
 *   3. "api"    → busca un equipo real en API-Football
 *
 * IMPORTANTE: 'use client' es obligatorio para que import.meta.env.VITE_*
 * esté disponible en SSR (TanStack Start). Sin esta directiva, la variable
 * se evalúa en el servidor donde no existe y devuelve undefined.
 */

import { useRef, useState } from "react";
import type { Player } from "@/lib/football/types";
import { generateSquad } from "@/lib/football/players";
import { searchTeams, fetchSquad } from "@/lib/football/api-football";

type OriginMode = "auto" | "file" | "api";

interface Props {
  /** Callback invocado cuando el plantel queda listo (en cualquiera de los tres modos). */
  onSquadReady: (squad: Player[]) => void;
}

// ─── Validación de plantel cargado desde archivo ───────────────────────────────

const VALID_POSITIONS = new Set(["GK", "DEF", "MID", "FWD"]);

function validateSquad(raw: unknown): Player[] {
  if (!Array.isArray(raw)) throw new Error("El archivo debe contener un array JSON.");
  if (raw.length < 11) throw new Error(`Se necesitan al menos 11 jugadores (hay ${raw.length}).`);
  if (raw.length > 30) throw new Error(`Máximo 30 jugadores por plantel (hay ${raw.length}).`);

  return raw.map((item: unknown, i: number) => {
    if (typeof item !== "object" || item === null)
      throw new Error(`Jugador ${i + 1}: debe ser un objeto.`);
    const p = item as Record<string, unknown>;

    const name = typeof p.name === "string" && p.name.trim() ? p.name.trim() : null;
    if (!name) throw new Error(`Jugador ${i + 1}: falta "name".`);

    const pos = typeof p.position === "string" ? p.position.toUpperCase() : null;
    if (!pos || !VALID_POSITIONS.has(pos))
      throw new Error(`Jugador ${i + 1} (${name}): posición inválida "${p.position}". Valores válidos: GK, DEF, MID, FWD.`);

    const toNum = (key: string, min: number, max: number, fallback: number): number => {
      const v = Number(p[key]);
      if (isNaN(v)) return fallback;
      return Math.max(min, Math.min(max, Math.round(v)));
    };

    const attack = toNum("attack", 30, 99, 65);
    const defense = toNum("defense", 30, 99, 65);
    const physical = toNum("physical", 30, 99, 65);
    const pace = toNum("pace", 30, 99, 65);
    const overall =
      typeof p.overall === "number"
        ? toNum("overall", 30, 99, 65)
        : Math.round((attack + defense + physical + pace) / 4);

    return {
      id: `file_${i}_${Date.now().toString(36)}`,
      name,
      position: pos as Player["position"],
      overall,
      attack,
      defense,
      physical,
      pace,
      age: toNum("age", 15, 50, 25),
      nationality: typeof p.nationality === "string" ? p.nationality : "",
      historicClub: typeof p.historicClub === "string" ? p.historicClub : "",
      year: typeof p.year === "number" ? p.year : undefined,
      individualRole: "",
      stamina: 100,
      onField: false,
      redCarded: false,
      yellowCards: 0,
      injured: false,
    } satisfies Player;
  });
}

// ─── Componente principal ──────────────────────────────────────────────────────

export function SquadOriginSelector({ onSquadReady }: Props) {
  const [mode, setMode] = useState<OriginMode>("auto");

  // Estado compartido de "plantel listo"
  const [squadLabel, setSquadLabel] = useState<string | null>(null);

  function handleModeChange(m: OriginMode) {
    setMode(m);
    setSquadLabel(null);
    if (m === "auto") {
      const squad = generateSquad(20);
      onSquadReady(squad);
      setSquadLabel("Generado automáticamente (20 jugadores)");
    }
  }

  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Origen del plantel
      </label>
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { value: "auto", label: "Automático" },
            { value: "file", label: "Desde archivo" },
            { value: "api", label: "Equipo real" },
          ] as const
        ).map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleModeChange(value)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "auto" && (
        <AutoMode onReady={(label) => setSquadLabel(label)} onSquadReady={onSquadReady} />
      )}
      {mode === "file" && (
        <FileMode
          onReady={(label) => setSquadLabel(label)}
          onSquadReady={onSquadReady}
        />
      )}
      {mode === "api" && (
        <ApiMode onReady={(label) => setSquadLabel(label)} onSquadReady={onSquadReady} />
      )}

      {squadLabel && (
        <p className="mt-2 text-xs text-primary font-medium">{squadLabel}</p>
      )}
    </div>
  );
}

// ─── Modo automático ───────────────────────────────────────────────────────────

function AutoMode({
  onReady,
  onSquadReady,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
}) {
  function regenerate() {
    const squad = generateSquad(20);
    onSquadReady(squad);
    onReady("Generado automáticamente (20 jugadores)");
  }

  return (
    <div className="mt-2 text-xs text-muted-foreground flex items-center justify-between gap-2">
      <span>Se crea un plantel aleatorio con nombres y atributos generados.</span>
      <button
        type="button"
        onClick={regenerate}
        className="text-primary underline underline-offset-2 shrink-0"
      >
        Regenerar
      </button>
    </div>
  );
}

// ─── Modo archivo ──────────────────────────────────────────────────────────────

function FileMode({
  onReady,
  onSquadReady,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const squad = validateSquad(raw);
        onSquadReady(squad);
        onReady(`Plantel cargado desde archivo (${squad.length} jugadores)`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Archivo inválido.");
      }
    };
    reader.readAsText(file);
    // Limpiar el input para permitir volver a cargar el mismo archivo
    e.target.value = "";
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">
        Subí un archivo JSON con la estructura del plantel. Cada jugador debe tener:{" "}
        <code className="font-mono bg-muted px-1 rounded text-[10px]">
          name, position, overall, attack, defense, physical, pace, age
        </code>
        .
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn-secondary text-xs py-1 px-3"
        >
          Seleccionar archivo JSON
        </button>
        <a
          href="/plantilla-plantel.json"
          download="plantilla-plantel.json"
          className="text-xs text-primary underline underline-offset-2"
        >
          Descargar plantilla
        </a>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFile}
      />
      {error && (
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Modo API ──────────────────────────────────────────────────────────────────

const CURRENT_SEASON = new Date().getFullYear() - (new Date().getMonth() < 6 ? 1 : 0);

function ApiMode({
  onReady,
  onSquadReady,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: number; name: string; country: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState(CURRENT_SEASON);

  const hasApiKey = !!import.meta.env.VITE_API_FOOTBALL_KEY;

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const teams = await searchTeams(query);
      if (teams.length === 0) setError("No se encontraron equipos. Probá con otro nombre.");
      setResults(teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar equipos.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSelect(team: { id: number; name: string; country: string }) {
    setLoading(true);
    setError(null);
    try {
      const squad = await fetchSquad(team.id, team.name, season);
      onSquadReady(squad);
      onReady(`${team.name} (${season}) — ${squad.length} jugadores desde API`);
      setResults([]);
      setQuery("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el plantel.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasApiKey) {
    return (
      <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        <strong>Clave de API no configurada.</strong> Para usar esta opción, añadí la variable{" "}
        <code className="font-mono bg-black/20 px-1 rounded">VITE_API_FOOTBALL_KEY</code> con tu
        clave del plan gratuito de{" "}
        <a
          href="https://dashboard.api-football.com/register"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          API-Football
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Ej: River Plate, Barcelona, Bayern..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) handleSearch();
          }}
          disabled={searching || loading}
        />
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground text-center">Temporada</label>
          <input
            type="number"
            className="input w-20 text-sm"
            value={season}
            min={2010}
            max={CURRENT_SEASON}
            onChange={(e) => setSeason(parseInt(e.target.value) || CURRENT_SEASON)}
            disabled={searching || loading}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || loading || !query.trim()}
          className="btn-secondary text-xs py-1 px-3 self-end"
        >
          {searching ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
          {error}
        </p>
      )}

      {results.length > 0 && !loading && (
        <ul className="rounded-lg border border-border bg-background divide-y divide-border text-sm overflow-hidden">
          {results.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => handleSelect(t)}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center justify-between gap-2"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground">{t.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <p className="text-xs text-muted-foreground">Cargando plantel desde API-Football...</p>
      )}

      <p className="text-[11px] text-muted-foreground">
        Los atributos Ataque/Defensa/Físico/Velocidad se generan a partir del puesto y la valoración
        de la API. Plan gratuito: 100 peticiones/día.
      </p>
    </div>
  );
}
