import { useGame } from "@/lib/football/store";

export function ConfirmScreen() {
  const { setScreen, teams, settings } = useGame();
  const [a, b] = teams;
  if (!a || !b) return null;
  const avg = (t: typeof a) => Math.round(
    t.squad.filter((p) => t.starting.includes(p.id)).reduce((s, p) => s + p.overall, 0) / 11,
  );

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-black text-center">Previa del partido</h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-6">
          <TeamPreview team={a} rating={avg(a)} align="right" />
          <div className="text-center">
            <div className="font-display text-5xl font-black">VS</div>
            <div className="mt-2 text-xs text-muted-foreground">
              90 min · Sin penales · {settings.maxSubs} cambios
              {settings.injuriesEnabled ? " · Lesiones ON" : ""}
            </div>
          </div>
          <TeamPreview team={b} rating={avg(b)} align="left" />
        </div>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <button className="btn-secondary sm:flex-1" onClick={() => setScreen("home")}>Cancelar</button>
          <button className="btn-primary sm:flex-1" onClick={() => setScreen("match")}>
            ¡Que ruede la pelota! →
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamPreview({ team, rating, align }: { team: any; rating: number; align: "left" | "right" }) {
  return (
    <div className={`card p-4 ${align === "right" ? "sm:text-right" : "sm:text-left"}`}>
      <div className={`flex items-center gap-3 ${align === "right" ? "sm:flex-row-reverse" : ""}`}>
        <span className="h-6 w-6 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
        <div className="min-w-0">
          <div className="font-display font-black text-xl truncate">{team.config.name}</div>
          <div className="text-xs text-muted-foreground">{team.formation} · {team.style}</div>
        </div>
      </div>
      <div className="mt-3">
        <span className="text-xs text-muted-foreground">Nivel promedio</span>
        <div className="font-display font-black text-4xl text-primary">{rating}</div>
      </div>
    </div>
  );
}
