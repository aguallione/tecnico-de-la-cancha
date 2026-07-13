'use client';
/**
 * OnlineStatsScreen — resumen final de una partida online.
 *
 * Lee el match_state final (deserializado) de la partida y muestra marcador,
 * estadísticas de equipo y valoraciones. Cualquiera puede salir; el admin puede
 * cerrar la partida (la borra) para todos.
 */

import { useState } from "react";
import { useOnlineGame } from "@/lib/online/store";
import { deserializeMatchState } from "@/lib/football/serialization";
import { computePlayerRating, computeTeamRating, outOfPositionFactor } from "@/lib/football/engine";
import type { Team, PlayerMatchStats } from "@/lib/football/types";
import { cerrarPartida } from "@/lib/online/api";

export function OnlineStatsScreen() {
  const { partida, soyAdmin, salir } = useOnlineGame();
  const [cerrando, setCerrando] = useState(false);

  if (!partida?.match_state) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Cargando resultado…</p>
      </div>
    );
  }

  const state = deserializeMatchState(partida.match_state);
  const [a, b] = state.teams;
  const stats = state.playerStats;

  const posTotal = a.possession + b.possession || 1;
  const posA = Math.round((a.possession / posTotal) * 100);
  const posB = 100 - posA;

  const rows: Array<[string, number | string, number | string]> = [
    ["Posesión (%)", `${posA}%`, `${posB}%`],
    ["Tiros totales", a.shots, b.shots],
    ["Tiros al arco", a.shotsOnTarget, b.shotsOnTarget],
    ["Goles esperados (xG)", a.xg.toFixed(2), b.xg.toFixed(2)],
    ["Atajadas", a.saves, b.saves],
    ["Córners", a.corners, b.corners],
    ["Faltas", a.fouls, b.fouls],
    ["Amarillas", a.yellowCards, b.yellowCards],
    ["Rojas", a.redCards, b.redCards],
  ];

  async function cerrar() {
    if (!partida) return;
    setCerrando(true);
    try {
      await cerrarPartida(partida.id);
    } catch {
      // ignorar
    }
    await salir();
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-black text-center">Final del partido</h1>
        <p className="text-center text-xs text-muted-foreground mt-1">
          Partida online · código {partida.codigo}
        </p>

        <div className="mt-6 card p-6">
          <div className="grid grid-cols-3 items-center gap-4">
            <TeamCol team={a} align="right" />
            <div className="font-display font-black text-5xl text-center tabular-nums">
              {a.goals} : {b.goals}
            </div>
            <TeamCol team={b} align="left" />
          </div>
        </div>

        <div className="mt-6 card p-4">
          <h2 className="font-display font-bold text-lg">Estadísticas</h2>
          <div className="mt-3 space-y-2">
            {rows.map(([label, va, vb]) => (
              <div key={label} className="grid grid-cols-3 items-center gap-2 text-sm">
                <div className="text-right font-display tabular-nums">{va}</div>
                <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="text-left font-display tabular-nums">{vb}</div>
              </div>
            ))}
            <div className="grid grid-cols-3 items-center gap-2 text-sm pt-2 border-t">
              <div className="text-right font-display tabular-nums">
                {computeTeamRating(a, stats)}
              </div>
              <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">
                Valoración del equipo
              </div>
              <div className="text-left font-display tabular-nums">
                {computeTeamRating(b, stats)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PlayerRatings team={a} stats={stats} />
          <PlayerRatings team={b} stats={stats} />
        </div>

        <div className="mt-6 flex gap-3">
          <button className="btn-ghost flex-1" onClick={() => salir()}>
            Salir
          </button>
          {soyAdmin && (
            <button className="btn-primary flex-1" onClick={cerrar} disabled={cerrando}>
              {cerrando ? "Cerrando…" : "Cerrar partida para todos"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TeamCol({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div
        className={`flex items-center gap-2 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        <span
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: team.config.color }}
        />
        <div className="font-display font-black truncate">{team.config.name}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {team.formation} · {team.style}
      </div>
    </div>
  );
}

function PlayerRatings({
  team,
  stats,
}: {
  team: Team;
  stats: Record<string, PlayerMatchStats>;
}) {
  const starters = team.starting
    .map((id) => team.squad.find((p) => p.id === id))
    .filter(Boolean) as typeof team.squad;
  return (
    <div className="card p-4">
      <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">
        {team.config.name} · Valoraciones
      </h3>
      <div className="mt-3 space-y-1.5">
        {starters.map((p) => {
          const ps = stats[p.id];
          const rating = computePlayerRating(p, ps);
          const factor = outOfPositionFactor(p);
          const oop = factor < 1;
          return (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">
                {p.name}
                {oop && (
                  <span className="text-xs text-red-400 ml-1">
                    ({p.position}&rarr;{p.fieldPosition})
                  </span>
                )}
              </span>
              {ps?.goals ? <span className="text-xs text-green-500">⚽{ps.goals}</span> : null}
              {ps?.saves ? <span className="text-xs text-blue-500">🧤{ps.saves}</span> : null}
              <span
                className={`font-display font-bold tabular-nums w-10 text-right ${
                  rating >= 7 ? "text-green-500" : rating < 5 ? "text-red-400" : ""
                }`}
              >
                {rating.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
