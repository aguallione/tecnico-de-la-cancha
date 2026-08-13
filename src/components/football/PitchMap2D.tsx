'use client';

import { useMemo, useRef } from "react";
import type { MatchState } from "@/lib/football/engine";
import type { Player, Position, PositionGroup, MatchZone } from "@/lib/football/types";
import { POSITION_GROUP } from "@/lib/football/types";

const DEPTH_ORDER = ["area_propia", "tercio_propio", "medio", "tercio_rival", "area_rival"] as const;
const LANE_ORDER = ["izquierda", "centro", "derecha"] as const;

const LANE_BY_POSITION: Record<Position, "izquierda" | "centro" | "derecha"> = {
  POR: "centro",
  DFC: "centro", LI: "izquierda", LD: "derecha", CAI: "izquierda", CAD: "derecha",
  MCD: "centro", MC: "centro", MI: "izquierda", MD: "derecha", MCO: "centro",
  DC: "centro", SD: "centro", EI: "izquierda", ED: "derecha",
};

function depthForGroup(group: PositionGroup): typeof DEPTH_ORDER[number] {
  switch (group) {
    case "GK": return "area_propia";
    case "DEF": return "tercio_propio";
    case "FWD": return "tercio_rival";
    default: return "medio";
  }
}

/** Posición que el jugador está jugando REALMENTE en este partido (no la de nacimiento). */
function effectiveSlot(p: Player): Position {
  const fp = p.fieldPosition;
  if (fp && (fp as string) in POSITION_GROUP) return fp as Position;
  return p.position;
}

function toScreenPct(teamIdx: 0 | 1, depth: typeof DEPTH_ORDER[number], lane: typeof LANE_ORDER[number]) {
  let depthIdx = DEPTH_ORDER.indexOf(depth);
  let laneIdx = LANE_ORDER.indexOf(lane);
  if (teamIdx === 1) {
    depthIdx = DEPTH_ORDER.length - 1 - depthIdx;
    laneIdx = LANE_ORDER.length - 1 - laneIdx;
  }
  const left = (depthIdx + 0.5) * (100 / DEPTH_ORDER.length);
  const top = (laneIdx + 0.5) * (100 / LANE_ORDER.length);
  return { left, top };
}

function playerHomeZone(p: Player, teamIdx: 0 | 1) {
  const slot = effectiveSlot(p);
  const group = POSITION_GROUP[slot];
  return toScreenPct(teamIdx, depthForGroup(group), LANE_BY_POSITION[slot]);
}

const SPREAD_OFFSETS: { dx: number; dy: number }[] = [
  { dx: 0, dy: 0 },
  { dx: -3.5, dy: -3.5 },
  { dx: 3.5, dy: 3.5 },
  { dx: -3.5, dy: 3.5 },
  { dx: 3.5, dy: -3.5 },
  { dx: 0, dy: -5 },
  { dx: 0, dy: 5 },
];

export function PitchMap2D({
  state,
  stepDurationMs,
}: {
  state: MatchState;
  stepDurationMs: number;
}) {
  const clampedDuration = Math.max(300, Math.min(3000, stepDurationMs));

  const lastZone = useMemo<MatchZone | null>(() => {
    for (let i = state.events.length - 1; i >= 0; i--) {
      const z = state.events[i].zone;
      if (z) return z;
    }
    return null;
  }, [state.events.length]);

  const ballPos = lastZone
    ? toScreenPct(lastZone.team, lastZone.depth, lastZone.lane)
    : { left: 50, top: 50 };

  const jitterSeeds = useRef<Map<string, number>>(new Map());
  function seedFor(id: string) {
    if (!jitterSeeds.current.has(id)) {
      jitterSeeds.current.set(id, Math.random() * 2);
    }
    return jitterSeeds.current.get(id)!;
  }

  const [teamA, teamB] = state.teams;
  const onFieldA = teamA.squad.filter((p) => p.onField && !p.redCarded);
  const onFieldB = teamB.squad.filter((p) => p.onField && !p.redCarded);

  const cellCounts = new Map<string, number>();
  function placedPos(base: { left: number; top: number }) {
    const key = `${Math.round(base.left)}_${Math.round(base.top)}`;
    const idx = cellCounts.get(key) ?? 0;
    cellCounts.set(key, idx + 1);
    const off = SPREAD_OFFSETS[idx % SPREAD_OFFSETS.length];
    return { left: base.left + off.dx, top: base.top + off.dy };
  }

  return (
    <div className="rounded-2xl bg-pitch relative overflow-hidden border border-pitch/50" style={{ minHeight: 220 }}>
      <style>{`
        @keyframes pitchmap-breathe {
          0%, 100% { transform: translate(-50%, -50%) translate(0, 0); }
          50% { transform: translate(-50%, -50%) translate(2px, -2px); }
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-3 border border-white/30 rounded-lg" />
        <div className="absolute top-3 bottom-3 left-1/2 border-l border-white/30" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/30" />
      </div>

      <div className="relative w-full" style={{ height: 220 }}>
        {onFieldA.map((p) => {
          const pos = placedPos(playerHomeZone(p, 0));
          return <PlayerDot key={p.id} pos={pos} color={teamA.config.color} seed={seedFor(p.id)} isGk={effectiveSlot(p) === "POR"} />;
        })}
        {onFieldB.map((p) => {
          const pos = placedPos(playerHomeZone(p, 1));
          return <PlayerDot key={p.id} pos={pos} color={teamB.config.color} seed={seedFor(p.id)} isGk={effectiveSlot(p) === "POR"} />;
        })}

        <div
          className="absolute h-3 w-3 rounded-full bg-white shadow-md ring-1 ring-black/20 z-10"
          style={{
            left: `${ballPos.left}%`,
            top: `${ballPos.top}%`,
            transform: "translate(-50%, -50%)",
            transition: `left ${clampedDuration}ms ease-in-out, top ${clampedDuration}ms ease-in-out`,
          }}
        />
      </div>
    </div>
  );
}

function PlayerDot({
  pos,
  color,
  seed,
  isGk,
}: {
  pos: { left: number; top: number };
  color: string;
  seed: number;
  isGk: boolean;
}) {
  return (
    <div
      className="absolute rounded-full border border-white/60"
      style={{
        left: `${pos.left}%`,
        top: `${pos.top}%`,
        width: isGk ? 10 : 8,
        height: isGk ? 10 : 8,
        backgroundColor: isGk ? "#facc15" : color,
        animation: `pitchmap-breathe 3s ease-in-out infinite`,
        animationDelay: `${seed}s`,
      }}
    />
  );
}