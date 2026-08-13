import { useEffect, useState } from "react";
import { useGame } from "@/lib/football/store";
import { fetchTorneo, fetchSlots, fetchFixture } from "@/lib/football/tournament-api";
import { computeStandings } from "@/lib/football/tournament-standings";
import type { Tournament, TournamentSlot, TournamentFixtureMatch } from "@/lib/football/tournament-types";

interface Goleador {
  playerId: string;
  nombre: string;
  equipo: string;
  goles: number;
}

export function TournamentFinalScreen() {
  const { tournamentId, reset, setScreen } = useGame();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [slots, setSlots] = useState<TournamentSlot[]>([]);
  const [fixture, setFixture] = useState<TournamentFixtureMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      try {
        const [t, s, f] = await Promise.all([
          fetchTorneo(tournamentId!),
          fetchSlots(tournamentId!),
          fetchFixture(tournamentId!),
        ]);
        if (cancelado) return;
        setTournament(t);
        setSlots(s);
        setFixture(f);
        setError(null);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo cargar el resumen del torneo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, [tournamentId]);

  if (!tournamentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p>No hay ningún torneo activo.</p>
          <button className="btn-primary mt-4" onClick={() => setScreen("home")}>Volver al inicio</button>
        </div>
      </div>
    );
  }

  if (loading || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando resumen...</p>
      </div>
    );
  }

  const nombreSlot = (id: string | undefined) => slots.find((s) => s.id === id)?.displayName ?? "?";
  const esLiga = tournament.format !== "eliminacion_directa";
  const campeon = nombreSlot(tournament.championSlotId);

  const standings = esLiga ? computeStandings(slots, fixture) : [];

  const rondas = Array.from(new Set(fixture.map((m) => m.round))).sort((a, b) => a - b);
  const ultimaRonda = rondas[rondas.length - 1];
  const finalMatch = !esLiga
    ? fixture.find((m) => m.round === ultimaRonda && m.status === "jugado")
    : null;

  // Goleadores: suma de goles de todos los partidos jugados, cruzando
  // playerId contra el plantel de cada slot para nombre y equipo.
  const golesPorJugador = new Map<string, number>();
  for (const m of fixture) {
    if (!m.result) continue;
    for (const stat of Object.values(m.result.stats.players)) {
      if (stat.goals > 0) {
        golesPorJugador.set(stat.playerId, (golesPorJugador.get(stat.playerId) ?? 0) + stat.goals);
      }
    }
  }
  const goleadores: Goleador[] = [];
  for (const [playerId, goles] of golesPorJugador.entries()) {
    const slot = slots.find((s) => s.squad.some((p) => p.id === playerId));
    const jugador = slot?.squad.find((p) => p.id === playerId);
    if (slot && jugador) {
      goleadores.push({ playerId, nombre: jugador.name, equipo: slot.displayName, goles });
    }
  }
  goleadores.sort((a, b) => b.goles - a.goles);
  const topGoleadores = goleadores.slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-4" onClick={() => setScreen("tournament_hub")}>← Volver al torneo</button>

        {error && (
          <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1 mb-4">{error}</p>
        )}

        <div className="card p-6 text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {tournament.name} · {esLiga ? (tournament.format === "liga_ida_vuelta" ? "Liga (ida y vuelta)" : "Liga") : "Copa"}
          </div>
          <div className="mt-2 text-4xl">🏆</div>
          <h1 className="font-display text-3xl font-black mt-2">{campeon}</h1>
          <div className="text-sm text-muted-foreground mt-1">Campeón del torneo</div>
        </div>

        {!esLiga && finalMatch && (
          <div className="card p-4 mt-4">
            <h2 className="font-display text-lg font-bold">Resultado de la final</h2>
            <div className="mt-3 flex items-center justify-center gap-4 text-lg">
              <span className={finalMatch.homeSlotId === tournament.championSlotId ? "font-black" : ""}>
                {nombreSlot(finalMatch.homeSlotId)}
              </span>
              <span className="font-display font-black tabular-nums">
                {finalMatch.result?.homeGoals} - {finalMatch.result?.awayGoals}
                {finalMatch.result?.penalties &&
                  ` (${finalMatch.result.penalties.homeGoals}-${finalMatch.result.penalties.awayGoals} pen.)`}
              </span>
              <span className={finalMatch.awaySlotId === tournament.championSlotId ? "font-black" : ""}>
                {nombreSlot(finalMatch.awaySlotId)}
              </span>
            </div>
          </div>
        )}

        {esLiga && (
          <div className="card p-4 mt-4">
            <h2 className="font-display text-lg font-bold">Tabla final</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">Equipo</th>
                    <th className="px-1 text-center">PJ</th>
                    <th className="px-1 text-center">G</th>
                    <th className="px-1 text-center">E</th>
                    <th className="px-1 text-center">P</th>
                    <th className="px-1 text-center">DG</th>
                    <th className="px-1 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((r, i) => (
                    <tr key={r.slotId} className={`border-t border-border ${i === 0 ? "font-bold" : ""}`}>
                      <td className="py-1 pr-2">{i + 1}</td>
                      <td className="py-1 pr-2">{nombreSlot(r.slotId)}</td>
                      <td className="px-1 text-center">{r.played}</td>
                      <td className="px-1 text-center">{r.won}</td>
                      <td className="px-1 text-center">{r.drawn}</td>
                      <td className="px-1 text-center">{r.lost}</td>
                      <td className="px-1 text-center">{r.goalsFor - r.goalsAgainst}</td>
                      <td className="px-1 text-center">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {topGoleadores.length > 0 && (
          <div className="card p-4 mt-4">
            <h2 className="font-display text-lg font-bold">Goleadores del torneo</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {topGoleadores.map((g, i) => (
                <li key={g.playerId} className="flex items-center justify-between">
                  <span>
                    <span className="text-muted-foreground mr-1">{i + 1}.</span>
                    {g.nombre} <span className="text-xs text-muted-foreground">({g.equipo})</span>
                  </span>
                  <span className="font-display font-bold tabular-nums">⚽ {g.goles}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <button className="btn-secondary flex-1" onClick={() => setScreen("tournament_hub")}>
            Ver torneo completo
          </button>
          <button className="btn-primary flex-1" onClick={reset}>
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}