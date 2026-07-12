'use client';
/**
 * OnlineEquipoSelector.tsx
 *
 * Selector del plantel para el multijugador online. Tres orígenes:
 *   1. "aleatorio" → generateSquad
 *   2. "publicos"  → equipos marcados es_publico = true (de cualquier usuario)
 *   3. "propios"   → "Mis equipos" del usuario logueado, con toggle es_publico
 */

import { useEffect, useState } from "react";
import { Globe, Lock, LogIn, RefreshCw, Shuffle } from "lucide-react";
import type { Player } from "@/lib/football/types";
import { generateSquad } from "@/lib/football/players";
import { useAuth } from "@/hooks/use-auth";
import { useEquiposGuardados } from "@/hooks/use-equipos-guardados";
import { fetchEquiposPublicos, type EquipoPublico } from "@/lib/online/api";
import { AuthModal } from "@/components/football/AuthModal";

type Origen = "aleatorio" | "publicos" | "propios";

interface Props {
  onSquadReady: (squad: Player[], label: string) => void;
}

export function OnlineEquipoSelector({ onSquadReady }: Props) {
  const [origen, setOrigen] = useState<Origen>("aleatorio");
  const [label, setLabel] = useState<string | null>(null);

  function handleSquad(squad: Player[], lbl: string) {
    setLabel(lbl);
    onSquadReady(squad, lbl);
  }

  const tabs: { value: Origen; label: string }[] = [
    { value: "aleatorio", label: "Aleatorio" },
    { value: "publicos", label: "Públicos" },
    { value: "propios", label: "Mis equipos" },
  ];

  return (
    <div className="mt-3">
      <div className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Elegí tu plantel
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {tabs.map(({ value, label: l }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setOrigen(value);
              setLabel(null);
            }}
            className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
              origen === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {origen === "aleatorio" && <AleatorioMode onReady={handleSquad} />}
      {origen === "publicos" && <PublicosMode onReady={handleSquad} />}
      {origen === "propios" && <PropiosMode onReady={handleSquad} />}

      {label && <p className="mt-2 text-xs text-primary font-medium">{label}</p>}
    </div>
  );
}

function AleatorioMode({ onReady }: { onReady: (s: Player[], l: string) => void }) {
  function gen() {
    onReady(generateSquad(20), "Plantel aleatorio (20 jugadores)");
  }
  return (
    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Se crea un plantel aleatorio con nombres y atributos generados.</span>
      <button
        type="button"
        onClick={gen}
        className="btn-secondary text-xs py-1 px-3 shrink-0 flex items-center gap-1"
      >
        <Shuffle size={12} />
        Generar
      </button>
    </div>
  );
}

function PublicosMode({ onReady }: { onReady: (s: Player[], l: string) => void }) {
  const [equipos, setEquipos] = useState<EquipoPublico[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      setEquipos(await fetchEquiposPublicos());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar equipos públicos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  if (loading) return <div className="mt-2 text-xs text-muted-foreground">Cargando equipos públicos...</div>;
  if (error)
    return (
      <div className="mt-2 space-y-2">
        <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">{error}</p>
        <button type="button" onClick={cargar} className="text-xs text-primary underline underline-offset-2">
          Reintentar
        </button>
      </div>
    );
  if (equipos.length === 0)
    return <div className="mt-2 text-xs text-muted-foreground">No hay equipos públicos disponibles todavía.</div>;

  return (
    <ul className="mt-2 rounded-lg border border-border bg-background divide-y divide-border overflow-hidden">
      {equipos.map((e) => (
        <li key={e.id} className="px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setSelectedId(e.id);
              onReady(e.plantel, `${e.nombre} (público, ${e.plantel.length} jug.)`);
            }}
            className={`w-full text-left text-sm transition-colors ${
              selectedId === e.id ? "text-primary font-semibold" : "text-foreground hover:text-primary"
            }`}
          >
            <span className="font-medium">{e.nombre}</span>
            <span className="ml-2 text-xs text-muted-foreground">{e.plantel.length} jug.</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function PropiosMode({ onReady }: { onReady: (s: Player[], l: string) => void }) {
  const { user } = useAuth();
  const db = useEquiposGuardados();
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mt-2 rounded-lg border border-border bg-muted/40 p-4 text-center space-y-3">
        <p className="text-sm text-foreground font-medium">Iniciá sesión para usar tus equipos guardados</p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="btn-primary text-sm mx-auto flex items-center gap-2"
        >
          <LogIn size={14} />
          Iniciar sesión
        </button>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            db.refrescar();
          }}
          reason="Iniciá sesión para acceder a tus equipos guardados."
        />
      </div>
    );
  }

  if (db.loading) return <div className="mt-2 text-xs text-muted-foreground">Cargando tus equipos...</div>;
  if (db.equipos.length === 0)
    return (
      <div className="mt-2 text-xs text-muted-foreground">
        No tenés equipos guardados. Creá uno desde una partida local (menú "Desde archivo").
      </div>
    );

  async function handleToggle(id: string, actual: boolean) {
    setTogglingId(id);
    await db.togglePublico(id, !actual);
    setTogglingId(null);
  }

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{db.equipos.length} equipo(s)</span>
        <button
          type="button"
          onClick={db.refrescar}
          aria-label="Refrescar lista"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      <ul className="rounded-lg border border-border bg-background divide-y divide-border overflow-hidden">
        {db.equipos.map((e) => (
          <li key={e.id} className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setSelectedId(e.id);
                onReady(e.plantel, `${e.nombre} (${e.plantel.length} jug.)`);
              }}
              className={`flex-1 text-left text-sm transition-colors ${
                selectedId === e.id ? "text-primary font-semibold" : "text-foreground hover:text-primary"
              }`}
            >
              <span className="font-medium">{e.nombre}</span>
              <span className="ml-2 text-xs text-muted-foreground">{e.plantel.length} jug.</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggle(e.id, e.es_publico)}
              disabled={togglingId === e.id}
              aria-label={e.es_publico ? "Hacer privado" : "Hacer público"}
              title={e.es_publico ? "Público — tocá para hacerlo privado" : "Privado — tocá para hacerlo público"}
              className={`flex items-center gap-1 text-xs rounded px-2 py-1 shrink-0 transition-colors disabled:opacity-40 ${
                e.es_publico
                  ? "text-primary border border-primary/40"
                  : "text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              {e.es_publico ? <Globe size={12} /> : <Lock size={12} />}
              {e.es_publico ? "Público" : "Privado"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
