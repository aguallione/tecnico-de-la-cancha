'use client';
/**
 * OnlineMatchScreen — vista de partido en multijugador online.
 *
 * El motor corre SOLO en el servidor (tickPartida). Este componente:
 *  · Lee partida.match_state por polling (store) y lo deserializa para mostrar.
 *  · Si soy el controller, dispara bloques de simulación al servidor según la
 *    velocidad elegida (manual / normal / rápido).
 *  · Cualquier jugador puede proponer/confirmar sustituciones (confirmarSub);
 *    el servidor las aplica en el próximo tick respetando el modo de coop.
 *  · Muestra marcador, minuto, posesión y relato en vivo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useOnlineGame } from "@/lib/online/store";
import { deserializeMatchState } from "@/lib/football/serialization";
import { possessionPct } from "@/lib/football/engine";
import { confirmarSub, tickPartida } from "@/server/tick-partida";
import { guardarAjustesPartida } from "@/lib/online/api";
import type { Velocidad } from "@/lib/online/types";
import type { Team } from "@/lib/football/types";
import { TransferirAdminModal } from "@/components/online/TransferirAdminModal";

// Milisegundos entre bloques según velocidad. "manual" no auto-avanza.
const RITMO_MS: Record<Exclude<Velocidad, "manual">, number> = {
  normal: 3500,
  rapido: 1500,
};
// Minutos simulados por bloque.
const BLOQUE_MIN = 1;

export function OnlineMatchScreen() {
  const { partida, jugadores, miJugador, soyController, soyAdmin, deviceId, refrescar } =
    useOnlineGame();
  const [ticking, setTicking] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState<null | 0 | 1>(null);
  const tickLock = useRef(false);

  const velocidad: Velocidad = partida?.velocidad ?? "normal";

  const state = useMemo(
    () => (partida?.match_state ? deserializeMatchState(partida.match_state) : null),
    [partida?.match_state],
  );

  // Lanzar un bloque de simulación en el servidor.
  async function avanzar() {
    if (!partida || tickLock.current) return;
    if (state?.finished) return;
    tickLock.current = true;
    setTicking(true);
    try {
      await tickPartida({ data: { partida_id: partida.id, bloque: BLOQUE_MIN } });
      await refrescar();
    } catch {
      // el polling reintentará
    } finally {
      tickLock.current = false;
      setTicking(false);
    }
  }

  // Auto-avance: solo el controller y solo si la velocidad no es manual.
  useEffect(() => {
    if (!soyController) return;
    if (velocidad === "manual") return;
    if (!partida || state?.finished) return;
    const ms = RITMO_MS[velocidad];
    const id = setInterval(() => {
      void avanzar();
    }, ms);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soyController, velocidad, partida?.id, state?.finished]);

  if (!partida || !state) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Cargando partido…</p>
      </div>
    );
  }

  const [teamA, teamB] = state.teams;
  const [posA, posB] = possessionPct(state);
  const displayMinute = state.minute > 90 ? `90+${state.minute - 90}` : `${state.minute}`;
  const miEquipoIdx = miJugador?.equipo_idx ?? null;

  async function cambiarVelocidad(v: Velocidad) {
    if (!soyController || !partida) return;
    await guardarAjustesPartida(partida.id, { velocidad: v });
    await refrescar();
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Marcador */}
      <div className="sticky top-0 z-20 bg-pitch text-pitch-foreground shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <MatchTeamHeader
            team={teamA}
            align="right"
            miEquipo={miEquipoIdx === 0}
            onOpen={() => miEquipoIdx === 0 && setPanelOpen(0)}
          />
          <div className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-black tabular-nums">
              {teamA.goals} : {teamB.goals}
            </div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-lime-200/80 mt-0.5">
              {displayMinute}&apos;
            </div>
          </div>
          <MatchTeamHeader
            team={teamB}
            align="left"
            miEquipo={miEquipoIdx === 1}
            onOpen={() => miEquipoIdx === 1 && setPanelOpen(1)}
          />
        </div>

        {/* Controles del controller */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2 justify-center text-xs">
          {soyController ? (
            <>
              {velocidad === "manual" ? (
                <button className="chip" onClick={avanzar} disabled={ticking || state.finished}>
                  {ticking ? "Simulando…" : `Avanzar ${BLOQUE_MIN}'`}
                </button>
              ) : (
                <span className="chip" data-active>
                  {ticking ? "Simulando…" : "Auto"}
                </span>
              )}
              <button className="chip" onClick={() => cambiarVelocidad("manual")} data-active={velocidad === "manual"}>
                Manual
              </button>
              <button className="chip" onClick={() => cambiarVelocidad("normal")} data-active={velocidad === "normal"}>
                Normal
              </button>
              <button className="chip" onClick={() => cambiarVelocidad("rapido")} data-active={velocidad === "rapido"}>
                Rápido
              </button>
            </>
          ) : (
            <span className="text-lime-200/70">
              El control lo lleva el DT anfitrión. Podés proponer cambios en tu equipo.
            </span>
          )}
          {soyAdmin && (
            <button className="chip" onClick={() => setTransferOpen(true)}>
              Transferir control
            </button>
          )}
        </div>
      </div>

      {/* Posesión + relato */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div className="card p-3 text-xs flex items-center justify-between">
          <span>Posesión</span>
          <span className="font-display tabular-nums">
            {posA}% · {posB}%
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {[...state.events].reverse().map((ev, i) => (
            <div key={i} className={`card p-3 text-sm ${eventClass(ev.kind, ev.text)}`}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {ev.minute}&apos;
              </div>
              <div className="mt-0.5">{ev.text}</div>
            </div>
          ))}
        </div>
      </div>

      {panelOpen !== null && miEquipoIdx === panelOpen && (
        <OnlineSubPanel
          teamIdx={panelOpen}
          team={state.teams[panelOpen]}
          onClose={() => setPanelOpen(null)}
        />
      )}

      {transferOpen && (
        <TransferirAdminModal
          partidaId={partida.id}
          jugadores={jugadores}
          deviceIdActual={deviceId}
          onClose={() => setTransferOpen(false)}
          onDone={refrescar}
        />
      )}
    </div>
  );
}

function MatchTeamHeader({
  team,
  align,
  miEquipo,
  onOpen,
}: {
  team: Team;
  align: "left" | "right";
  miEquipo: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      disabled={!miEquipo}
      className={`min-w-0 flex items-center gap-2 ${
        align === "right" ? "justify-end" : "justify-start"
      } ${miEquipo ? "hover:opacity-80" : "opacity-90"}`}
    >
      {align === "left" && (
        <span
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: team.config.color }}
        />
      )}
      <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
        <div className="font-display font-black text-sm sm:text-base truncate">
          {team.config.name}
        </div>
        <div className="text-[10px] uppercase tracking-wider text-lime-200/70">
          {team.formation} · {team.style}
          {miEquipo ? " · Tu equipo" : ""}
        </div>
      </div>
      {align === "right" && (
        <span
          className="h-4 w-4 rounded-full shrink-0"
          style={{ backgroundColor: team.config.color }}
        />
      )}
    </button>
  );
}

// Panel para proponer/confirmar sustituciones (se aplican en el servidor).
function OnlineSubPanel({
  teamIdx,
  team,
  onClose,
}: {
  teamIdx: 0 | 1;
  team: Team;
  onClose: () => void;
}) {
  const { partida, miJugador, refrescar } = useOnlineGame();
  const [outId, setOutId] = useState("");
  const [inId, setInId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  const bench = team.squad.filter((p) => !p.onField && !p.redCarded);

  async function proponer() {
    if (!partida || !miJugador || !outId || !inId) return;
    setEnviando(true);
    setMsg(null);
    try {
      await confirmarSub({
        data: {
          partida_id: partida.id,
          jugador_id: miJugador.id,
          sub: { outId, inId },
        },
      });
      setMsg("Cambio propuesto. Se aplicará en el próximo minuto.");
      setOutId("");
      setInId("");
      await refrescar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo proponer el cambio.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-background text-foreground rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black">{team.config.name} · Cambios</h3>
          <button onClick={onClose} className="btn-ghost">
            Cerrar
          </button>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          Cambios restantes: {team.substitutionsLeft}. Proponé una sustitución; según el modo de
          coordinación del equipo puede requerir el consenso de tus compañeros.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="block">
            <span className="label">Sale</span>
            <select className="input mt-1 w-full" value={outId} onChange={(e) => setOutId(e.target.value)}>
              <option value="">Elegir jugador…</option>
              {onField.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.overall} {p.position}) · {Math.round(p.stamina)}%
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Entra</span>
            <select className="input mt-1 w-full" value={inId} onChange={(e) => setInId(e.target.value)}>
              <option value="">Elegir suplente…</option>
              {bench.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.overall} {p.position})
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn-primary"
            disabled={!outId || !inId || enviando || team.substitutionsLeft <= 0}
            onClick={proponer}
          >
            {enviando ? "Enviando…" : "Proponer cambio"}
          </button>

          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </div>
    </div>
  );
}

function eventClass(kind: string, text?: string): string {
  switch (kind) {
    case "goal":
      return "border-l-4 border-primary bg-primary/5";
    case "card":
      return "border-l-4 border-yellow-500";
    case "final":
      return "border-l-4 border-primary bg-primary/10";
    case "kickoff":
      return "border-l-4 border-lime-600";
    case "insight":
      return "border-l-4 border-blue-500 bg-blue-500/8";
    default:
      if (text?.startsWith("[AUTO]")) return "border-l-4 border-orange-400 bg-orange-400/8";
      if (text?.startsWith("[AVISO]")) return "border-l-4 border-yellow-400 bg-yellow-400/8";
      return "";
  }
}
