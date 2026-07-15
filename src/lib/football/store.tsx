import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { AutomationRules, FormationName, MatchSettings, Player, PlayerMatchStats, Style, Team, TeamConfig } from "@/lib/football/types";
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
  | "stats"
  | "test";

export function makeTeam(config: TeamConfig): Team {
  const squad = generateSquad(20);
  return makeTeamFromSquad(config, squad);
}

/**
 * Igual que makeTeam pero acepta un plantel ya construido (desde archivo o API).
 * Garantiza que los jugadores tengan los campos de estado dinámico correctos y
 * no toca los atributos, por lo que el motor los trata exactamente igual que los
 * jugadores generados automáticamente.
 */
export function makeTeamFromSquad(config: TeamConfig, squad: Player[]): Team {
  // Normalizar estado dinámico por si el plantel viene de una fuente externa
  const normalizedSquad: Player[] = squad.map((p) => ({
    ...p,
    stamina: 100,
    onField: false,
    redCarded: false,
    yellowCards: 0,
    injured: false,
    fieldPosition: undefined,
    slotIndex: undefined,
  }));

  const formation: FormationName = "4-4-2";
  const starting = autoLineup(normalizedSquad, formation);
  const style: Style = "Equilibrado";
  const starters = normalizedSquad.filter((p) => starting.includes(p.id));
  const captain = starters.length
    ? starters.reduce((a, b) => (a.overall > b.overall ? a : b), starters[0])
    : normalizedSquad[0];
  const kicker = starters.length
    ? [...starters].sort((a, b) => b.shooting - a.shooting)[0]
    : normalizedSquad[0];
  return {
    config,
    squad: normalizedSquad,
    formation,
    starting,
    style,
    lineHeight: "Media",
    buildUp: "Equilibrado",
    pressIntensity: "Media",
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
    saves: 0,
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
  testMode: boolean;
  setTestMode: (v: boolean) => void;
  lastMatchStats: Record<string, PlayerMatchStats>;
  setLastMatchStats: (s: Record<string, PlayerMatchStats>) => void;
  reset: () => void;
}

const Ctx = createContext<GameCtx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("home");
  const [teams, setTeams] = useState<[Team | null, Team | null]>([null, null]);
  const defaultAutomations: AutomationRules = { closingDown: false, exploitRedCard: false, staminaAlert: false };
  const [settings, setSettings] = useState<MatchSettings>({ injuriesEnabled: true, maxSubs: 5, vsBot: true, automations: defaultAutomations, seeRivalSquad: true, seeRivalRatings: true, seeOwnRatings: true });
  const [activeLockerTeam, setActiveLockerTeam] = useState<0 | 1>(0);
  const [testMode, setTestMode] = useState(false);
  const [lastMatchStats, setLastMatchStats] = useState<Record<string, PlayerMatchStats>>({});

  const value = useMemo<GameCtx>(() => ({
    screen, setScreen,
    teams, setTeams,
    settings, setSettings,
    activeLockerTeam, setActiveLockerTeam,
    testMode, setTestMode,
    lastMatchStats, setLastMatchStats,
    reset: () => {
      setTeams([null, null]);
      setActiveLockerTeam(0);
      setTestMode(false);
      setLastMatchStats({});
      setScreen("home");
    },
  }), [screen, teams, settings, activeLockerTeam, testMode, lastMatchStats]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame(): GameCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export type { Player, Team };
