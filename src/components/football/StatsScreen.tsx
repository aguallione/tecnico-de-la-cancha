import { useGame } from "@/lib/football/store";
import type { Team } from "@/lib/football/types";

export function StatsScreen() {
  const { teams, reset } = useGame();
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
    ["Córners", a.corners, b.corners],
    ["Faltas", a.fouls, b.fouls],
    ["Amarillas", a.yellowCards, b.yellowCards],
    ["Rojas", a.redCards, b.redCards],
    ["Puntaje del equipo", teamRating(a), teamRating(b)],
  ];

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
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="btn-primary flex-1" onClick={reset}>Nueva partida</button>
        </div>
      </div>
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

function teamRating(team: Team): number {
  const s = team.squad.filter((p) => team.starting.includes(p.id));
  if (!s.length) return 0;
  return Math.round(s.reduce((a, p) => a + p.overall, 0) / s.length);
}
