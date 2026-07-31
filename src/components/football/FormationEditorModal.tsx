'use client';

import { useState } from "react";
import type { Position } from "@/lib/football/types";

const POSITION_GROUPS: { label: string; positions: Position[] }[] = [
  { label: "Delantero", positions: ["DC", "SD", "EI", "ED"] },
  { label: "Mediocampista", positions: ["MCO", "MC", "MI", "MD", "MCD"] },
  { label: "Defensor", positions: ["DFC", "LI", "LD", "CAI", "CAD"] },
  { label: "Arquero", positions: ["POR"] },
];

interface Props {
  onClose: () => void;
  onSaved: (id: string, filas: Position[][]) => void;
  guardar: (nombre: string, filas: Position[][]) => Promise<{ ok: boolean; error?: string }>;
}

export function FormationEditorModal({ onClose, onSaved, guardar }: Props) {
  const [nombre, setNombre] = useState("");
  // Arranca con una fila vacía para el arquero, como punto de partida obvio.
  const [filas, setFilas] = useState<Position[][]>([["POR"]]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = filas.reduce((s, f) => s + f.length, 0);
  const totalPOR = filas.flat().filter((p) => p === "POR").length;

  function agregarFila() {
    setFilas((f) => [...f, []]);
  }

  function eliminarFila(rowIdx: number) {
    setFilas((f) => f.filter((_, i) => i !== rowIdx));
  }

  function agregarPosicion(rowIdx: number, pos: Position) {
    setFilas((f) => f.map((row, i) => (i === rowIdx ? [...row, pos] : row)));
  }

  function quitarPosicion(rowIdx: number, posIdx: number) {
    setFilas((f) => f.map((row, i) => (i === rowIdx ? row.filter((_, j) => j !== posIdx) : row)));
  }

  async function handleGuardar() {
    if (!nombre.trim()) {
      setError("Ponele un nombre a la formación.");
      return;
    }
    if (total !== 11) {
      setError(`Tenés ${total} jugadores, tiene que ser exactamente 11.`);
      return;
    }
    if (totalPOR !== 1) {
      setError(`Tenés ${totalPOR} arqueros, tiene que ser exactamente 1.`);
      return;
    }
    setSaving(true);
    setError(null);
    const filasLimpias = filas.filter((f) => f.length > 0);
    const res = await guardar(nombre.trim(), filasLimpias);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo guardar la formación.");
      return;
    }
    // El id real lo asigna Supabase; como el hook recarga la lista, usamos el
    // nombre + filas para que el padre las registre apenas refresque.
    onSaved(nombre.trim(), filasLimpias);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card w-full max-w-lg p-6 bg-background text-foreground max-h-[85vh] overflow-auto">
        <h2 className="font-display text-xl font-bold">Crear formación</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Armá filas desde el arquero hacia el ataque. Cada fila, de izquierda a derecha tal cual se va a ver en la cancha. Tiene que sumar exactamente 11 jugadores, con 1 arquero.
        </p>

        <div className="mt-4">
          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Nombre</label>
          <input
            type="text"
            className="input w-full"
            placeholder="Ej: Mi 4-4-2 rombo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
          />
        </div>

        <div className="mt-4 space-y-3">
          {filas.map((row, rowIdx) => (
            <div key={rowIdx} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Fila {rowIdx + 1}</span>
                <button type="button" onClick={() => eliminarFila(rowIdx)} className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-0.5">
                  Eliminar fila
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {row.map((pos, posIdx) => (
                  <button
                    key={posIdx}
                    type="button"
                    onClick={() => quitarPosicion(rowIdx, posIdx)}
                    className="chip"
                    data-active
                    title="Tocar para quitar"
                  >
                    {pos} ✕
                  </button>
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {POSITION_GROUPS.map((g) => (
                  <div key={g.label} className="flex gap-1 flex-wrap items-center">
                    <span className="text-[10px] text-muted-foreground w-20 shrink-0">{g.label}</span>
                    {g.positions.map((pos) => (
                      <button key={pos} type="button" onClick={() => agregarPosicion(rowIdx, pos)} className="chip text-xs">
                        + {pos}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={agregarFila} className="btn-ghost w-full text-sm">
            + Agregar fila
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span>Total: <b className={total === 11 ? "text-primary" : "text-destructive"}>{total}</b> / 11</span>
          <span>Arqueros: <b className={totalPOR === 1 ? "text-primary" : "text-destructive"}>{totalPOR}</b> / 1</span>
        </div>

        {error && <p className="mt-2 text-xs text-destructive-foreground bg-destructive rounded px-2 py-1.5">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
            Cancelar
          </button>
          <button type="button" onClick={handleGuardar} className="btn-primary flex-1 disabled:opacity-50" disabled={saving}>
            {saving ? "Guardando..." : "Guardar formación"}
          </button>
        </div>
      </div>
    </div>
  );
}