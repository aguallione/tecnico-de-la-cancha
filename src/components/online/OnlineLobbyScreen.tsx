'use client';
/**
 * OnlineLobbyScreen.tsx
 *
 * Sala de espera: código para compartir, jugadores por equipo, selección de
 * plantel (el líder de cada equipo elige), selector de modo coop (si el equipo
 * tiene >1 jugador) y arranque de la configuración (solo Admin).
 */

import { useMemo, useState } from "react";
import { Check, Copy, LogOut, Users, Wifi, WifiOff } from "lucide-react";
import { makeTeamFromSquad } from "@/lib/football/store";
import type { Player } from "@/lib/football/types";
import { useOnlineGame } from "@/lib/online/store";
import { estaConectado, type JugadorOnline, type ModoCoop } from "@/lib/online/types";
import {
  actualizarEstado,
  cambiarEquipo,
  guardarEquipo,
  guardarModoCoop,
} from "@/lib/online/api";
import { OnlineEquipoSelector } from "@/components/online/OnlineEquipoSelector";
import { TransferirAdminModal } from "@/components/online/TransferirAdminModal";
import { OnlineHeader } from "@/components/online/OnlineHeader";

const TEAM_COLORS: [string, string] = ["#dc2626", "#2563eb"];

const MODO_LABEL: Record<ModoCoop, string> = {
  libre: "Libre",
  roles: "Roles divididos",
  consenso: "Consenso absoluto",
  tiempos: "Gestión por tiempos",
};

const MODO_DESC: Record<ModoCoop, string> = {
  libre: "Cualquier integrante puede editar la alineación y hacer cambios.",
  roles: "Un jugador controla la alineación, el resto las sustituciones.",
  consenso: "Todos deben confirmar antes de avanzar y para cada sustitución.",
  tiempos: "El control de la alineación rota entre jugadores por bloques de tiempo.",
};

export function OnlineLobbyScreen() {
  const { partida, partidaId, jugadores, miJugador, soyAdmin, salir, refrescar } = useOnlineGame();
  const [copied, setCopied] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const equipos = useMemo(
    () => ({
      0: jugadores.filter((j) => j.equipo_idx === 0),
      1: jugadores.filter((j) => j.equipo_idx === 1),
    }),
    [jugadores],
  );

  if (!partida || !partidaId || !miJugador) {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Cargando sala...</div>;
  }

  // Líder de un equipo = jugador con unido_en más antiguo de ese equipo.
  function liderDe(idx: 0 | 1): JugadorOnline | null {
    const arr = equipos[idx];
    if (arr.length === 0) return null;
    return [...arr].sort((a, b) => new Date(a.unido_en).getTime() - new Date(b.unido_en).getTime())[0];
  }

  const miEquipo = miJugador.equipo_idx as 0 | 1;
  const soyLider = liderDe(miEquipo)?.id === miJugador.id;

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(partida!.codigo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function elegirEquipo(idx: 0 | 1) {
    if (miJugador!.equipo_idx === idx) return;
    setError(null);
    try {
      await cambiarEquipo(miJugador!.id, idx);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cambiar de equipo.");
    }
  }

  async function elegirPlantel(squad: Player[], label: string) {
    setError(null);
    try {
      const team = makeTeamFromSquad(
        { name: `Equipo ${miEquipo + 1}`, color: TEAM_COLORS[miEquipo], isBot: false },
        squad,
      );
      await guardarEquipo(partidaId!, miEquipo, team);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar el plantel.");
    }
  }

  async function elegirModo(modo: ModoCoop) {
    setError(null);
    try {
      await guardarModoCoop(partidaId!, miEquipo, modo);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar el modo.");
    }
  }

  async function iniciarConfiguracion() {
    setError(null);
    try {
      await actualizarEstado(partidaId!, "configurando");
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al iniciar la configuración.");
    }
  }

  const equipoSeleccionado = miEquipo === 0 ? partida.equipo_0 : partida.equipo_1;
  const ambosEquiposConPlantel = !!partida.equipo_0 && !!partida.equipo_1;
  const unoPorEquipo = equipos[0].length >= 1 && equipos[1].length >= 1;
  const puedeIniciar = soyAdmin && ambosEquiposConPlantel && unoPorEquipo;

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <OnlineHeader />
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-2xl sm:text-3xl font-black">Sala online</h1>
          <button onClick={() => salir()} className="btn-ghost text-sm flex items-center gap-1">
            <LogOut size={14} /> Salir
          </button>
        </div>

        {/* Código para compartir */}
        <div className="card p-5 mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="label">Código de la partida</div>
            <div className="font-display text-4xl font-black tracking-[0.3em] mt-1">{partida.codigo}</div>
            <p className="text-xs text-muted-foreground mt-1">Compartí este código para que se unan.</p>
          </div>
          <button onClick={copiarCodigo} className="btn-secondary flex items-center gap-2">
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        {error && (
          <div className="mt-4 text-sm text-destructive-foreground bg-destructive rounded-md px-3 py-2">{error}</div>
        )}

        {/* Equipos */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((idx) => (
            <TeamColumn
              key={idx}
              idx={idx}
              jugadores={equipos[idx]}
              miJugadorId={miJugador.id}
              tienePlantel={idx === 0 ? !!partida.equipo_0 : !!partida.equipo_1}
              modo={idx === 0 ? partida.modo_coop_0 : partida.modo_coop_1}
              soyDeEsteEquipo={miEquipo === idx}
              onElegir={() => elegirEquipo(idx)}
            />
          ))}
        </div>

        {/* Selección de plantel (solo el líder de mi equipo) */}
        <div className="card p-4 mt-6">
          <h2 className="font-display font-bold text-lg flex items-center gap-2">
            <Users size={18} /> Tu equipo (Equipo {miEquipo + 1})
          </h2>
          {soyLider ? (
            <>
              <p className="text-xs text-muted-foreground mt-1">
                Sos el líder del equipo: elegí el plantel{equipos[miEquipo].length > 1 ? " y el modo de coordinación" : ""}.
              </p>
              <OnlineEquipoSelector onSquadReady={elegirPlantel} />
              {equipoSeleccionado && (
                <p className="mt-2 text-xs text-primary">Plantel del equipo cargado ({equipoSeleccionado.squad.length} jug.)</p>
              )}

              {equipos[miEquipo].length > 1 && (
                <div className="mt-4">
                  <div className="label mb-2">Modo de coordinación</div>
                  <div className="grid gap-2">
                    {(Object.keys(MODO_LABEL) as ModoCoop[]).map((m) => {
                      const activo = (miEquipo === 0 ? partida.modo_coop_0 : partida.modo_coop_1) === m;
                      return (
                        <button
                          key={m}
                          onClick={() => elegirModo(m)}
                          className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                            activo ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{MODO_LABEL[m]}</div>
                          <div className="text-xs text-muted-foreground">{MODO_DESC[m]}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              El líder del equipo (quien entró primero) elige el plantel y el modo. Esperá a que confirme.
            </p>
          )}
        </div>

        {/* Acciones de admin */}
        <div className="mt-6 flex flex-wrap gap-3">
          {soyAdmin && (
            <>
              <button
                className="btn-primary flex-1 min-w-[12rem] disabled:opacity-50"
                onClick={iniciarConfiguracion}
                disabled={!puedeIniciar}
              >
                Iniciar configuración →
              </button>
              <button className="btn-secondary" onClick={() => setTransferOpen(true)}>
                Transferir control
              </button>
            </>
          )}
          {!soyAdmin && (
            <p className="text-sm text-muted-foreground">
              Esperando a que el Admin inicie la configuración de la partida...
            </p>
          )}
        </div>
        {soyAdmin && !puedeIniciar && (
          <p className="mt-2 text-xs text-muted-foreground">
            Se necesita al menos un jugador por equipo y que ambos equipos tengan un plantel cargado.
          </p>
        )}
      </div>

      {transferOpen && (
        <TransferirAdminModal
          partidaId={partidaId}
          jugadores={jugadores}
          adminDeviceId={partida.admin_device_id}
          onClose={() => setTransferOpen(false)}
          onDone={refrescar}
        />
      )}
    </div>
  );
}

function TeamColumn({
  idx,
  jugadores,
  miJugadorId,
  tienePlantel,
  modo,
  soyDeEsteEquipo,
  onElegir,
}: {
  idx: 0 | 1;
  jugadores: JugadorOnline[];
  miJugadorId: string;
  tienePlantel: boolean;
  modo: ModoCoop;
  soyDeEsteEquipo: boolean;
  onElegir: () => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: TEAM_COLORS[idx] }} />
          <h3 className="font-display font-bold">Equipo {idx + 1}</h3>
        </div>
        {tienePlantel && <span className="text-xs text-primary">Plantel listo</span>}
      </div>

      <ul className="mt-3 space-y-1.5 min-h-[3rem]">
        {jugadores.length === 0 ? (
          <li className="text-xs text-muted-foreground">Sin jugadores todavía.</li>
        ) : (
          jugadores.map((j) => {
            const conectado = estaConectado(j);
            return (
              <li key={j.id} className="flex items-center gap-2 text-sm">
                {conectado ? (
                  <Wifi size={13} className="text-primary shrink-0" />
                ) : (
                  <WifiOff size={13} className="text-muted-foreground shrink-0" />
                )}
                <span className={`truncate ${j.id === miJugadorId ? "font-semibold" : ""}`}>
                  {j.nombre}
                  {j.id === miJugadorId ? " (vos)" : ""}
                </span>
                {j.rol === "admin" && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">Admin</span>
                )}
              </li>
            );
          })
        )}
      </ul>

      {jugadores.length > 1 && (
        <div className="mt-2 text-[11px] text-muted-foreground">Modo: {MODO_LABEL[modo]}</div>
      )}

      {!soyDeEsteEquipo && (
        <button onClick={onElegir} className="btn-ghost text-xs mt-3 w-full">
          Unirme a este equipo
        </button>
      )}
    </div>
  );
}
