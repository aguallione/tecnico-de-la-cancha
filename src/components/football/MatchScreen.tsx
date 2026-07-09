import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "@/lib/football/store";
import { initMatch, substitute, tickMinute, possessionPct, type MatchState } from "@/lib/football/engine";
import { autoLineup } from "@/lib/football/bot";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import type { FormationName, Style, Team } from "@/lib/football/types";

const TICK_MS = 900;

export function MatchScreen() {
  const { setScreen, teams, settings } = useGame();
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
      rerender();
      if (s.finished) {
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
        <div className="text-[10px] uppercase tracking-wider text-lime-200/70">{team.formation} · {team.style}{isHuman ? " · Tocá para tácticas" : ""}</div>
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
          <div key={i} className={`card p-3 text-sm ${eventClass(ev.kind)}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{ev.minute}'</div>
            <div className="mt-0.5">{ev.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function eventClass(kind: string): string {
  switch (kind) {
    case "goal": return "border-l-4 border-primary bg-primary/5";
    case "card": return "border-l-4 border-yellow-500";
    case "final": return "border-l-4 border-primary bg-primary/10";
    case "kickoff": return "border-l-4 border-lime-600";
    default: return "";
  }
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
