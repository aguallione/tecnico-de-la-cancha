import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/football/store";
import { fetchTorneoPartido } from "@/lib/football/tournament-api";
import { fetchPartida } from "@/lib/online/api";
import { supabase } from "@/lib/supabase";
import { avanzarPartidoTorneoEnVivo } from "@/lib/football/tournament-live-server-fns";
import { deserializeMatchState } from "@/lib/football/serialization";
import { possessionPct } from "@/lib/football/engine";
import type { TournamentFixtureMatch } from "@/lib/football/tournament-types";
import type { PartidaOnline } from "@/lib/online/types";

const MENSAJES_ESPERA = [
  "Los jugadores están entrando en calor.",
  "El árbitro revisa la cancha antes del pitazo inicial.",
  "Todavía estás a tiempo de hacer un último cambio táctico.",
  "El DT rival ya confirmó su alineación.",
  "Se siente la previa en el vestuario...",
  "__FALTAN_X__",
  "Los equipos terminan de ajustar los últimos detalles.",
  "El cuerpo técnico prepara las últimas indicaciones.",
  "Últimos minutos antes de que ruede la pelota.",
  "El árbitro y sus asistentes ultiman los preparativos.",
  "Las tribunas comienzan a llenarse.",
  "La tensión crece a medida que se acerca el comienzo.",
  "Los jugadores esperan la señal para salir.",
  "Últimos ajustes en la formación.",
  "El DT revisa por última vez el planteamiento.",
  "Se repasan las instrucciones tácticas antes de salir.",
  "La previa llega a sus últimos instantes.",
  "Los protagonistas están a punto de salir.",
  "El equipo rival termina su calentamiento.",
  "Se ultiman los detalles del espectáculo.",
  "La pelota espera por sus protagonistas.",
  "El ambiente se empieza a encender.",
  "Cada minuto que pasa nos acerca al pitazo inicial.",
  "Los últimos minutos de espera pueden cambiarlo todo.",
  "El cuarto árbitro verifica que todo esté en orden.",
  "Los equipos reciben la última autorización para salir.",
  "En cualquier momento, comienza el espectáculo.",
  "Los últimos ajustes pueden marcar la diferencia.",
  "Noventa minutos para demostrar el trabajo de toda la semana.",
  "El planteamiento está listo para ponerse a prueba.",
  "Los jugadores esperan las últimas órdenes del cuerpo técnico.",
  "Un último vistazo a la táctica antes de salir.",
  "El rival ya está preparado. ¿Tu equipo también?",
  "La concentración es máxima en ambos vestuarios.",
  "Todo lo trabajado está a punto de ponerse a prueba.",
  "El partido se gana en la cancha, pero la preparación empieza antes.",
  "La pelota todavía no rueda, pero el partido ya se empieza a jugar.",
  "La espera está por terminar. La decisión queda en manos de los protagonistas.",
];

const POLL_MS = 5000;
const ROTACION_MS = 5000;

/** Baraja un array (Fisher-Yates), sin mutar el original. */
function barajar<T>(arr: T[]): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function formatearMensaje(mensaje: string, minutosRestantes: number): string {
  if (mensaje === "__FALTAN_X__") {
    const min = Math.max(0, Math.round(minutosRestantes));
    return `Faltan ${min} minuto${min === 1 ? "" : "s"} para el pitazo inicial.`;
  }
  return mensaje;
}

export function TournamentMatchScreen() {
  const { tournamentLiveMatchId, setScreen } = useGame();

  const [match, setMatch] = useState<TournamentFixtureMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transicionando, setTransicionando] = useState(false);

  // ── Bolsa sin repetición para los mensajes rotativos ──────────────────────
  const bolsaRef = useRef<string[]>(barajar(MENSAJES_ESPERA));
  const [indiceMensaje, setIndiceMensaje] = useState(0);
  const [mensajeVisible, setMensajeVisible] = useState(true);

  // ── Polling del estado del partido ─────────────────────────────────────────
  useEffect(() => {
    if (!tournamentLiveMatchId) return;
    let cancelado = false;

    async function consultar() {
      try {
        const m = await fetchTorneoPartido(tournamentLiveMatchId!);
        if (cancelado) return;
        setMatch((anterior) => {
          if (anterior && anterior.status === "pendiente" && m.status === "en_curso") {
            setTransicionando(true);
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("¡Arrancó tu partido de torneo!");
            }
            setTimeout(() => setTransicionando(false), 2000);
          }
          return m;
        });
        setError(null);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo cargar el partido.");
      }
    }

    consultar();
    const id = setInterval(consultar, POLL_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [tournamentLiveMatchId]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // ── Rotación de mensajes (bolsa sin repetición) ────────────────────────────
  useEffect(() => {
    if (!match || match.status !== "pendiente") return;
    const id = setInterval(() => {
      setMensajeVisible(false);
      setTimeout(() => {
        setIndiceMensaje((i) => {
          const siguiente = i + 1;
          if (siguiente >= bolsaRef.current.length) {
            bolsaRef.current = barajar(MENSAJES_ESPERA);
            return 0;
          }
          return siguiente;
        });
        setMensajeVisible(true);
      }, 400);
    }, ROTACION_MS);
    return () => clearInterval(id);
  }, [match?.status]);

  const minutosRestantes = useMemo(() => {
    if (!match?.scheduledAt) return 0;
    const diffMs = new Date(match.scheduledAt).getTime() - Date.now();
    return diffMs / 60000;
  }, [match?.scheduledAt]);

  if (!tournamentLiveMatchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p>No hay ningún partido en seguimiento.</p>
          <button className="btn-primary mt-4" onClick={() => setScreen("tournament_hub")}>
            ← Volver al torneo
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="text-center">
          <p className="text-sm text-destructive-foreground bg-destructive rounded px-3 py-2">
            {error}
          </p>
          <button className="btn-primary mt-4" onClick={() => setScreen("tournament_hub")}>
            ← Volver al torneo
          </button>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando partido...</p>
      </div>
    );
  }

  if (match.status === "jugado" || match.status === "walkover") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="text-center">
          <p>Este partido ya terminó.</p>
          <button className="btn-primary mt-4" onClick={() => setScreen("tournament_hub")}>
            Ver resultado en el torneo →
          </button>
        </div>
      </div>
    );
  }

  if (transicionando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pitch text-pitch-foreground">
        <div className="text-center animate-pulse">
          <div className="text-4xl">⚽</div>
          <p className="font-display text-2xl font-black mt-3">¡Arrancó el partido!</p>
        </div>
      </div>
    );
  }

  if (match.status === "en_curso") {
    if (!match.partidaOnlineId) {
      // Ventana chica entre que el vigilante marca "en_curso" y queda
      // disponible la partidas_online — se resuelve sola en el próximo poll.
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <p className="text-muted-foreground">Preparando el partido...</p>
        </div>
      );
    }
    return (
      <TournamentLiveMatchView
        torneoPartidoId={match.id}
        partidaOnlineId={match.partidaOnlineId}
        onVolver={() => setScreen("tournament_hub")}
      />
    );
  }

  // Sala de espera (status === "pendiente")
  const mensajeActual = formatearMensaje(bolsaRef.current[indiceMensaje], minutosRestantes);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-pitch text-pitch-foreground px-6">
      <button
        className="absolute top-4 left-4 text-xs text-pitch-foreground/70 hover:text-pitch-foreground"
        onClick={() => setScreen("tournament_hub")}
      >
        ← Volver al torneo
      </button>
      <div className="text-xs uppercase tracking-[0.3em] text-lime-300/80">Sala de espera</div>
      <div className="mt-3 font-display text-3xl font-black">
        {match.scheduledAt
          ? new Date(match.scheduledAt).toLocaleString(undefined, {
              weekday: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Horario a confirmar"}
      </div>
      <div className="mt-10 h-16 flex items-center justify-center max-w-md text-center">
        <p
          className={`text-lime-100/90 transition-all duration-500 ${
            mensajeVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {mensajeActual}
        </p>
      </div>
    </div>
  );
}

const POLL_PARTIDA_MS = 5000;

/**
 * Vista de partido de torneo online en vivo. A diferencia de
 * OnlineMatchScreen, NO usa OnlineGameProvider (ese contexto asume un
 * modelo de "jugadores uniéndose a una sala", que no aplica acá — cada
 * lado ya es dueño de un torneo_slot desde antes). Lee partidas_online
 * directo con fetchPartida, y dispara avanzarPartidoTorneoEnVivo cada
 * pocos segundos para que el partido avance suave mientras alguien mira
 * — es seguro llamarla más de una vez o desde varios espectadores a la
 * vez, calcula el minuto objetivo por tiempo real transcurrido, no por
 * cuántas veces se invoca. Sin controles de velocidad ni panel táctico
 * todavía (eso queda para una pasada de pulido posterior) — por ahora es
 * de solo mirar, ideal para cuando el dueño del equipo no está presente.
 */
function TournamentLiveMatchView({
  torneoPartidoId,
  partidaOnlineId,
  onVolver,
}: {
  torneoPartidoId: string;
  partidaOnlineId: string;
  onVolver: () => void;
}) {
  const [partida, setPartida] = useState<PartidaOnline | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disparandoRef = useRef(false);

  useEffect(() => {
    let cancelado = false;

    async function consultar() {
      try {
        const p = await fetchPartida(partidaOnlineId);
        if (cancelado || !p) return;
        setPartida(p);
        setError(null);

        if (p.estado === "jugando" && !disparandoRef.current) {
          disparandoRef.current = true;
          supabase.auth
            .getSession()
            .then(({ data: sessionData }) => {
              const accessToken = sessionData.session?.access_token;
              if (!accessToken) throw new Error("Necesitás iniciar sesión para ver este partido.");
              return avanzarPartidoTorneoEnVivo({
                data: { torneo_partido_id: torneoPartidoId },
                headers: { Authorization: `Bearer ${accessToken}` },
              });
            })
            .catch(() => {})
            .finally(() => {
              disparandoRef.current = false;
            });
        }
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo cargar el partido.");
      }
    }

    consultar();
    const id = setInterval(consultar, POLL_PARTIDA_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
  }, [partidaOnlineId, torneoPartidoId]);

  const state = useMemo(
    () => (partida?.match_state ? deserializeMatchState(partida.match_state) : null),
    [partida?.match_state],
  );

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="text-center">
          <p className="text-sm text-destructive-foreground bg-destructive rounded px-3 py-2">
            {error}
          </p>
          <button className="btn-secondary mt-4" onClick={onVolver}>
            ← Volver al torneo
          </button>
        </div>
      </div>
    );
  }

  if (!partida || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-muted-foreground">Cargando partido...</p>
      </div>
    );
  }

  const [teamA, teamB] = state.teams;
  const [posA, posB] = possessionPct(state);
  const displayMinute = state.minute > 90 ? `90+${state.minute - 90}` : `${state.minute}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-16">
      <div className="sticky top-0 z-20 bg-pitch text-pitch-foreground shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="text-right min-w-0">
            <div className="font-display font-black text-sm sm:text-base truncate">
              {teamA.config.name}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-lime-200/70">
              {teamA.formation} · {teamA.style}
            </div>
          </div>
          <div className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-black tabular-nums">
              {teamA.goals} : {teamB.goals}
            </div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-lime-200/80 mt-0.5">
              {state.finished ? "Final" : `${displayMinute}'`}
            </div>
          </div>
          <div className="text-left min-w-0">
            <div className="font-display font-black text-sm sm:text-base truncate">
              {teamB.config.name}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-lime-200/70">
              {teamB.formation} · {teamB.style}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="card p-3 text-xs flex items-center justify-between">
          <span>Posesión</span>
          <span className="font-display tabular-nums">
            {posA}% · {posB}%
          </span>
        </div>
        {state.finished && (
          <div className="card p-3 mt-3 text-center bg-primary/10 border border-primary/30">
            <p className="text-sm">Este partido ya terminó.</p>
            <button className="btn-primary mt-2" onClick={onVolver}>
              Volver al torneo →
            </button>
          </div>
        )}
        <div className="mt-3 space-y-2">
          {[...state.events].reverse().map((ev, i) => (
            <div key={i} className="card p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {ev.minute}'
              </div>
              <div className="mt-0.5">{ev.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
