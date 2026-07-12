import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { GameProvider, useGame } from "@/lib/football/store";
import { OnlineGameProvider, useOnlineGame } from "@/lib/online/store";
import { HomeScreen, ManualScreen } from "@/components/football/HomeScreen";
import { SetupScreen } from "@/components/football/SetupScreen";
import { HandoffScreen } from "@/components/football/HandoffScreen";
import { LockerScreen } from "@/components/football/LockerScreen";
import { ConfirmScreen } from "@/components/football/ConfirmScreen";
import { MatchScreen } from "@/components/football/MatchScreen";
import { StatsScreen } from "@/components/football/StatsScreen";
import { TestScreen } from "@/components/football/TestScreen";
import { OnlineLobbyScreen } from "@/components/online/OnlineLobbyScreen";
import { OnlineSetupScreen } from "@/components/online/OnlineSetupScreen";
import { OnlineLockerScreen } from "@/components/online/OnlineLockerScreen";
import { OnlineMatchScreen } from "@/components/online/OnlineMatchScreen";
import { OnlineStatsScreen } from "@/components/online/OnlineStatsScreen";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AuthProvider>
      <GameProvider>
        <OnlineGameProvider>
          <Router />
        </OnlineGameProvider>
      </GameProvider>
    </AuthProvider>
  );
}

function Router() {
  const { activo, screen: onlineScreen } = useOnlineGame();
  const { screen } = useGame();

  // Online tree takes priority when a game session is active
  if (activo) {
    return <OnlineRouter screen={onlineScreen} />;
  }

  return <LocalRouter screen={screen} />;
}

function OnlineRouter({ screen }: { screen: string }) {
  switch (screen) {
    case "online-lobby": return <OnlineLobbyScreen />;
    case "online-setup": return <OnlineSetupScreen />;
    case "online-locker": return <OnlineLockerScreen />;
    case "online-match": return <OnlineMatchScreen />;
    case "online-stats": return <OnlineStatsScreen />;
    default: return <OnlineLobbyScreen />;
  }
}

function LocalRouter({ screen }: { screen: string }) {
  switch (screen) {
    case "home": return <HomeScreen />;
    case "manual": return <ManualScreen />;
    case "setup": return <SetupScreen />;
    case "handoff": return <HandoffScreen />;
    case "locker": return <LockerScreen />;
    case "confirm": return <ConfirmScreen />;
    case "match": return <MatchScreen />;
    case "stats": return <StatsScreen />;
    case "test": return <TestScreen />;
    default: return <HomeScreen />;
  }
}
