import { useEffect, useState } from "react";
import { useGame } from "@/lib/football/store";
import { useAuth } from "@/hooks/use-auth";
import { fetchTorneo, fetchSlots, fetchFixture, teamFromSlot, avanzarRondaSiCorresponde, finalizarLigaSiCorresponde, asignarHoraPartido, esAdminDeTorneo } from "@/lib/football/tournament-api";
import { resolverPartidoAutomatico } from "@/lib/football/tournament-bot-resolve";
import { computeStandings } from "@/lib/football/tournament-standings";
import type { Tournament, TournamentSlot, TournamentFixtureMatch } from "@/lib/football/tournament-types";

export function TournamentHubScreen() {
  const {
    tournamentId, reset, setScreen, setSettings, setTeams,
    setActiveLockerTeam, setTournamentActiveMatchId, setTournamentActiveMatchIsKnockout,
    setTournamentLiveMatchId,
  } = useGame();
  const { user } = useAuth();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [slots, setSlots] = useState<TournamentSlot[]>([]);
  const [fixture, setFixture] = useState<TournamentFixtureMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [horarioElegido, setHorarioElegido] = useState("");
  const [guardandoHorario, setGuardandoHorario] = useState(false);
  const [soyAdminTorneo, setSoyAdminTorneo] = useState(false);


  useEffect(() => {
    if (!tournamentId) return;
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      try {
        // Red de seguridad: si por una conexión lenta el resultado del
        // partido anterior llegó a Supabase después de que StatsScreen ya
        // había intentado avanzar de ronda, esto lo vuelve a intentar acá.
        // Es idempotente (avanzarRondaSiCorresponde ya lo garantiza), así
        // que no hace nada si no hace falta.
        await avanzarRondaSiCorresponde(tournamentId!).catch((err) => {
          console.error("No se pudo avanzar de ronda al entrar al hub:", err);
        });
        await finalizarLigaSiCorresponde(tournamentId!).catch((err) => {
          console.error("No se pudo verificar el fin de la liga al entrar al hub:", err);
        });
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
        if (t.isOnline) {
          esAdminDeTorneo(tournamentId!)
            .then((esAdmin) => { if (!cancelado) setSoyAdminTorneo(esAdmin); })
            .catch(() => { if (!cancelado) setSoyAdminTorneo(false); });
        }
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

  function formatHorario(fechaISO: string | undefined): string {
    if (!fechaISO) return "Sin horario asignado";
    const d = new Date(fechaISO);
    return d.toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const nombreSlot = (id: string) => slots.find((s) => s.id === id)?.displayName ?? "?";
  const esBot = (id: string) => slots.find((s) => s.id === id)?.teamConfig.isBot ?? false;
  const esLiga = tournament.format !== "eliminacion_directa";
  const standings = esLiga ? computeStandings(slots, fixture) : [];

  const miSlotId = slots.find((s) => s.ownerUserId === user?.id)?.id;
  const pendientes = fixture
    .filter((m) => m.status === "pendiente")
    .sort((a, b) => {
      // Priorizar partidos donde el usuario es partícipe
      const aEsMio = a.homeSlotId === miSlotId || a.awaySlotId === miSlotId;
      const bEsMio = b.homeSlotId === miSlotId || b.awaySlotId === miSlotId;
      if (aEsMio && !bEsMio) return -1;
      if (!aEsMio && bEsMio) return 1;
      // Si ambos son míos o ninguno, ordenar por ronda
      return a.round - b.round;
    });
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

  async function guardarHorario(m: TournamentFixtureMatch) {
    if (!horarioElegido || !tournamentId) return;
    setGuardandoHorario(true);
    setError(null);
    try {
      await asignarHoraPartido(m.id, new Date(horarioElegido).toISOString());
      const f = await fetchFixture(tournamentId);
      setFixture(f);
      setHorarioElegido("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el horario.");
    } finally {
      setGuardandoHorario(false);
    }
  }

  async function resolverAutomatico(m: TournamentFixtureMatch) {
    const home = slots.find((s) => s.id === m.homeSlotId);
    const away = slots.find((s) => s.id === m.awaySlotId);
    if (!home || !away || !tournament || !tournamentId) return;
    setResolviendoId(m.id);
    setError(null);
    try {
      await resolverPartidoAutomatico({
        match: m,
        home,
        away,
        matchSettings: tournament.matchSettingsTemplate,
        esEliminacionDirecta: tournament.format === "eliminacion_directa",
      });
      await avanzarRondaSiCorresponde(tournamentId);
      await finalizarLigaSiCorresponde(tournamentId);
      const [t, s, f] = await Promise.all([
        fetchTorneo(tournamentId),
        fetchSlots(tournamentId),
        fetchFixture(tournamentId),
      ]);
      setTournament(t);
      setSlots(s);
      setFixture(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo resolver el partido automáticamente.");
    } finally {
      setResolviendoId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-4" onClick={reset}>← Salir del torneo</button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-black">{tournament.name}</h1>
          {slots.some((s) => s.ownerUserId === user?.id) && (
            <button className="btn-secondary text-sm shrink-0" onClick={() => setScreen("tournament_locker")}>
              Mi vestuario
            </button>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {esLiga
            ? `Jornada ${proximo?.round ?? tournament.totalRounds} de ${tournament.totalRounds}`
            : `Ronda ${tournament.currentRound} de ${tournament.totalRounds}`}
          {" "}·{" "}
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
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">
                    {nombreSlot(proximo.homeSlotId)} vs {nombreSlot(proximo.awaySlotId)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ronda {proximo.round}
                    {tournament.isOnline && proximo.scheduledAt && (
                      <span className="ml-2">· {formatHorario(proximo.scheduledAt)}</span>
                    )}
                  </div>
                </div>
                {!tournament.isOnline && (
                  <>
                    {esBot(proximo.homeSlotId) && esBot(proximo.awaySlotId) ? (
                      <button
                        className="btn-secondary disabled:opacity-50"
                        disabled={resolviendoId === proximo.id}
                        onClick={() => resolverAutomatico(proximo)}
                      >
                        {resolviendoId === proximo.id ? "Resolviendo..." : "Resolver automático"}
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={() => jugarPartido(proximo)}>
                        Jugar →
                      </button>
                    )}
                  </>
                )}
                {tournament.isOnline && (
                  <>
                    {proximo.scheduledAt && (
                      <button
                        className="btn-primary"
                        onClick={() => { setTournamentLiveMatchId(proximo.id); setScreen("tournament_match_live"); }}
                      >
                        Ver partido →
                      </button>
                    )}
                    {!proximo.scheduledAt && soyAdminTorneo && tournament.modoHorario === "manual" && (
                      <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                        <input
                          type="datetime-local"
                          className="input text-xs w-full"
                          value={horarioElegido}
                          onChange={(e) => setHorarioElegido(e.target.value)}
                          min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                        />
                        <button
                          className="btn-primary text-xs disabled:opacity-50 w-full"
                          disabled={!horarioElegido || guardandoHorario}
                          onClick={() => guardarHorario(proximo)}
                        >
                          {guardandoHorario ? "Guardando..." : "Asignar horario"}
                        </button>
                      </div>
                    )}
                    {!proximo.scheduledAt && soyAdminTorneo && tournament.modoHorario !== "manual" && (
                      <span className="text-xs text-muted-foreground">
                        El torneo usa horario automático. El sistema asignará la hora.
                      </span>
                    )}
                    {!proximo.scheduledAt && !soyAdminTorneo && (
                      <span className="text-xs text-muted-foreground">Esperando que un admin asigne el horario.</span>
                    )}
                  </>
                )}
              </div>
              {tournament.isOnline && proximo.scheduledAt && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2 mt-1">
                  {new Date(proximo.scheduledAt) > new Date() ? (
                    `El partido comenzará en ${Math.round((new Date(proximo.scheduledAt).getTime() - Date.now()) / 60000)} minutos.`
                  ) : (
                    "El partido debería estar en curso o ya terminó."
                  )}
                </div>
              )}
            </div>
          ) : tournament.status === "finalizado" ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">El torneo ya terminó.</p>
              <button className="btn-primary" onClick={() => setScreen("tournament_final")}>
                Ver resumen →
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              No quedan partidos pendientes en esta ronda.
            </p>
          )}
        </div>

        {/* Cuadro de eliminación (Copa) */}
        {!esLiga && <TournamentBracket fixture={fixture} nombreSlot={nombreSlot} />}

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

function TournamentBracket({
  fixture,
  nombreSlot,
}: {
  fixture: TournamentFixtureMatch[];
  nombreSlot: (id: string) => string;
}) {
  const rounds = Array.from(new Set(fixture.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="card p-4 mt-4">
      <h2 className="font-display text-lg font-bold">Cuadro de eliminación</h2>
      <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
        {rounds.map((round, i) => {
          const partidos = fixture
            .filter((m) => m.round === round)
            .sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0));
          const esFinal = i === rounds.length - 1;
          return (
            <div key={round} className="min-w-[180px] flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 text-center">
                {esFinal ? "Final" : `Ronda ${round}`}
              </div>
              <div className="flex flex-col gap-3">
                {partidos.map((m) => (
                  <BracketMatch key={m.id} match={m} nombreSlot={nombreSlot} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatch({
  match,
  nombreSlot,
}: {
  match: TournamentFixtureMatch;
  nombreSlot: (id: string) => string;
}) {
  const jugado = match.status === "jugado";
  let ganadorId: string | null = null;
  if (jugado && match.result) {
    ganadorId = match.result.penalties
      ? (match.result.penalties.homeGoals > match.result.penalties.awayGoals ? match.homeSlotId : match.awaySlotId)
      : (match.result.homeGoals >= match.result.awayGoals ? match.homeSlotId : match.awaySlotId);
  } else if (match.status === "walkover") {
    // No hay result explícito en un walkover — se muestra el cruce sin resaltar ganador.
    ganadorId = null;
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden text-xs">
      <BracketSlotRow
        nombre={nombreSlot(match.homeSlotId)}
        goles={match.result?.homeGoals}
        penales={match.result?.penalties?.homeGoals}
        esGanador={ganadorId === match.homeSlotId}
        jugado={jugado}
      />
      <div className="border-t border-border" />
      <BracketSlotRow
        nombre={nombreSlot(match.awaySlotId)}
        goles={match.result?.awayGoals}
        penales={match.result?.penalties?.awayGoals}
        esGanador={ganadorId === match.awaySlotId}
        jugado={jugado}
      />
      {match.status === "walkover" && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground border-t border-border">Walkover</div>
      )}
    </div>
  );
}

function BracketSlotRow({
  nombre,
  goles,
  penales,
  esGanador,
  jugado,
}: {
  nombre: string;
  goles?: number;
  penales?: number;
  esGanador: boolean;
  jugado: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 px-2 py-1.5 ${esGanador ? "bg-primary/10 font-bold" : ""}`}>
      <span className="truncate">{nombre}</span>
      {jugado && (
        <span className="tabular-nums shrink-0">
          {goles}
          {penales !== undefined ? ` (${penales})` : ""}
        </span>
      )}
    </div>
  );
}