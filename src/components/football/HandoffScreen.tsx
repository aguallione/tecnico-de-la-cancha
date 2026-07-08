import { useGame } from "@/lib/football/store";
import { autoBotTeam } from "@/lib/football/bot";

export function HandoffScreen() {
  const { setScreen, teams, activeLockerTeam, setActiveLockerTeam, settings } = useGame();
  const currentTeam = teams[activeLockerTeam];
  if (!currentTeam) return null;

  // Si es el bot, saltar armado automáticamente
  if (currentTeam.config.isBot) {
    autoBotTeam(currentTeam);
    // Ir directo a confirmar
    return (
      <div className="min-h-screen flex items-center justify-center bg-pitch text-pitch-foreground px-6">
        <div className="text-center max-w-md">
          <div className="text-xs uppercase tracking-[0.3em] text-lime-300/70">Rival CPU</div>
          <h2 className="mt-2 font-display text-3xl font-black">El bot preparó su equipo</h2>
          <p className="mt-3 text-pitch-foreground/80">Formación {currentTeam.formation}, estilo {currentTeam.style}.</p>
          <button className="btn-primary mt-8 w-full" onClick={() => setScreen("confirm")}>Ir a la previa →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pitch text-pitch-foreground px-6">
      <div className="text-center max-w-md">
        <div className="text-xs uppercase tracking-[0.3em] text-lime-300/70">
          {settings.vsBot ? "Tu turno" : `Turno ${activeLockerTeam + 1} de 2`}
        </div>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl font-black">
          Pasále el dispositivo a {currentTeam.config.name}
        </h2>
        <p className="mt-4 text-pitch-foreground/80">
          Que nadie más mire la pantalla. Vas a armar tu plantel y elegir tu táctica sin que el rival vea.
        </p>
        <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-lime-300/40 px-4 py-2">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: currentTeam.config.color }} />
          <span className="font-display font-bold">{currentTeam.config.name}</span>
        </div>
        <button className="btn-primary mt-10 w-full" onClick={() => setScreen("locker")}>
          Estoy listo, al vestuario →
        </button>
      </div>
    </div>
  );
}
