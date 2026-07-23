import { useState } from "react";
import { useGame, makeTeam } from "@/lib/football/store";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import { autoLineup } from "@/lib/football/bot";
import { computePlayerPositionRating } from "@/lib/football/engine";
import { LINE_HEIGHT_TABLE, BUILDUP_TABLE, PRESS_TABLE } from "@/lib/football/tactics";
import type { BuildUp, FormationName, LineHeight, Player, Position, PositionGroup, PressIntensity, Team } from "@/lib/football/types";
import { POSITION_GROUP } from "@/lib/football/types";

const POSITION_SHORT: Record<Position, string> = {
  POR: "POR",
  DFC: "DFC", LI: "LI", LD: "LD", CAI: "CAI", CAD: "CAD",
  MCD: "MCD", MC: "MC", MI: "MI", MD: "MD", MCO: "MCO",
  DC: "DC", SD: "SD", EI: "EI", ED: "ED",
};
const GROUP_SHORT: Record<PositionGroup, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };

export function TestScreen() {
  const { setTeams, setScreen, settings, setTestMode } = useGame();
  const [teamA, setTeamA] = useState<Team>(() => makeTeam({ name: "Equipo A", color: "#2563eb", isBot: false }));
  const [teamB, setTeamB] = useState<Team>(() => makeTeam({ name: "Equipo B", color: "#dc2626", isBot: false }));
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);

  function swap(team: 0 | 1, slotIndex: number, newPlayerId: string) {
    const t = team === 0 ? teamA : teamB;
    t.starting[slotIndex] = newPlayerId;
    const slots = slotsFor(t.formation);
    for (const p of t.squad) {
      const idx = t.starting.indexOf(p.id);
      p.onField = idx >= 0;
      p.fieldPosition = idx >= 0 ? slots[idx] : undefined;
      p.slotIndex = idx >= 0 ? idx : undefined;
    }
    rerender();
  }

  function changeFormation(team: 0 | 1, f: FormationName) {
    const t = team === 0 ? teamA : teamB;
    t.formation = f;
    t.starting = autoLineup(t.squad, f);
    const slots = slotsFor(f);
    for (const p of t.squad) {
      const idx = t.starting.indexOf(p.id);
      p.onField = idx >= 0;
      p.fieldPosition = idx >= 0 ? slots[idx] : undefined;
      p.slotIndex = idx >= 0 ? idx : undefined;
    }
    rerender();
  }

  function startMatch() {
    setTeams([teamA, teamB]);
    setTestMode(true);
    setScreen("match");
  }

  function back() {
    setTestMode(false);
    setScreen("home");
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <button className="btn-ghost mb-4" onClick={back}>← Volver</button>
        <h1 className="font-display text-3xl font-black">Modo de prueba</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Armá los dos equipos manualmente, jugador por jugador, y repetí el mismo partido para verificar el motor.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <TeamSetup team={teamA} label="Equipo A" onSwap={(i, id) => swap(0, i, id)} onFormation={(f) => changeFormation(0, f)} onChange={rerender} />
          <TeamSetup team={teamB} label="Equipo B" onSwap={(i, id) => swap(1, i, id)} onFormation={(f) => changeFormation(1, f)} onChange={rerender} />
        </div>

        <div className="mt-8 flex gap-3">
          <button className="btn-primary flex-1" onClick={startMatch}>Iniciar partido de prueba →</button>
        </div>
      </div>
    </div>
  );
}

function TeamSetup({ team, label, onSwap, onFormation, onChange }: {
  team: Team;
  label: string;
  onSwap: (slotIndex: number, newPlayerId: string) => void;
  onFormation: (f: FormationName) => void;
  onChange: () => void;
}) {
  const slots = slotsFor(team.formation);
  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  const oopCount = starters.filter((p, i) => p.position !== slots[i]).length;
  const baseAvg = Math.round(starters.reduce((s, p) => s + p.overall, 0) / 11);
  const effAvg = Math.round(starters.reduce((s, p, i) => s + computePlayerPositionRating(p, slots[i]), 0) / 11);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: team.config.color }} />
        <h2 className="font-display font-bold text-lg">{label}</h2>
      </div>

      <label className="block mt-3 text-xs uppercase tracking-wider text-muted-foreground">Formación</label>
      <select
        className="input mt-1 w-full"
        value={team.formation}
        onChange={(e) => onFormation(e.target.value as FormationName)}
      >
        {FORMATION_LIST.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      {/* Táctica avanzada */}
      <div className="mt-3 space-y-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Altura de línea</div>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => (
              <button
                key={k}
                className={`chip text-xs py-1 ${team.lineHeight === k ? "chip-active" : ""}`}
                onClick={() => { team.lineHeight = k; onChange(); }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{LINE_HEIGHT_TABLE[team.lineHeight].blurb}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Salida (build-up)</div>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => (
              <button
                key={k}
                className={`chip text-xs py-1 ${team.buildUp === k ? "chip-active" : ""}`}
                onClick={() => { team.buildUp = k; onChange(); }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{BUILDUP_TABLE[team.buildUp].blurb}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Intensidad de presión</div>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => (
              <button
                key={k}
                className={`chip text-xs py-1 ${team.pressIntensity === k ? "chip-active" : ""}`}
                onClick={() => { team.pressIntensity = k; onChange(); }}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{PRESS_TABLE[team.pressIntensity].blurb}</div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {slots.map((slotGroup, i) => {
          const p = team.squad.find((pp) => pp.id === team.starting[i]);
          if (!p) return null;
          const effective = computePlayerPositionRating(p, slotGroup);
          const oop = effective !== p.overall;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-xs font-bold w-10 text-muted-foreground">{GROUP_SHORT[slotGroup]}</span>
              <select
                className="input flex-1 text-xs"
                value={p.id}
                onChange={(e) => onSwap(i, e.target.value)}
              >
                {team.squad.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} ({sp.overall} {POSITION_SHORT[sp.position]})
                  </option>
                ))}
              </select>
              <span className="font-display font-bold tabular-nums w-8 text-right">{p.overall}</span>
              {oop && <span className="font-display font-bold tabular-nums w-8 text-right text-red-500">{effective}</span>}
              {!oop && <span className="w-8" />}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs">
        <span className="text-muted-foreground">Promedio base: <b className="text-foreground">{baseAvg}</b></span>
        {oopCount > 0 && (
          <span className="text-red-400">
            Efectivo: <b>{effAvg}</b> · {oopCount} fuera de posición
          </span>
        )}
      </div>
    </div>
  );
}
