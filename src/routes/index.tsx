import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/use-auth";
import { GameProvider, useGame } from "@/lib/football/store";
import { HomeScreen, ManualScreen } from "@/components/football/HomeScreen";
import { SetupScreen } from "@/components/football/SetupScreen";
import { HandoffScreen } from "@/components/football/HandoffScreen";
import { LockerScreen } from "@/components/football/LockerScreen";
import { ConfirmScreen } from "@/components/football/ConfirmScreen";
import { MatchScreen } from "@/components/football/MatchScreen";
import { StatsScreen } from "@/components/football/StatsScreen";
import { TestScreen } from "@/components/football/TestScreen";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router />
      </GameProvider>
    </AuthProvider>
  );
}

function Router() {
  const { screen } = useGame();
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
