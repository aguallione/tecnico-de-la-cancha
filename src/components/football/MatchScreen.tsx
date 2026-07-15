import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/football/store";
import { initMatch, substitute, tickMinute, possessionPct, outOfPositionFactor, type MatchState } from "@/lib/football/engine";
import { autoLineup } from "@/lib/football/bot";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import { LINE_HEIGHT_TABLE, BUILDUP_TABLE, PRESS_TABLE } from "@/lib/football/tactics";
import type { BuildUp, FormationName, LineHeight, Player, Position, PositionGroup, PressIntensity, Style, Team } from "@/lib/football/types";
import { POSITION_GROUP } from "@/lib/football/types";

const POSITION_SHORT: Record<Position, string> = {
  POR: "POR",
  DFC: "DFC", LI: "LI", LD: "LD", CAI: "CAI", CAD: "CAD",
  MCD: "MCD", MC: "MC", MI: "MI", MD: "MD", MCO: "MCO",
  DC: "DC", SD: "SD", EI: "EI", ED: "ED",
};
const GROUP_SHORT: Record<PositionGroup, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };

// Emergency formation used when a player is sent off
const EMERGENCY_FORMATION: FormationName = "5-3-2";

const TICK_MS = 900;

export function MatchScreen() {
  const { setScreen, teams, settings, setLastMatchStats } = useGame();
  const [a, b] = teams;
  const stateRef = useRef<MatchState | null>(null);
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [paused, setPaused] = useState(false);
  const [panelOpen, setPanelOpen] = useState<null | 0 | 1>(null);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!a || !b) return;
    stateRef.current = initMatch([a, b], settings);
    rerender();
  }, [a, b, settings]);

  const [redCardDialog, setRedCardDialog] = useState<{ teamIdx: 0 | 1 } | null>(null);

  useEffect(() => {
    if (!stateRef.current) return;
    if (paused) return;
    if (stateRef.current.finished) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (!s || s.finished) return;
      tickMinute(s);
      // Bot AI: hacer 1-2 sustituciones simples si tiene fatigados
      const bot = s.teams.find((t) => t.config.isBot);
      if (bot && bot.substitutionsLeft > 0 && s.minute >= 60 && s.minute % 10 === 0) {
        const tired = bot.squad
          .filter((p) => p.onField && !p.redCarded)
          .sort((x, y) => x.stamina - y.stamina)[0];
        if (tired && tired.stamina < 55) {
          const replacement = bot.squad
            .filter((p) => !p.onField && !p.redCarded && p.position === tired.position)
            .sort((x, y) => y.overall - x.overall)[0];
          if (replacement) substitute(s, s.teams.indexOf(bot) as 0 | 1, tired.id, replacement.id);
        }
      }
      // Pause for red card dialog on human team (only in interactive / non-bot mode)
      if (s.redCardPausePending !== null && !s.settings.vsBot === false) {
        // vsBot=false means 2-player mode — still pause. Always pause on human red.
        setPaused(true);
        setRedCardDialog({ teamIdx: s.redCardPausePending });
        s.redCardPausePending = null;
      } else if (s.redCardPausePending !== null) {
        // vsBot=true: also pause to ask the human
        setPaused(true);
        setRedCardDialog({ teamIdx: s.redCardPausePending });
        s.redCardPausePending = null;
      }
      rerender();
      if (s.finished) {
        setLastMatchStats(s.playerStats);
        setTimeout(() => setScreen("stats"), 1500);
      }
    }, TICK_MS / speed);
    return () => clearInterval(id);
  }, [paused, speed, stateRef.current?.finished]);

  const state = stateRef.current;
  if (!state) return null;
  const [teamA, teamB] = state.teams;
  const displayMinute = state.minute > 90 ? `90+${state.minute - 90}` : `${state.minute}`;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Marcador */}
      <div className="sticky top-0 z-20 bg-pitch text-pitch-foreground shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <TeamHeader team={teamA} align="right" onOpen={() => setPanelOpen(0)} isHuman={!teamA.config.isBot} />
          <div className="text-center">
            <div className="font-display text-3xl sm:text-4xl font-black tabular-nums">
              {teamA.goals} : {teamB.goals}
            </div>
            <div className="text-[11px] tracking-[0.2em] uppercase text-lime-200/80 mt-0.5">{displayMinute}'</div>
          </div>
          <TeamHeader team={teamB} align="left" onOpen={() => setPanelOpen(1)} isHuman={!teamB.config.isBot} />
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2 justify-center text-xs">
          <button className="chip" onClick={() => setPaused((p) => !p)}>{paused ? "▶ Reanudar" : "⏸ Pausar relato"}</button>
          <button className="chip" onClick={() => setSpeed(1)} data-active={speed === 1}>1x</button>
          <button className="chip" onClick={() => setSpeed(2)} data-active={speed === 2}>2x</button>
          <button className="chip" onClick={() => setSpeed(4)} data-active={speed === 4}>4x</button>
        </div>
      </div>

      {/* Relato */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <Ticker state={state} />
      </div>

      {redCardDialog !== null && state && (
        <RedCardDialog
          teamIdx={redCardDialog.teamIdx}
          state={state}
          onClose={(accepted) => {
            setRedCardDialog(null);
            if (accepted && state) {
              // Apply emergency formation: 5-3-2 (removes a forward slot)
              const team = state.teams[redCardDialog.teamIdx];
              team.formation = "5-3-2";
              team.starting = autoLineup(team.squad.filter((p) => !p.redCarded), "5-3-2");
              const slots = slotsFor("5-3-2");
              for (const p of team.squad) {
                const idx = team.starting.indexOf(p.id);
                p.onField = idx >= 0 && !p.redCarded;
                p.fieldPosition = idx >= 0 ? slots[idx] : undefined;
                p.slotIndex = idx >= 0 ? idx : undefined;
              }
            }
            setPaused(false);
            rerender();
          }}
        />
      )}

      {panelOpen !== null && (
        <TacticsPanel
          teamIdx={panelOpen}
          state={state}
          onClose={() => { setPanelOpen(null); rerender(); }}
          onChange={rerender}
        />
      )}
    </div>
  );
}

function TeamHeader({ team, align, onOpen, isHuman }: { team: Team; align: "left" | "right"; onOpen: () => void; isHuman: boolean }) {
  return (
    <button
      onClick={onOpen}
      disabled={!isHuman}
      className={`min-w-0 flex items-center gap-2 ${align === "right" ? "justify-end" : "justify-start"} ${isHuman ? "hover:opacity-80" : "opacity-90"}`}
    >
      {align === "left" && <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />}
      <div className={`min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
        <div className="font-display font-black text-sm sm:text-base truncate">{team.config.name}</div>
        <div className="text-[10px] uppercase tracking-wider text-lime-200/70">
          {team.formation} · {team.style} · L:{team.lineHeight.charAt(0)} S:{team.buildUp.charAt(0)} P:{team.pressIntensity.charAt(0)}
          {isHuman ? " · Tocá" : ""}
        </div>
      </div>
      {align === "right" && <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />}
    </button>
  );
}

function Ticker({ state }: { state: MatchState }) {
  const events = [...state.events].reverse();
  const [posA, posB] = possessionPct(state);
  return (
    <div>
      <div className="card p-3 text-xs flex items-center justify-between">
        <span>Posesión</span>
        <span className="font-display tabular-nums">{posA}% · {posB}%</span>
      </div>
      <div className="mt-3 space-y-2">
        {events.map((ev, i) => (
          <div key={i} className={`card p-3 text-sm ${eventClass(ev.kind, ev.text)}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ev.minute}'</div>
            <div className="mt-0.5">{ev.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function eventClass(kind: string, text?: string): string {
  switch (kind) {
    case "goal": return "border-l-4 border-primary bg-primary/5";
    case "card": return "border-l-4 border-yellow-500";
    case "final": return "border-l-4 border-primary bg-primary/10";
    case "kickoff": return "border-l-4 border-lime-600";
    case "insight": return "border-l-4 border-blue-500 bg-blue-500/8";
    default:
      if (text?.startsWith("[AUTO]")) return "border-l-4 border-orange-400 bg-orange-400/8";
      if (text?.startsWith("[AVISO]")) return "border-l-4 border-yellow-400 bg-yellow-400/8";
      return "";
  }
}

function RedCardDialog({ teamIdx, state, onClose }: {
  teamIdx: 0 | 1;
  state: MatchState;
  onClose: (accepted: boolean) => void;
}) {
  const team = state.teams[teamIdx];
  const onFieldCount = team.squad.filter((p) => p.onField && !p.redCarded).length;
  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background text-foreground rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-red-500 mb-4">
            <span className="text-white font-black text-sm sr-only">Roja</span>
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-white" aria-hidden="true"><rect x="4" y="3" width="10" height="14" rx="1"/></svg>
          </div>
          <h3 className="font-display text-xl font-black">Jugador expulsado</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Tu equipo ({team.config.name}) se queda con {onFieldCount} jugadores en cancha.
            ¿Querés pasar a una formación de emergencia (5-3-2)?
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Si decís que no, el partido continúa con la formación actual y un hombre menos.
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            className="btn-secondary"
            onClick={() => onClose(false)}
          >
            No, seguir igual
          </button>
          <button
            className="btn-primary"
            onClick={() => onClose(true)}
          >
            Si, 5-3-2 emergencia
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reasignación manual de posiciones en vivo ───────────────────────────────

function LiveSlotGrid({ team, onChange }: { team: Team; onChange: () => void }) {
  const slots = slotsFor(team.formation);

  // Solo jugadores actualmente en cancha y sin tarjeta roja.
  // Esta función NO permite traer jugadores del banco: solo intercambia posiciones
  // entre los 11 (o menos, si hubo expulsión) que ya están jugando.
  const onFieldPlayers = team.squad.filter((p) => p.onField && !p.redCarded);

  function swapSlot(slotIndex: number, newPlayerId: string) {
    const current = team.starting[slotIndex];
    if (current === newPlayerId) return;
    const otherSlot = team.starting.indexOf(newPlayerId);
    if (otherSlot >= 0) {
      // Ambos son titulares en cancha: intercambiar slots entre sí.
      team.starting[otherSlot] = current;
    } else {
      // El jugador destino no está en starting (no debería pasar con el filtro,
      // pero como salvaguarda lo ignoramos sin hacer nada).
      return;
    }
    team.starting[slotIndex] = newPlayerId;
    // Actualizar fieldPosition y slotIndex solo para los jugadores en cancha afectados.
    for (const p of team.squad) {
      const idx = team.starting.indexOf(p.id);
      if (idx >= 0 && p.onField && !p.redCarded) {
        p.fieldPosition = slots[idx]; // slots devuelve PositionGroup[]
        p.slotIndex = idx;
      }
    }
    onChange();
  }

  const rows: PositionGroup[] = ["FWD", "MID", "DEF", "GK"];
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
                const slotGroup = slots[slotIdx]; // PositionGroup
                const factor = player ? outOfPositionFactor({ ...player, fieldPosition: slotGroup }) : 1;
                const oop = player && factor < 1;
                const effective = player ? Math.round(player.overall * factor) : 0;
                return (
                  <label key={slotIdx} className="flex flex-col items-center text-center min-w-0 flex-1 max-w-[6rem]">
                    <span className="text-[9px] uppercase tracking-wider text-lime-200/80">{GROUP_SHORT[slotGroup]}</span>
                    <select
                      value={playerId ?? ""}
                      onChange={(e) => swapSlot(slotIdx, e.target.value)}
                      className="mt-0.5 w-full appearance-none rounded bg-white/90 text-foreground text-[10px] font-medium px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary truncate"
                    >
                      {/* Solo jugadores que ya están en cancha — sin banco */}
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

function TacticsPanel({ teamIdx, state, onClose, onChange }: {
  teamIdx: 0 | 1; state: MatchState; onClose: () => void; onChange: () => void;
}) {
  const team = state.teams[teamIdx];
  const onField = team.squad.filter((p) => p.onField && !p.redCarded);
  const [subOutId, setSubOutId] = useState<string>("");
  const [subInId, setSubInId] = useState<string>("");
  const bench = team.squad.filter((p) => !p.onField && !p.redCarded);

  return (
    <div className="fixed inset-0 z-30 bg-black/60 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-background text-foreground rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black">{team.config.name} · Tácticas</h3>
          <button onClick={onClose} className="btn-ghost">Cerrar</button>
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <div className="label">Mentalidad</div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              {(["Ofensivo", "Equilibrado", "Defensivo"] as Style[]).map((s) => (
                <button key={s} className={`chip ${team.style === s ? "chip-active" : ""}`}
                  onClick={() => { team.style = s; onChange(); }}>{s}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="label">Formación</div>
            <select className="input mt-1 w-full" value={team.formation}
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
                onChange();
              }}>
              {FORMATION_LIST.map((f) => <option key={f}>{f}</option>)}
            </select>
            {/* Reasignación manual de posiciones */}
            <div className="mt-2">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                Reacomodar jugadores en posiciones
              </div>
              <LiveSlotGrid team={team} onChange={onChange} />
            </div>
          </div>

          <div>
            <div className="label">Táctica avanzada</div>
            <div className="mt-2 space-y-3">
              {/* Altura de línea */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Altura de línea</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.lineHeight === k ? "chip-active" : ""}`}
                      onClick={() => { team.lineHeight = k; onChange(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{LINE_HEIGHT_TABLE[team.lineHeight].blurb}</div>
              </div>
              {/* Salida (build-up) */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Salida (build-up)</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.buildUp === k ? "chip-active" : ""}`}
                      onClick={() => { team.buildUp = k; onChange(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{BUILDUP_TABLE[team.buildUp].blurb}</div>
              </div>
              {/* Intensidad de presión */}
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Intensidad de presión</div>
                <div className="grid grid-cols-3 gap-1">
                  {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => (
                    <button
                      key={k}
                      className={`chip text-xs py-1.5 ${team.pressIntensity === k ? "chip-active" : ""}`}
                      onClick={() => { team.pressIntensity = k; onChange(); }}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{PRESS_TABLE[team.pressIntensity].blurb}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="label">Cansancio en cancha</div>
            <div className="mt-2 space-y-1.5">
              {onField.sort((a, b) => a.stamina - b.stamina).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{p.name} <span className="text-xs text-muted-foreground">({p.position})</span></div>
                    <div className="h-1.5 bg-muted rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full" style={{
                        width: `${Math.max(0, p.stamina)}%`,
                        backgroundColor: p.stamina > 70 ? "#16a34a" : p.stamina > 40 ? "#eab308" : "#dc2626",
                      }} />
                    </div>
                  </div>
                  <div className="tabular-nums text-xs w-8 text-right">{Math.round(p.stamina)}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="label">Sustituciones ({team.substitutionsLeft} restantes)</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select className="input" value={subOutId} onChange={(e) => setSubOutId(e.target.value)}>
                <option value="">Sale...</option>
                {onField.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="input" value={subInId} onChange={(e) => setSubInId(e.target.value)}>
                <option value="">Entra...</option>
                {bench.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.position} {p.overall})</option>)}
              </select>
            </div>
            <button
              disabled={team.substitutionsLeft === 0 || !subOutId || !subInId}
              className="btn-primary mt-2 w-full disabled:opacity-50"
              onClick={() => {
                if (substitute(state, teamIdx, subOutId, subInId)) {
                  setSubOutId(""); setSubInId(""); onChange();
                }
              }}
            >
              Hacer cambio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
