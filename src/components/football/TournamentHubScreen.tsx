import { useEffect, useState } from "react";
import { useGame } from "@/lib/football/store";
import { fetchTorneo, fetchSlots, fetchFixture, teamFromSlot } from "@/lib/football/tournament-api";
import { computeStandings } from "@/lib/football/tournament-standings";
import type { Tournament, TournamentSlot, TournamentFixtureMatch } from "@/lib/football/tournament-types";

export function TournamentHubScreen() {
  const {
    tournamentId, reset, setScreen, setSettings, setTeams,
    setActiveLockerTeam, setTournamentActiveMatchId, setTournamentActiveMatchIsKnockout,
  } = useGame();

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
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo cargar el torneo.");
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
        <p className="text-muted-foreground">Cargando torneo...</p>
      </div>
    );
  }

  const nombreSlot = (id: string) => slots.find((s) => s.id === id)?.displayName ?? "?";
  const esBot = (id: string) => slots.find((s) => s.id === id)?.teamConfig.isBot ?? false;
  const esLiga = tournament.format !== "eliminacion_directa";
  const standings = esLiga ? computeStandings(slots, fixture) : [];

  const pendientes = fixture
    .filter((m) => m.status === "pendiente")
    .sort((a, b) => a.round - b.round);
  const proximo = pendientes[0] ?? null;
  const jugados = fixture.filter((m) => m.status === "jugado");

  function jugarPartido(m: TournamentFixtureMatch) {
    const home = slots.find((s) => s.id === m.homeSlotId);
    const away = slots.find((s) => s.id === m.awaySlotId);
    if (!home || !away || !tournament) return;
    setSettings(tournament.matchSettingsTemplate);
    setTeams([teamFromSlot(home), teamFromSlot(away)]);
    setActiveLockerTeam(0);
    setTournamentActiveMatchId(m.id);
    setTournamentActiveMatchIsKnockout(tournament.format === "eliminacion_directa");
    setScreen("handoff");
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-4" onClick={reset}>← Salir del torneo</button>
        <h1 className="font-display text-3xl font-black">{tournament.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ronda {tournament.currentRound} de {tournament.totalRounds} ·{" "}
          {tournament.format === "eliminacion_directa"
            ? "Copa"
            : tournament.format === "liga_ida_vuelta"
              ? "Liga (ida y vuelta)"
              : "Liga"}
        </p>

        {error && (
          <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1 mt-3">{error}</p>
        )}

        {/* Próximo partido */}
        <div className="card p-4 mt-6">
          <h2 className="font-display text-lg font-bold">Próximo partido</h2>
          {proximo ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">
                  {nombreSlot(proximo.homeSlotId)} vs {nombreSlot(proximo.awaySlotId)}
                </div>
                <div className="text-xs text-muted-foreground">Ronda {proximo.round}</div>
              </div>
              {esBot(proximo.homeSlotId) && esBot(proximo.awaySlotId) ? (
                <span className="text-xs text-muted-foreground text-right max-w-[10rem]">
                  Cruce Bot vs Bot — resolución automática pendiente (próximo paso)
                </span>
              ) : (
                <button className="btn-primary" onClick={() => jugarPartido(proximo)}>
                  Jugar →
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              {tournament.status === "finalizado" ? "El torneo ya terminó." : "No quedan partidos pendientes en esta ronda."}
            </p>
          )}
        </div>

        {/* Tabla de posiciones */}
        {esLiga && (
          <div className="card p-4 mt-4">
            <h2 className="font-display text-lg font-bold">Tabla de posiciones</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="text-muted-foreground text-left">
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
                  {standings.map((r) => (
                    <tr key={r.slotId} className="border-t border-border">
                      <td className="py-1 pr-2">{nombreSlot(r.slotId)}</td>
                      <td className="px-1 text-center">{r.played}</td>
                      <td className="px-1 text-center">{r.won}</td>
                      <td className="px-1 text-center">{r.drawn}</td>
                      <td className="px-1 text-center">{r.lost}</td>
                      <td className="px-1 text-center">{r.goalsFor - r.goalsAgainst}</td>
                      <td className="px-1 text-center font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Partidos jugados */}
        {jugados.length > 0 && (
          <div className="card p-4 mt-4">
            <h2 className="font-display text-lg font-bold">Resultados</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {jugados.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <span>{nombreSlot(m.homeSlotId)} vs {nombreSlot(m.awaySlotId)}</span>
                  <span className="font-display font-bold">
                    {m.result?.homeGoals} - {m.result?.awayGoals}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}