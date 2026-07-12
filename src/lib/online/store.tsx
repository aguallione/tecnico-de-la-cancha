'use client';
/**
 * store.tsx — OnlineGameProvider + useOnlineGame.
 *
 * Contexto separado del store local (GameProvider) para no contaminarlo.
 * Mantiene la partida activa, la lista de jugadores, el polling (3s) y el
 * heartbeat (5s). `index.tsx` detecta `activo` para renderizar el árbol online.
 *
 * La partida activa se persiste en localStorage (partida_id + jugador_id) para
 * sobrevivir a recargas de página.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  enviarHeartbeat,
  fetchJugadores,
  fetchPartida,
  getDeviceId,
  salirDeLaPartida,
} from "@/lib/online/api";
import type { JugadorOnline, OnlineScreen, PartidaOnline } from "@/lib/online/types";

const LS_PARTIDA = "dt_online_partida_id";
const LS_JUGADOR = "dt_online_jugador_id";

const POLL_MS = 3000;
const HEARTBEAT_MS = 5000;

function screenForEstado(estado: PartidaOnline["estado"] | undefined): OnlineScreen {
  switch (estado) {
    case "configurando":
      return "online-setup";
    case "vestuario":
      return "online-locker";
    case "jugando":
      return "online-match";
    case "terminado":
      return "online-stats";
    case "esperando":
    default:
      return "online-lobby";
  }
}

interface OnlineCtx {
  activo: boolean;
  partidaId: string | null;
  jugadorId: string | null;
  deviceId: string;
  partida: PartidaOnline | null;
  jugadores: JugadorOnline[];
  screen: OnlineScreen;
  loading: boolean;
  error: string | null;
  /** El jugador de este cliente. */
  miJugador: JugadorOnline | null;
  soyAdmin: boolean;
  soyController: boolean;
  entrar: (partidaId: string, jugadorId: string) => void;
  salir: () => Promise<void>;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<OnlineCtx | null>(null);

export function OnlineGameProvider({ children }: { children: ReactNode }) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [partidaId, setPartidaId] = useState<string | null>(null);
  const [jugadorId, setJugadorId] = useState<string | null>(null);
  const [partida, setPartida] = useState<PartidaOnline | null>(null);
  const [jugadores, setJugadores] = useState<JugadorOnline[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar partida activa persistida al montar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const pid = window.localStorage.getItem(LS_PARTIDA);
    const jid = window.localStorage.getItem(LS_JUGADOR);
    if (pid && jid) {
      setPartidaId(pid);
      setJugadorId(jid);
    }
  }, []);

  const refrescar = useCallback(async () => {
    if (!partidaId) return;
    try {
      const [p, js] = await Promise.all([fetchPartida(partidaId), fetchJugadores(partidaId)]);
      if (!p) {
        // La partida ya no existe: limpiar.
        setPartida(null);
        setJugadores([]);
        return;
      }
      setPartida(p);
      setJugadores(js);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al sincronizar la partida.");
    }
  }, [partidaId]);

  // Polling de lectura (3s).
  useEffect(() => {
    if (!partidaId) return;
    let cancelled = false;
    setLoading(true);
    refrescar().finally(() => {
      if (!cancelled) setLoading(false);
    });
    const id = setInterval(refrescar, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [partidaId, refrescar]);

  // Heartbeat (5s) independiente del polling.
  const jugadorIdRef = useRef<string | null>(null);
  jugadorIdRef.current = jugadorId;
  useEffect(() => {
    if (!jugadorId) return;
    enviarHeartbeat(jugadorId).catch(() => {});
    const id = setInterval(() => {
      const jid = jugadorIdRef.current;
      if (jid) enviarHeartbeat(jid).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [jugadorId]);

  const entrar = useCallback((pid: string, jid: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_PARTIDA, pid);
      window.localStorage.setItem(LS_JUGADOR, jid);
    }
    setPartidaId(pid);
    setJugadorId(jid);
    setPartida(null);
    setJugadores([]);
  }, []);

  const salir = useCallback(async () => {
    const jid = jugadorIdRef.current;
    if (jid) await salirDeLaPartida(jid).catch(() => {});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_PARTIDA);
      window.localStorage.removeItem(LS_JUGADOR);
    }
    setPartidaId(null);
    setJugadorId(null);
    setPartida(null);
    setJugadores([]);
    setError(null);
  }, []);

  const miJugador = useMemo(
    () => jugadores.find((j) => j.id === jugadorId) ?? null,
    [jugadores, jugadorId],
  );

  const soyAdmin = !!partida && partida.admin_device_id === deviceId;
  const soyController =
    !!partida && (partida.controller_device_id ?? partida.admin_device_id) === deviceId;

  const value = useMemo<OnlineCtx>(
    () => ({
      activo: !!partidaId,
      partidaId,
      jugadorId,
      deviceId,
      partida,
      jugadores,
      screen: screenForEstado(partida?.estado),
      loading,
      error,
      miJugador,
      soyAdmin,
      soyController,
      entrar,
      salir,
      refrescar,
    }),
    [
      partidaId,
      jugadorId,
      deviceId,
      partida,
      jugadores,
      loading,
      error,
      miJugador,
      soyAdmin,
      soyController,
      entrar,
      salir,
      refrescar,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnlineGame(): OnlineCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnlineGame debe usarse dentro de OnlineGameProvider");
  return ctx;
}
