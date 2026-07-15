import { useState } from "react";
import { LogIn, LogOut, User, Wifi, WifiOff } from "lucide-react";
import { useGame } from "@/lib/football/store";
import { useAuth } from "@/hooks/use-auth";
import { useOnlineGame } from "@/lib/online/store";
import { crearPartida, unirsePorCodigo } from "@/lib/online/api";
import { AuthModal } from "@/components/football/AuthModal";

export function HomeScreen() {
  const { setScreen, setSettings, settings, setTestMode } = useGame();
  const { user, signOut, loading: authLoading } = useAuth();
  const { entrar } = useOnlineGame();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [onlineModal, setOnlineModal] = useState<"create" | "join" | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-pitch text-pitch-foreground">
      {/* Barra de sesión */}
      <div className="fixed top-4 right-4 z-40">
        {!authLoading && (
          user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-pitch-foreground/70 flex items-center gap-1">
                <User size={12} />
                {user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 text-xs text-pitch-foreground/70 hover:text-pitch-foreground transition-colors border border-pitch-foreground/20 rounded px-2 py-1"
                aria-label="Cerrar sesión"
              >
                <LogOut size={12} />
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="flex items-center gap-1 text-xs text-pitch-foreground/70 hover:text-pitch-foreground transition-colors border border-pitch-foreground/20 rounded px-2 py-1"
              aria-label="Iniciar sesión"
            >
              <LogIn size={12} />
              Iniciar sesión
            </button>
          )
        )}
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        reason="Iniciá sesión para guardar y cargar equipos entre sesiones."
      />

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
            onClick={() => { setSettings({ ...settings, vsBot: true }); setTestMode(false); setScreen("setup"); }}
            className="btn-primary"
          >
            Nueva partida vs Bot
          </button>
          <button
            onClick={() => { setSettings({ ...settings, vsBot: false }); setTestMode(false); setScreen("setup"); }}
            className="btn-secondary"
          >
            Nueva partida vs Amigo (mismo dispositivo)
          </button>

          {/* Separador online */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 border-t border-pitch-foreground/20" />
            <span className="text-xs text-pitch-foreground/50 uppercase tracking-wider flex items-center gap-1">
              <Wifi size={11} /> Online
            </span>
            <div className="flex-1 border-t border-pitch-foreground/20" />
          </div>

          <button
            onClick={() => setOnlineModal("create")}
            className="btn-primary"
          >
            Crear partida online
          </button>
          <button
            onClick={() => setOnlineModal("join")}
            className="btn-secondary"
          >
            Unirse con código
          </button>

          <button
            onClick={() => { setTestMode(true); setScreen("test"); }}
            className="btn-ghost"
          >
            Modo de prueba (testing)
          </button>
          <button onClick={() => setScreen("manual")} className="btn-ghost">
            Manual de instrucciones
          </button>
        </div>

        <div className="mt-10 text-xs text-pitch-foreground/50">v1.0 · Local y Online</div>
      </div>

      {onlineModal === "create" && (
        <CreateOnlineModal
          onClose={() => setOnlineModal(null)}
          onCreated={(pid, jid) => { entrar(pid, jid); setOnlineModal(null); }}
        />
      )}
      {onlineModal === "join" && (
        <JoinOnlineModal
          onClose={() => setOnlineModal(null)}
          onJoined={(pid, jid) => { entrar(pid, jid); setOnlineModal(null); }}
        />
      )}
    </div>
  );
}

function CreateOnlineModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (partidaId: string, jugadorId: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!nombre.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { partida, jugador } = await crearPartida(nombre.trim());
      onCreated(partida.id, jugador.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al crear la partida.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-6 bg-background text-foreground relative">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Wifi size={18} /> Crear partida online
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Se generará un código de 6 letras para compartir con el rival.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Tu nombre
            </label>
            <input
              className="input w-full"
              placeholder="Ej: Marcelo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              autoFocus
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !nombre.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? "Creando..." : "Crear partida"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function JoinOnlineModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (partidaId: string, jugadorId: string) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [equipo, setEquipo] = useState<0 | 1>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    if (!nombre.trim() || !codigo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { partida, jugador } = await unirsePorCodigo(codigo.trim(), nombre.trim(), equipo);
      onJoined(partida.id, jugador.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Código inválido o partida no encontrada.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-sm p-6 bg-background text-foreground relative">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <WifiOff size={18} /> Unirse con código
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Ingresá el código de 6 letras que te compartió el anfitrión.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Tu nombre
            </label>
            <input
              className="input w-full"
              placeholder="Ej: Claudio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Código de partida
            </label>
            <input
              className="input w-full tracking-[0.3em] uppercase font-display text-lg"
              placeholder="ABC123"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              maxLength={6}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Equipo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([0, 1] as const).map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setEquipo(idx)}
                  className={`chip py-2 ${equipo === idx ? "chip-active" : ""}`}
                  disabled={loading}
                >
                  Equipo {idx + 1}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">{error}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleJoin}
              disabled={loading || !nombre.trim() || codigo.length < 6}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {loading ? "Uniéndose..." : "Unirse"}
            </button>
          </div>
        </div>
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
            Al empezar tenés un plantel generado automáticamente con nombre, posición, puntaje general (1-99) y 6 atributos (Pase, Tiro, Regate, Defensa, Físico, Velocidad). Elegí formación, alineación (el sistema propone una y podés reacomodar), estilo (Ofensivo/Equilibrado/Defensivo), pateador de penales, pateador de córners y capitán.
          </Section>
          <Section title="Multijugador local">
            Cada jugador humano configura su equipo por turnos. Antes de cada armado se muestra una pantalla "Pasále el dispositivo" para no espiar la táctica rival.
          </Section>
          <Section title="Multijugador online">
            Creá una partida desde la pantalla de inicio y compartí el código de 6 letras. El rival se une con ese código. Cada equipo puede tener múltiples jugadores con distintos modos de coordinación (libre, roles, consenso, tiempos).
          </Section>
          <Section title="Durante el partido">
            El partido corre solo con relato tipo ticker. Podés cambiar mentalidad, hacer sustituciones (5 por defecto), cambiar formación y ver cansancio en cualquier momento. No hay penales al empate.
          </Section>
          <Section title="Post-partido">
            Ves estadísticas: posesión, tiros, tiros al arco, xG, córners, faltas, tarjetas, atajadas del arquero y valoraciones de jugadores (1-10).
          </Section>
          <Section title="Modo de prueba">
            Permite armar dos equipos manualmente, jugador por jugador, y repetir el mismo partido varias veces para verificar el motor de simulación.
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
