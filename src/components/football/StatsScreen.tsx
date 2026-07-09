import { useGame } from "@/lib/football/store";
import { outOfPositionFactor, computePlayerRating, computeTeamRating } from "@/lib/football/engine";
import type { Team, PlayerMatchStats } from "@/lib/football/types";

export function StatsScreen() {
  const { teams, reset, testMode, setScreen, setTeams, lastMatchStats } = useGame();
  const [a, b] = teams;
  if (!a || !b) return null;

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

  function repeatMatch() {
    setScreen("match");
  }

  function newTestMatch() {
    setTeams([null, null]);
    setScreen("test");
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-black text-center">Final del partido</h1>
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
                <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="text-left font-display tabular-nums">{vb}</div>
              </div>
            ))}
            <div className="grid grid-cols-3 items-center gap-2 text-sm pt-2 border-t">
              <div className="text-right font-display tabular-nums">{computeTeamRating(a, lastMatchStats)}</div>
              <div className="text-center text-xs uppercase tracking-wider text-muted-foreground">Valoración del equipo</div>
              <div className="text-left font-display tabular-nums">{computeTeamRating(b, lastMatchStats)}</div>
            </div>
          </div>
        </div>

        {/* Arqueros */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <GKCard team={a} shotsOnTargetReceived={b.shotsOnTarget} />
          <GKCard team={b} shotsOnTargetReceived={a.shotsOnTarget} />
        </div>

        {/* Valoraciones por jugador */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <PlayerRatings team={a} stats={lastMatchStats} />
          <PlayerRatings team={b} stats={lastMatchStats} />
        </div>

        {/* Panel de verificación de consistencia — solo en modo test */}
        {testMode && <ConsistencyCheck teamA={a} teamB={b} stats={lastMatchStats} />}

        <div className="mt-6 flex gap-3">
          {testMode ? (
            <>
              <button className="btn-secondary flex-1" onClick={newTestMatch}>Nuevo test</button>
              <button className="btn-primary flex-1" onClick={repeatMatch}>Repetir partido</button>
            </>
          ) : null}
          <button className="btn-ghost flex-1" onClick={reset}>{testMode ? "Salir" : "Nueva partida"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Verificación de consistencia del motor (solo en modo test) ───────────────
function ConsistencyCheck({
  teamA,
  teamB,
  stats,
}: {
  teamA: Team;
  teamB: Team;
  stats: Record<string, PlayerMatchStats>;
}) {
  interface Check {
    label: string;
    expected: number;
    got: number;
  }

  function checksFor(team: Team, rival: Team): Check[] {
    // Invariante 1: goles del marcador == suma de goles individuales
    const goalsFromStats = Object.values(stats)
      .filter((s) => team.squad.some((p) => p.id === s.playerId))
      .reduce((sum, s) => sum + s.goals, 0);

    // Invariante 2: atajadas + goles_recibidos == tiros_al_arco_recibidos
    // Los tiros al arco recibidos del equipo = shotsOnTarget del rival.
    const goalsReceived = rival.goals;
    const shotsOnTargetReceived = rival.shotsOnTarget;

    return [
      { label: `${team.config.name}: goles marcador`, expected: goalsFromStats, got: team.goals },
      {
        label: `${team.config.name}: atajadas+goles_rec == tiros_al_arco_rec`,
        expected: shotsOnTargetReceived,
        got: team.saves + goalsReceived,
      },
    ];
  }

  const checks: Check[] = [...checksFor(teamA, teamB), ...checksFor(teamB, teamA)];
  const allOk = checks.every((c) => c.expected === c.got);

  return (
    <div
      className={`mt-6 rounded-xl border p-4 ${
        allOk
          ? "border-green-500/40 bg-green-500/10"
          : "border-red-500/40 bg-red-500/10"
      }`}
    >
      <h2 className="font-display font-bold text-sm uppercase tracking-wider">
        {allOk ? "Consistencia del motor: OK" : "Consistencia del motor: ERROR"}
      </h2>
      <div className="mt-3 space-y-1.5">
        {checks.map((c) => {
          const ok = c.expected === c.got;
          return (
            <div key={c.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-muted-foreground">{c.label}</span>
              <span
                className={`font-display font-bold tabular-nums ${
                  ok ? "text-green-400" : "text-red-400"
                }`}
              >
                {ok ? `${c.got} ✓` : `esperado ${c.expected}, got ${c.got} ✗`}
              </span>
            </div>
          );
        })}
      </div>
      {!allOk && (
        <div className="mt-3 text-xs text-red-400">
          Hay inconsistencias — revisar el motor antes de continuar.
        </div>
      )}
    </div>
  );
}

function TeamCol({ team, align }: { team: Team; align: "left" | "right" }) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`flex items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
        <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
        <div className="font-display font-black truncate">{team.config.name}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{team.formation} · {team.style}</div>
    </div>
  );
}

function GKCard({ team, shotsOnTargetReceived }: { team: Team; shotsOnTargetReceived: number }) {
  const gk = team.squad.find((p) => p.fieldPosition === "GK" && team.starting.includes(p.id));
  if (!gk) return null;
  const factor = outOfPositionFactor(gk);
  const effective = Math.round(gk.overall * factor);
  const oop = factor < 1;
  // saves + goals_received = shotsOnTargetReceived (invariante garantizada por el engine)
  return (
    <div className="card p-4">
      <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">Arquero</h3>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <div className="font-display font-bold">{gk.name}</div>
          <div className="text-xs text-muted-foreground">
            {gk.position === "GK" ? "Arquero natural" : `Juega de ${gk.position} · FUERA DE POSICIÓN`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Puntaje base → efectivo</div>
          <div className="font-display font-black text-lg">
            {gk.overall}
            {oop && <span className="text-red-500"> → {effective}</span>}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground">Atajadas</div>
          <div className="font-display font-bold text-xl">{team.saves}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground">Tiros al arco recibidos</div>
          <div className="font-display font-bold text-xl">{shotsOnTargetReceived}</div>
        </div>
      </div>
      {oop && (
        <div className="mt-2 text-xs text-red-400">
          Penalización aplicada: -{Math.round((1 - factor) * 100)}% por jugar fuera de posición
        </div>
      )}
    </div>
  );
}

function PlayerRatings({ team, stats }: { team: Team; stats: Record<string, PlayerMatchStats> }) {
  // Preserve the starting order defined in team.starting so index-based slot lookups are consistent,
  // but we no longer use slots at all — p.fieldPosition is the single source of truth set by initMatch.
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
          // Use the field position that was actually assigned in the locker screen / initMatch.
          const factor = outOfPositionFactor(p);
          const oop = factor < 1;
          return (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">
                {p.name}
                {oop && (
                  <span className="text-xs text-red-400 ml-1">
                    ({p.position}→{p.fieldPosition})
                  </span>
                )}
              </span>
              {ps?.goals ? <span className="text-xs text-green-500">⚽{ps.goals}</span> : null}
              {ps?.saves ? <span className="text-xs text-blue-500">🧤{ps.saves}</span> : null}
              <span className={`font-display font-bold tabular-nums w-10 text-right ${rating >= 7 ? "text-green-500" : rating < 5 ? "text-red-400" : ""}`}>
                {rating.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
