'use client';

/**
 * CreatePlayerScreen.tsx
 *
 * Pantalla para crear un jugador manualmente. El usuario define:
 *   - Nombre
 *   - Posición (GK/DEF/MID/FWD)
 *   - Edad (17-40)
 *   - Puntaje general objetivo (1-99) que define el total de puntos disponibles
 *     para repartir entre los 6 atributos.
 *   - Los 6 atributos (Pase, Tiro, Regate, Defensa, Físico, Velocidad), cada uno 1-99.
 *
 * El "puntaje general objetivo" define un presupuesto de puntos: la suma de los
 * 6 atributos no puede superar `objetivo * 6`. Se muestra en vivo el general
 * resultante (promedio de los 6 atributos).
 *
 * Al guardar, llama onPlayerCreated(player) y el jugador se integra al plantel
 * igual que uno generado automáticamente o cargado por archivo.
 */

import { useState, useMemo } from "react";
import { uid } from "@/lib/football/players";
import type { Player, Position } from "@/lib/football/types";
import { POSITION_GROUP } from "@/lib/football/types";

interface Props {
  onPlayerCreated: (player: Player) => void;
  onCancel: () => void;
}

const ATTRS: { key: keyof Pick<Player, "passing" | "shooting" | "dribbling" | "defense" | "physical" | "pace">; label: string; short: string }[] = [
  { key: "passing", label: "Pase", short: "PAS" },
  { key: "shooting", label: "Tiro", short: "TIR" },
  { key: "dribbling", label: "Regate", short: "REG" },
  { key: "defense", label: "Defensa", short: "DEF" },
  { key: "physical", label: "Físico", short: "FIS" },
  { key: "pace", label: "Velocidad", short: "VEL" },
];

const GK_ATTRS: { key: keyof Pick<Player, "gkDiving" | "gkHandling" | "gkKicking" | "gkReflexes" | "gkPositioning">; label: string; short: string }[] = [
  { key: "gkDiving", label: "Estirada", short: "DIV" },
  { key: "gkHandling", label: "Paradas", short: "PAR" },
  { key: "gkKicking", label: "Saque", short: "SAC" },
  { key: "gkReflexes", label: "Reflejos", short: "REF" },
  { key: "gkPositioning", label: "Colocación", short: "POS" },
];

/** Grupos de posiciones para mostrar en el selector */
const POSITION_GROUPS: { label: string; positions: Position[] }[] = [
  { label: "Delantero", positions: ["DC", "SD", "EI", "ED"] },
  { label: "Mediocampista", positions: ["MCO", "MC", "MI", "MD", "MCD"] },
  { label: "Defensor", positions: ["DFC", "LI", "LD", "CAI", "CAD"] },
  { label: "Arquero", positions: ["POR"] },
];

const POSITIONS: Position[] = [
  "DC", "SD", "EI", "ED",
  "MCO", "MC", "MI", "MD", "MCD",
  "DFC", "LI", "LD", "CAI", "CAD",
  "POR",
];

const POS_LABEL: Record<Position, string> = {
  DC: "Delantero Centro",
  SD: "Segundo Delantero",
  EI: "Extremo Izquierdo",
  ED: "Extremo Derecho",
  MCO: "Mediocampista Ofensivo",
  MC: "Mediocampista Central",
  MI: "Mediocampista Izquierdo",
  MD: "Mediocampista Derecho",
  MCD: "Mediocampista Defensivo",
  DFC: "Defensor Central",
  LI: "Lateral Izquierdo",
  LD: "Lateral Derecho",
  CAI: "Carrilero Izquierdo",
  CAD: "Carrilero Derecho",
  POR: "Arquero",
};

export function CreatePlayerScreen({ onPlayerCreated, onCancel }: Props) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position>("MC");
  const [age, setAge] = useState(25);
  const [objetivo, setObjetivo] = useState(75);
  const [attrs, setAttrs] = useState<Record<string, number>>({
    passing: 75, shooting: 75, dribbling: 75, defense: 75, physical: 75, pace: 75,
  });
  const [gkAttrs, setGkAttrs] = useState<Record<string, number>>({
    gkDiving: 75, gkHandling: 75, gkKicking: 70, gkReflexes: 75, gkPositioning: 73,
  });

  const isPOR = position === "POR";
  const group = POSITION_GROUP[position];

  const overall = useMemo(
    () => Math.round((attrs.passing + attrs.shooting + attrs.dribbling + attrs.defense + attrs.physical + attrs.pace) / 6),
    [attrs],
  );

  const totalGastado = useMemo(
    () => attrs.passing + attrs.shooting + attrs.dribbling + attrs.defense + attrs.physical + attrs.pace,
    [attrs],
  );

  const presupuesto = objetivo * 6;
  const restante = presupuesto - totalGastado;
  const excedido = totalGastado > presupuesto;

  function ajustarAttr(key: string, valor: number) {
    const clamped = Math.max(1, Math.min(99, Math.round(valor)));
    setAttrs((prev) => ({ ...prev, [key]: clamped }));
  }

  function ajustarGkAttr(key: string, valor: number) {
    const clamped = Math.max(1, Math.min(99, Math.round(valor)));
    setGkAttrs((prev) => ({ ...prev, [key]: clamped }));
  }

  function autoRepartir() {
    const base = Math.floor(presupuesto / 6);
    const resto = presupuesto - base * 6;
    const distribuir: Record<string, number> = {};
    const orden = [...ATTRS.map((a) => a.key)];

    // Bonus por grupo lógico de posición
    type BonusMap = Record<string, number>;
    const bonusByGroup: Record<string, BonusMap> = {
      GK: { defense: 12, physical: 4, shooting: -25, dribbling: -18, pace: -8, passing: -6 },
      DEF: { defense: 10, physical: 2, shooting: -10, dribbling: -6, passing: -2, pace: 0 },
      MID: { passing: 6, dribbling: 2, shooting: 0, defense: 0, physical: 0, pace: 0 },
      FWD: { shooting: 10, dribbling: 8, pace: 4, passing: 2, defense: -10, physical: 0 },
    };
    const bonus = bonusByGroup[group] ?? {};

    for (const key of orden) {
      const val = base + (bonus[key] ?? 0);
      distribuir[key] = Math.max(1, Math.min(99, val));
    }
    const claveIdx = orden.findIndex((k) => Math.abs(bonus[k] ?? 0) > 5);
    if (claveIdx >= 0 && resto > 0) {
      distribuir[orden[claveIdx]] = Math.min(99, distribuir[orden[claveIdx]] + resto);
    }
    setAttrs(distribuir);

    // Si es arquero, auto-repartir atributos GK también
    if (isPOR) {
      const gkBase = objetivo;
      setGkAttrs({
        gkDiving: Math.max(1, Math.min(99, gkBase + Math.round(Math.random() * 8 - 3))),
        gkHandling: Math.max(1, Math.min(99, gkBase + Math.round(Math.random() * 8 - 3))),
        gkKicking: Math.max(1, Math.min(99, gkBase + Math.round(Math.random() * 6 - 4))),
        gkReflexes: Math.max(1, Math.min(99, gkBase + Math.round(Math.random() * 8 - 3))),
        gkPositioning: Math.max(1, Math.min(99, gkBase + Math.round(Math.random() * 6 - 3))),
      });
    }
  }

  function guardar() {
    if (!name.trim()) return;
    const player: Player = {
      id: uid(),
      name: name.trim(),
      position,
      overall,
      passing: attrs.passing,
      shooting: attrs.shooting,
      dribbling: attrs.dribbling,
      defense: attrs.defense,
      physical: attrs.physical,
      pace: attrs.pace,
      age,
      stamina: 100,
      onField: false,
      redCarded: false,
      yellowCards: 0,
      injured: false,
      ...(isPOR ? {
        gkDiving: gkAttrs.gkDiving,
        gkHandling: gkAttrs.gkHandling,
        gkKicking: gkAttrs.gkKicking,
        gkReflexes: gkAttrs.gkReflexes,
        gkPositioning: gkAttrs.gkPositioning,
      } : {}),
    };
    onPlayerCreated(player);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            className="input mt-1"
            maxLength={40}
          />
        </div>
        <div>
          <label className="label">Posición</label>
          <div className="mt-1 space-y-1">
            {POSITION_GROUPS.map((g) => (
              <div key={g.label} className="flex gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground w-full">{g.label}</span>
                {g.positions.map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPosition(pos)}
                    data-active={position === pos}
                    className="chip"
                  >
                    {pos}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{POS_LABEL[position]}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Edad: {age}</label>
          <input
            type="range"
            min={17}
            max={40}
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>
        <div>
          <label className="label">Puntaje general objetivo: {objetivo}</label>
          <input
            type="range"
            min={40}
            max={99}
            value={objetivo}
            onChange={(e) => setObjetivo(Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>
      </div>

      {/* Presupuesto de puntos */}
      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <div className="flex items-center justify-between text-sm">
          <span>Presupuesto: <strong>{presupuesto}</strong> pts</span>
          <span className={excedido ? "text-destructive" : restante < 6 ? "text-yellow-500" : "text-primary"}>
            Gastado: <strong>{totalGastado}</strong> · Restante: <strong>{restante}</strong>
          </span>
        </div>
        <button onClick={autoRepartir} className="btn-ghost text-xs mt-2 py-1 px-3">
          Repartir automáticamente por posición
        </button>
      </div>

      {/* Sliders de atributos */}
      <div className="space-y-3">
        {ATTRS.map((attr) => (
          <div key={attr.key} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{attr.short}</span>
            <input
              type="range"
              min={1}
              max={99}
              value={attrs[attr.key]}
              onChange={(e) => ajustarAttr(attr.key, Number(e.target.value))}
              className="w-full"
            />
            <span className="text-sm font-bold text-center tabular-nums">{attrs[attr.key]}</span>
          </div>
        ))}
      </div>

      {/* Atributos exclusivos de arquero */}
      {isPOR && (
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Atributos de Arquero</div>
          {GK_ATTRS.map((attr) => (
            <div key={attr.key} className="grid grid-cols-[3rem_1fr_2.5rem] items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">{attr.short}</span>
              <input
                type="range"
                min={1}
                max={99}
                value={gkAttrs[attr.key]}
                onChange={(e) => ajustarGkAttr(attr.key, Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm font-bold text-center tabular-nums">{gkAttrs[attr.key]}</span>
            </div>
          ))}
        </div>
      )}

      {/* General resultante */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3">
        <span className="text-sm text-muted-foreground">General resultante</span>
        <span className={`font-display text-2xl font-black ${excedido ? "text-destructive" : "text-primary"}`}>
          {overall}
        </span>
      </div>

      {excedido && (
        <p className="text-xs text-destructive">
          La suma de atributos ({totalGastado}) supera el presupuesto ({presupuesto}). Reducí algunos atributos.
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1">
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={!name.trim() || excedido}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          Crear jugador
        </button>
      </div>
    </div>
  );
}
