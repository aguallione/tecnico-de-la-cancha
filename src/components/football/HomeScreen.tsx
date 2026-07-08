import { useGame } from "@/lib/football/store";

export function HomeScreen() {
  const { setScreen, setSettings, settings } = useGame();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-pitch text-pitch-foreground">
      <div className="max-w-lg w-full text-center">
        <div className="mb-2 tracking-[0.3em] text-xs uppercase text-lime-300/80">Simulador</div>
        <h1 className="font-display text-5xl sm:text-6xl font-black leading-none">
          Director Técnico
        </h1>
        <div className="mt-2 text-lime-200/90 font-display text-2xl">de Fútbol</div>
        <p className="mt-6 text-pitch-foreground/80 text-sm sm:text-base">
          Armá el plantel, elegí la táctica y dejá que el relator cuente el partido. Vos sos el DT.
        </p>

        <div className="mt-10 grid gap-3">
          <button
            onClick={() => { setSettings({ ...settings, vsBot: true }); setScreen("setup"); }}
            className="btn-primary"
          >
            Nueva partida vs Bot
          </button>
          <button
            onClick={() => { setSettings({ ...settings, vsBot: false }); setScreen("setup"); }}
            className="btn-secondary"
          >
            Nueva partida vs Amigo (mismo dispositivo)
          </button>
          <button onClick={() => setScreen("manual")} className="btn-ghost">
            Manual de instrucciones
          </button>
        </div>

        <div className="mt-10 text-xs text-pitch-foreground/50">v1.0 · Un dispositivo · 1v1</div>
      </div>
    </div>
  );
}

export function ManualScreen() {
  const { setScreen } = useGame();
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-6" onClick={() => setScreen("home")}>← Volver</button>
        <h1 className="font-display text-3xl font-black">Manual de instrucciones</h1>
        <div className="mt-6 space-y-5 text-sm leading-relaxed">
          <Section title="Concepto">
            No controlás jugadores en cancha: sos el Director Técnico. Armás el equipo, elegís la táctica y tomás decisiones antes y durante el partido. El motor simula el partido y un relator cuenta todo.
          </Section>
          <Section title="Armado del equipo">
            Al empezar tenés un plantel generado automáticamente con nombre, posición, puntaje general (1-99) y atributos (Ataque, Defensa, Físico, Velocidad). Elegí formación, alineación (el sistema propone una y podés reacomodar), estilo (Ofensivo/Equilibrado/Defensivo), pateador de penales, pateador de córners y capitán.
          </Section>
          <Section title="Multijugador local">
            Cada jugador humano configura su equipo por turnos. Antes de cada armado se muestra una pantalla "Pasále el dispositivo" para no espiar la táctica rival.
          </Section>
          <Section title="Durante el partido">
            El partido corre solo con relato tipo ticker. Podés cambiar mentalidad, hacer sustituciones (5 por defecto), cambiar formación y ver cansancio en cualquier momento. No hay penales al empate.
          </Section>
          <Section title="Post-partido">
            Ves estadísticas: posesión, tiros, tiros al arco, xG, córners, faltas, tarjetas y puntuación de equipo.
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h2 className="font-display text-lg font-bold text-primary">{title}</h2>
      <p className="mt-2 text-foreground/85">{children}</p>
    </div>
  );
}
