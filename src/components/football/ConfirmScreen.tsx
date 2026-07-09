import { useGame } from "@/lib/football/store";
import { previewStrength } from "@/lib/football/engine";
import type { Team } from "@/lib/football/types";

export function ConfirmScreen() {
  const { setScreen, teams, settings } = useGame();
  const [a, b] = teams;
  if (!a || !b) return null;
  const strengthA = previewStrength(a);
  const strengthB = previewStrength(b);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-black text-center">Previa del partido</h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-6">
          <TeamPreview team={a} strength={strengthA} align="right" />
          <div className="text-center">
            <div className="font-display text-5xl font-black">VS</div>
            <div className="mt-2 text-xs text-muted-foreground">
              90 min · Sin penales · {settings.maxSubs} cambios
              {settings.injuriesEnabled ? " · Lesiones ON" : ""}
            </div>
          </div>
          <TeamPreview team={b} strength={strengthB} align="left" />
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

function TeamPreview({
  team,
  strength,
  align,
}: {
  team: Team;
  strength: { attack: number; defense: number };
  align: "left" | "right";
}) {
  const isRight = align === "right";
  return (
    <div className={`card p-4 ${isRight ? "sm:text-right" : "sm:text-left"}`}>
      <div className={`flex items-center gap-3 ${isRight ? "sm:flex-row-reverse" : ""}`}>
        <span className="h-6 w-6 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
        <div className="min-w-0">
          <div className="font-display font-black text-xl truncate">{team.config.name}</div>
          <div className="text-xs text-muted-foreground">{team.formation} · {team.style}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Línea {team.lineHeight} · Salida {team.buildUp} · Presión {team.pressIntensity}
          </div>
        </div>
      </div>
      <div className={`mt-4 grid grid-cols-2 gap-3 ${isRight ? "sm:text-right" : "sm:text-left"}`}>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Ataque</div>
          <div className="font-display font-black text-3xl text-primary">{strength.attack}</div>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Defensa</div>
          <div className="font-display font-black text-3xl text-primary">{strength.defense}</div>
        </div>
      </div>
    </div>
  );
}
