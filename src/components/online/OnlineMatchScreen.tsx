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
 *  · Cualquier jugador puede cambiar las tácticas de su equipo: el cambio se
 *    serializa y se persiste en match_state para que el próximo tick lo tome.
 *  · Muestra marcador, minuto, posesión y relato en vivo.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useOnlineGame } from "@/lib/online/store";
import { deserializeMatchState, serializeMatchState } from "@/lib/football/serialization";
import { possessionPct, outOfPositionFactor } from "@/lib/football/engine";
import { confirmarSub, tickPartida } from "@/lib/online/server-fns";
import { guardarAjustesPartida, guardarMatchState } from "@/lib/online/api";
import { autoLineup } from "@/lib/football/bot";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import { LINE_HEIGHT_TABLE, BUILDUP_TABLE, PRESS_TABLE } from "@/lib/football/tactics";
import type { Velocidad } from "@/lib/online/types";
import type { BuildUp, FormationName, LineHeight, Position, PressIntensity, Style, Team } from "@/lib/football/types";
import type { MatchState } from "@/lib/football/engine";
import { TransferirAdminModal } from "@/components/online/TransferirAdminModal";
import { OnlineHeader } from "@/components/online/OnlineHeader";

// Milisegundos entre bloques según velocidad. "manual" no auto-avanza.
const RITMO_MS: Record<Exclude<Velocidad, "manual">, number> = {
  normal: 3500,
  rapido: 1500,
};
// Minutos simulados por bloque.
const BLOQUE_MIN = 1;

const POSITION_SHORT: Record<Position, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };

export function OnlineMatchScreen() {
  const { partida, jugadores, miJugador, soyController, soyAdmin, refrescar } =
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

  // Persiste cambios tácticos (mentalidad, formación, tácticas avanzadas) en match_state
  // para que el servidor los tome en el próximo tick.
  async function guardarCambiosTacticos(mutatedState: MatchState) {
    if (!partida) return;
    const serialized = serializeMatchState(mutatedState);
    await guardarMatchState(partida.id, serialized, "jugando");
    await refrescar();
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <OnlineHeader />
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
        <OnlineTacticsPanel
          teamIdx={panelOpen}
          state={state}
          onClose={() => setPanelOpen(null)}
          onSave={guardarCambiosTacticos}
          partidaId={partida.id}
        />
      )}

      {transferOpen && (
        <TransferirAdminModal
          partidaId={partida.id}
          jugadores={jugadores}
          adminDeviceId={partida.admin_device_id}
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
          {team.formation} · {team.style} · L:{team.lineHeight.charAt(0)} S:{team.buildUp.charAt(0)} P:{team.pressIntensity.charAt(0)}
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

// ─── Reasignación manual de posiciones en vivo ───────────────────────────────

function LiveSlotGrid({ team, onChange }: { team: Team; onChange: () => void }) {
  const slots = slotsFor(team.formation);
  const onFieldPlayers = team.squad.filter((p) => p.onField && !p.redCarded);

  function swapSlot(slotIndex: number, newPlayerId: string) {
    const current = team.starting[slotIndex];
    if (current === newPlayerId) return;
    const otherSlot = team.starting.indexOf(newPlayerId);
    if (otherSlot < 0) return;
    team.starting[otherSlot] = current;
    team.starting[slotIndex] = newPlayerId;
    for (const p of team.squad) {
      const idx = team.starting.indexOf(p.id);
      if (idx >= 0 && p.onField && !p.redCarded) {
        p.fieldPosition = slots[idx] as Position;
        p.slotIndex = idx;
      }
    }
    onChange();
  }

  const rows: Position[] = ["FWD", "MID", "DEF", "GK"];
  return (
    <div className="rounded-xl bg-pitch overflow-hidden" style={{ minHeight: 220 }}>
      <div className="relative grid grid-rows-4 h-[220px] p-2 gap-0.5">
        {rows.map((rowPos) => {
          const rowIndexes = slots.map((s, i) => (s === rowPos ? i : -1)).filter((i) => i >= 0);
          if (rowIndexes.length === 0) return null;
          return (
            <div key={rowPos} className="flex items-center justify-around gap-1">
              {rowIndexes.map((slotIdx) => {
                const playerId = team.starting[slotIdx];
                const player = team.squad.find((p) => p.id === playerId);
                const slotPos = slots[slotIdx] as Position;
                const factor = player ? outOfPositionFactor({ ...player, fieldPosition: slotPos }) : 1;
                const oop = player && factor < 1;
                const effective = player ? Math.round(player.overall * factor) : 0;
                return (
                  <label key={slotIdx} className="flex flex-col items-center text-center min-w-0 flex-1 max-w-[6rem]">
                    <span className="text-[9px] uppercase tracking-wider text-lime-200/80">{POSITION_SHORT[slotPos]}</span>
                    <select
                      value={playerId ?? ""}
                      onChange={(e) => swapSlot(slotIdx, e.target.value)}
                      className="mt-0.5 w-full appearance-none rounded bg-white/90 text-foreground text-[10px] font-medium px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary truncate"
                    >
                      {onFieldPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.overall} {POSITION_SHORT[p.position]})
                        </option>
                      ))}
                    </select>
                    {player && (
                      <div className="text-[9px] text-lime-100/70 mt-0.5">
                        {oop ? (
                          <span className="text-red-400">{player.overall} &rarr; {effective}</span>
                        ) : (
                          <span>{player.overall}</span>
                        )}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Panel táctico online (igual que el local + persistencia en DB) ──────────

function OnlineTacticsPanel({
  teamIdx,
  state,
  onClose,
  onSave,
  partidaId,
}: {
  teamIdx: 0 | 1;
  state: MatchState;
  onClose: () => void;
  onSave: (s: MatchState) => Promise<void>;
  partidaId: string;
}) {
  const { miJugador, refrescar } = useOnlineGame();

  // Copia local del equipo para que los cambios sean inmediatos en UI.
  const team = state.teams[teamIdx];
  const [, tick] = useState(0);
  const rerender = () => tick((n) => n + 1);

  const [subOutId, setSubOutId] = useState<string>("");
  const [subInId, setSubInId] = useState<string>("");
  const [enviandoSub, setEnviandoSub] = useState(false);
  const [subMsg, setSubMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  const bench = team.squad.filter((p) => !p.onField && !p.redCarded);

  async function aplicarTacticas() {
    setSaving(true);
    try {
      await onSave(state);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  async function proponerSub() {
    if (!miJugador || !subOutId || !subInId) return;
    setEnviandoSub(true);
    setSubMsg(null);
    try {
      await confirmarSub({
        data: {
          partida_id: partidaId,
          jugador_id: miJugador.id,
          sub: { outId: subOutId, inId: subInId },
        },
      });
      setSubMsg("Cambio propuesto. Se aplicará en el próximo minuto.");
      setSubOutId("");
      setSubInId("");
      await refrescar();
    } catch (e) {
      setSubMsg(e instanceof Error ? e.message : "No se pudo proponer el cambio.");
    } finally {
      setEnviandoSub(false);
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
          <h3 className="font-display text-xl font-black">{team.config.name} · Tácticas</h3>
          <button onClick={onClose} className="btn-ghost">Cerrar</button>
        </div>

        <p className="mt-1 text-xs text-muted-foreground">
          Los cambios de mentalidad, formación y táctica avanzada se guardan y el servidor los aplica en el próximo tick.
        </p>

        <div className="mt-4 grid gap-4">
          {/* Mentalidad */}
          <div>
            <div className="label">Mentalidad</div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["Ofensivo", "Equilibrado", "Defensivo"] as Style[]).map((s) => (
                <button
                  key={s}
                  className={`chip ${team.style === s ? "chip-active" : ""}`}
                  onClick={() => { team.style = s; rerender(); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Formación */}
          <div>
            <div className="label">Formación</div>
            <select
              className="input mt-1 w-full"
              value={team.formation}
              onChange={(e) => {
                team.formation = e.target.value as FormationName;
                team.starting = autoLineup(team.squad.filter((p) => !p.redCarded), team.formation);
                const slots = slotsFor(team.formation);
                for (const p of team.squad) {
                  const idx = team.starting.indexOf(p.id);
                  p.onField = idx >= 0 && !p.redCarded;
                  p.fieldPosition = idx >= 0 ? slots[idx] : undefined;
                  p.slotIndex = idx >= 0 ? idx : undefined;
                }
                rerender();
              }}
            >
              {FORMATION_LIST.map((f) => <option key={f}>{f}</option>)}
            </select>
            <div className="mt-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Reacomodar jugadores en posiciones
              </div>
              <LiveSlotGrid team={team} onChange={rerender} />
            </div>
          </div>

          {/* Táctica avanzada */}
          <div>
            <div className="label">Táctica avanzada</div>
            <div className="mt-2 space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Altura de línea</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.lineHeight === k ? "chip-active" : ""}`}
                      onClick={() => { team.lineHeight = k; rerender(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{LINE_HEIGHT_TABLE[team.lineHeight].blurb}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Salida (build-up)</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.buildUp === k ? "chip-active" : ""}`}
                      onClick={() => { team.buildUp = k; rerender(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{BUILDUP_TABLE[team.buildUp].blurb}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Intensidad de presión</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.pressIntensity === k ? "chip-active" : ""}`}
                      onClick={() => { team.pressIntensity = k; rerender(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{PRESS_TABLE[team.pressIntensity].blurb}</div>
              </div>
            </div>
          </div>

          {/* Cansancio */}
          <div>
            <div className="label">Cansancio en cancha</div>
            <div className="mt-2 space-y-1.5">
              {onField.sort((a, b) => a.stamina - b.stamina).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{p.name} <span className="text-xs text-muted-foreground">({p.position})</span></div>
                    <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.max(0, p.stamina)}%`,
                          backgroundColor: p.stamina > 70 ? "#16a34a" : p.stamina > 40 ? "#eab308" : "#dc2626",
                        }}
                      />
                    </div>
                  </div>
                  <div className="tabular-nums text-xs w-8 text-right">{Math.round(p.stamina)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón guardar tácticas */}
          <button
            className="btn-primary w-full"
            onClick={aplicarTacticas}
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar cambios tácticos"}
          </button>

          {/* Sustituciones */}
          <div className="border-t pt-4">
            <div className="label">Sustituciones ({team.substitutionsLeft} restantes)</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Según el modo de coordinación del equipo puede requerir el consenso de tus compañeros.
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input" value={subOutId} onChange={(e) => setSubOutId(e.target.value)}>
                <option value="">Sale…</option>
                {onField.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.overall} {p.position}) · {Math.round(p.stamina)}%
                  </option>
                ))}
              </select>
              <select className="input" value={subInId} onChange={(e) => setSubInId(e.target.value)}>
                <option value="">Entra…</option>
                {bench.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.overall} {p.position})
                  </option>
                ))}
              </select>
            </div>
            <button
              className="btn-secondary mt-2 w-full disabled:opacity-50"
              disabled={!subOutId || !subInId || enviandoSub || team.substitutionsLeft <= 0}
              onClick={proponerSub}
            >
              {enviandoSub ? "Enviando…" : "Proponer cambio"}
            </button>
            {subMsg && <p className="mt-2 text-xs text-muted-foreground">{subMsg}</p>}
          </div>
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
