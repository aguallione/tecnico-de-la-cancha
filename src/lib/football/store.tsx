import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { FormationName, MatchSettings, Player, Style, Team, TeamConfig } from "@/lib/football/types";
import { generateSquad } from "@/lib/football/players";
import { autoLineup } from "@/lib/football/bot";

export type Screen =
  | "home"
  | "manual"
  | "setup"
  | "handoff"
  | "locker"
  | "confirm"
  | "match"
  | "stats";

export function makeTeam(config: TeamConfig): Team {
  const squad = generateSquad(20);
  const formation: FormationName = "4-4-2";
  const starting = autoLineup(squad, formation);
  const style: Style = "Equilibrado";
  const starters = squad.filter((p) => starting.includes(p.id));
  const captain = starters.reduce((a, b) => (a.overall > b.overall ? a : b), starters[0]);
  const kicker = [...starters].sort((a, b) => b.attack - a.attack)[0];
  return {
    config,
    squad,
    formation,
    starting,
    style,
    captainId: captain?.id,
    penaltyTakerId: kicker?.id,
    setPieceTakerId: kicker?.id,
    substitutionsLeft: 5,
    redCards: 0,
    yellowCards: 0,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    possession: 0,
    goals: 0,
    xg: 0,
  };
}

interface GameCtx {
  screen: Screen;
  setScreen: (s: Screen) => void;
  teams: [Team | null, Team | null];
  setTeams: (t: [Team | null, Team | null]) => void;
  settings: MatchSettings;
  setSettings: (s: MatchSettings) => void;
  activeLockerTeam: 0 | 1;
  setActiveLockerTeam: (n: 0 | 1) => void;
  reset: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [teams, setTeams] = useState<[Team | null, Team | null]>([null, null]);
  const [settings, setSettings] = useState<MatchSettings>({ injuriesEnabled: true, maxSubs: 5, vsBot: true });
  const [activeLockerTeam, setActiveLockerTeam] = useState<0 | 1>(0);

  const value = useMemo<GameCtx>(() => ({
    screen, setScreen,
    teams, setTeams,
    settings, setSettings,
    activeLockerTeam, setActiveLockerTeam,
    reset: () => {
      setTeams([null, null]);
      setActiveLockerTeam(0);
      setScreen("home");
    },
  }), [screen, teams, settings, activeLockerTeam]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export type { Player, Team };
