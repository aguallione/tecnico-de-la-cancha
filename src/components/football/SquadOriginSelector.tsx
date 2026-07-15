'use client';
/**
 * SquadOriginSelector.tsx
 *
 * Selector del origen del plantel. Cinco modos:
 *   1. "auto"    → generateSquad (sin cambios)
 *   2. "file"    → sube JSON → requiere sesión para guardar en Supabase
 *   3. "saved"   → lista equipos del usuario autenticado en Supabase
 *   4. "api"     → busca equipo real en API-Football
 *   5. "create"  → crear jugadores manualmente uno por uno
 *
 * IMPORTANTE: 'use client' es obligatorio para que import.meta.env.VITE_*
 * esté disponible en SSR (TanStack Start).
 */

import { useRef, useState } from "react";
import { Trash2, RefreshCw, LogIn, Plus } from "lucide-react";
import type { Player } from "@/lib/football/types";
import { generateSquad } from "@/lib/football/players";
import { migrateSquadFull } from "@/lib/football/migration";
import { searchTeams, fetchSquad } from "@/lib/football/api-football";
import { useEquiposGuardados } from "@/hooks/use-equipos-guardados";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/football/AuthModal";
import { CreatePlayerScreen } from "@/components/football/CreatePlayerScreen";

type OriginMode = "auto" | "file" | "saved" | "api" | "create";

interface Props {
  onSquadReady: (squad: Player[]) => void;
}

// ─── Validación de plantel cargado desde archivo ───────────────────────────────

/** Posiciones específicas válidas (sistema nuevo de 15) más los alias del sistema viejo (4). */
const VALID_POSITIONS = new Set([
  // Sistema nuevo (15)
  "POR",
  "DFC", "LI", "LD", "CAI", "CAD",
  "MCD", "MC", "MI", "MD", "MCO",
  "DC", "SD", "EI", "ED",
  // Aliases viejos que se migran automáticamente
  "GK", "DEF", "MID", "FWD",
]);

/** Mapeo de posiciones viejas (4) a posiciones nuevas (15) para JSON importados. */
const LEGACY_POS_MAP: Record<string, Player["position"]> = {
  GK: "POR", DEF: "DFC", MID: "MC", FWD: "DC",
};

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

    const rawPos = typeof p.position === "string" ? p.position.toUpperCase() : null;
    if (!rawPos || !VALID_POSITIONS.has(rawPos))
      throw new Error(
        `Jugador ${i + 1} (${name}): posición inválida "${p.position}". Válidos: POR, DFC, LI, LD, CAI, CAD, MCD, MC, MI, MD, MCO, DC, SD, EI, ED.`,
      );
    // Migrar posición vieja → nueva si es alias legacy
    const pos: Player["position"] = (LEGACY_POS_MAP[rawPos] ?? rawPos) as Player["position"];

    const toNum = (key: string, min: number, max: number, fallback: number): number => {
      const v = Number(p[key]);
      if (isNaN(v)) return fallback;
      return Math.max(min, Math.min(max, Math.round(v)));
    };

    const passing = toNum("passing", 1, 99, 65);
    const shooting = toNum("shooting", 1, 99, 65);
    const dribbling = toNum("dribbling", 1, 99, 65);
    const defense = toNum("defense", 1, 99, 65);
    const physical = toNum("physical", 1, 99, 65);
    const pace = toNum("pace", 1, 99, 65);
    const overall =
      typeof p.overall === "number"
        ? toNum("overall", 1, 99, 65)
        : Math.round((passing + shooting + dribbling + defense + physical + pace) / 6);

    return {
      id: `file_${i}_${Date.now().toString(36)}`,
      name,
      position: pos,
      overall,
      passing,
      shooting,
      dribbling,
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
  const [squadLabel, setSquadLabel] = useState<string | null>(null);

  // El hook se monta siempre para que la lista esté lista al cambiar de tab.
  const db = useEquiposGuardados();

  function handleModeChange(m: OriginMode) {
    setMode(m);
    setSquadLabel(null);
    if (m === "auto") {
      const squad = generateSquad(20);
      onSquadReady(squad);
      setSquadLabel("Generado automáticamente (20 jugadores)");
    }
    if (m === "saved") {
      db.refrescar();
    }
  }

  const tabs: { value: OriginMode; label: string }[] = [
    { value: "auto", label: "Automático" },
    { value: "file", label: "Desde archivo" },
    { value: "saved", label: "Mis equipos" },
    { value: "api", label: "Equipo real" },
    { value: "create", label: "Crear jugador" },
  ];

  return (
    <div className="mt-3">
      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Origen del plantel
      </label>

      {/* Selector de tabs — grid de 2/3 columnas */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 rounded-lg bg-muted p-1">
        {tabs.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => handleModeChange(value)}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
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
        <AutoMode onReady={setSquadLabel} onSquadReady={onSquadReady} />
      )}
      {mode === "file" && (
        <FileMode onReady={setSquadLabel} onSquadReady={onSquadReady} db={db} />
      )}
      {mode === "saved" && (
        <SavedMode onReady={setSquadLabel} onSquadReady={onSquadReady} db={db} />
      )}
      {mode === "api" && (
        <ApiMode onReady={setSquadLabel} onSquadReady={onSquadReady} />
      )}
      {mode === "create" && (
        <CreateMode onReady={setSquadLabel} onSquadReady={onSquadReady} />
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
  db,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
  db: ReturnType<typeof useEquiposGuardados>;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [pendingSquad, setPendingSquad] = useState<Player[] | null>(null);

  // Auth modal — se abre cuando el usuario intenta guardar sin sesión
  const [authModalOpen, setAuthModalOpen] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setSaveError(null);
    setSavedOk(false);
    setPendingSquad(null);

    const suggested = file.name.replace(/\.json$/i, "").replace(/[-_]/g, " ").trim();
    setTeamName(suggested);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const squad = validateSquad(raw);
        setPendingSquad(squad);
        onSquadReady(squad);
        onReady(`Plantel cargado desde archivo (${squad.length} jugadores)`);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Archivo inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleSave() {
    if (!pendingSquad || !teamName.trim()) return;

    // Gate: si no hay sesión, abrir modal de auth
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    await doSave();
  }

  async function doSave() {
    if (!pendingSquad || !teamName.trim()) return;
    setSaving(true);
    setSaveError(null);
    const result = await db.guardar(teamName.trim(), pendingSquad);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error ?? "Error al guardar.");
    } else {
      setSavedOk(true);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-muted-foreground">
        Subí un JSON con el plantel. Cada jugador necesita:{" "}
        <code className="font-mono bg-muted px-1 rounded text-[10px]">
          name, position, overall, passing, shooting, dribbling, defense, physical, pace, age
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

      {parseError && (
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
          {parseError}
        </p>
      )}

      {/* Panel de guardado — visible tras parsear exitosamente */}
      {pendingSquad && !parseError && (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <p className="text-xs font-medium text-foreground">Guardar en Mis equipos</p>
          {!user && (
            <p className="text-[11px] text-muted-foreground">
              Necesitás una cuenta para guardar equipos.
            </p>
          )}
          <div className="flex gap-2">
            <input
              className="input flex-1 text-xs"
              placeholder="Nombre del equipo"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setSavedOk(false);
              }}
              disabled={saving || savedOk}
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || savedOk || !teamName.trim()}
              className="btn-primary text-xs py-1 px-3 shrink-0 disabled:opacity-50 flex items-center gap-1"
            >
              {!user && <LogIn size={12} />}
              {saving ? "Guardando..." : savedOk ? "Guardado" : user ? "Guardar" : "Guardar"}
            </button>
          </div>
          {saveError && (
            <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
              {saveError}
            </p>
          )}
          {savedOk && (
            <p className="text-xs text-primary">
              Equipo guardado. Podés cargarlo desde "Mis equipos" en el futuro.
            </p>
          )}
        </div>
      )}

      {/* Modal de auth */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          // Reintentar el guardado ahora que hay sesión
          doSave();
        }}
        reason="Para guardar equipos necesitás iniciar sesión o crear una cuenta. Es gratis."
      />
    </div>
  );
}

// ─── Modo equipos guardados ────────────────────────────────────────────────────

function SavedMode({
  onReady,
  onSquadReady,
  db,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
  db: ReturnType<typeof useEquiposGuardados>;
}) {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Si no hay sesión, mostrar gate de login
  if (!user) {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-4 text-center space-y-3">
        <p className="text-sm text-foreground font-medium">
          Tus equipos guardados están protegidos por tu cuenta
        </p>
        <p className="text-xs text-muted-foreground">
          Iniciá sesión para ver y cargar los equipos que guardaste anteriormente.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="btn-primary text-sm mx-auto flex items-center gap-2"
        >
          <LogIn size={14} />
          Iniciar sesión
        </button>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            db.refrescar();
          }}
          reason="Iniciá sesión para acceder a tus equipos guardados."
        />
      </div>
    );
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    const result = await db.eliminar(id);
    setDeletingId(null);
    if (!result.ok) setDeleteError(result.error ?? "Error al eliminar.");
    if (selectedId === id) setSelectedId(null);
  }

  function handleSelect(equipo: { id: string; nombre: string; plantel: Player[] }) {
    setSelectedId(equipo.id);
    onSquadReady(equipo.plantel);
    onReady(`${equipo.nombre} (${equipo.plantel.length} jugadores) — desde Mis equipos`);
  }

  if (db.loading) {
    return <div className="mt-2 text-xs text-muted-foreground">Cargando equipos guardados...</div>;
  }

  if (db.error) {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
          {db.error}
        </p>
        <button
          type="button"
          onClick={db.refrescar}
          className="text-xs text-primary underline underline-offset-2"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (db.equipos.length === 0) {
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        No tenés equipos guardados todavía. Subí un archivo JSON desde "Desde archivo" para guardar
        tu primer plantel.
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">
          {db.equipos.length} equipo{db.equipos.length !== 1 ? "s" : ""} guardado
          {db.equipos.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={db.refrescar}
          aria-label="Refrescar lista"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {deleteError && (
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
          {deleteError}
        </p>
      )}

      <ul className="rounded-lg border border-border bg-background divide-y divide-border overflow-hidden">
        {db.equipos.map((equipo) => (
          <li key={equipo.id} className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => handleSelect(equipo)}
              className={`flex-1 text-left text-sm transition-colors ${
                selectedId === equipo.id
                  ? "text-primary font-semibold"
                  : "text-foreground hover:text-primary"
              }`}
            >
              <span className="font-medium">{equipo.nombre}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {equipo.plantel.length} jug.
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleDelete(equipo.id)}
              disabled={deletingId === equipo.id}
              aria-label={`Eliminar ${equipo.nombre}`}
              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Modo crear jugador ────────────────────────────────────────────────────────

function CreateMode({
  onReady,
  onSquadReady,
}: {
  onReady: (label: string) => void;
  onSquadReady: (squad: Player[]) => void;
}) {
  const [squad, setSquad] = useState<Player[]>([]);

  function handlePlayerCreated(player: Player) {
    const newSquad = [...squad, player].sort((a, b) => b.overall - a.overall);
    setSquad(newSquad);
    onSquadReady(newSquad);
    onReady(`Plantel creado a mano (${newSquad.length} jugador${newSquad.length !== 1 ? "es" : ""})`);
  }

  function handleRemove(id: string) {
    const newSquad = squad.filter((p) => p.id !== id);
    setSquad(newSquad);
    onSquadReady(newSquad);
    onReady(
      newSquad.length > 0
        ? `Plantel creado a mano (${newSquad.length} jugador${newSquad.length !== 1 ? "es" : ""})`
        : null,
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <p className="text-xs text-muted-foreground">
        Creá jugadores uno por uno: definí nombre, posición, edad, puntaje general objetivo y
        repartí los 6 atributos. Necesitás al menos 11 jugadores.
      </p>

      <CreatePlayerScreen onPlayerCreated={handlePlayerCreated} onCancel={() => {}} />

      {squad.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">
              Jugadores creados ({squad.length})
            </span>
            {squad.length >= 11 ? (
              <span className="text-xs text-primary">Plantel completo</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Faltan {11 - squad.length} para llegar a 11
              </span>
            )}
          </div>
          <ul className="rounded-lg border border-border bg-background divide-y divide-border overflow-hidden max-h-48 overflow-y-auto">
            {squad.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                <span className="text-[10px] font-mono text-muted-foreground w-7">{p.position}</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{p.age}a</span>
                <span className="text-xs font-bold text-primary tabular-nums">{p.overall}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  aria-label={`Eliminar ${p.name}`}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
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
        <strong>Clave de API no configurada.</strong> Añadí la variable{" "}
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
        Los atributos se generan a partir del puesto y la valoración de la API. Plan gratuito: 100
        peticiones/día.
      </p>
    </div>
  );
}
