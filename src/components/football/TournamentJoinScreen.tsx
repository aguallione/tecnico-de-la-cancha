import { useState } from "react";
import { useGame } from "@/lib/football/store";
import { generateSquad } from "@/lib/football/players";
import { makeTeamFromSquad } from "@/lib/football/store";
import { SquadOriginSelector } from "@/components/football/SquadOriginSelector";
import { useAuth } from "@/hooks/use-auth";
import type { Player } from "@/lib/football/types";
import type { Tournament } from "@/lib/football/tournament-types";
import { fetchTorneoPorCodigo, unirseATorneoConCodigo } from "@/lib/football/tournament-api";

const COLORS = [
  { name: "Rojo", value: "#dc2626" },
  { name: "Azul", value: "#2563eb" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Verde", value: "#16a34a" },
  { name: "Negro", value: "#111827" },
  { name: "Blanco", value: "#f8fafc" },
  { name: "Naranja", value: "#ea580c" },
  { name: "Violeta", value: "#7c3aed" },
];

const FORMATO_LABEL: Record<Tournament["format"], string> = {
  liga_simple: "Liga",
  liga_ida_vuelta: "Liga (ida y vuelta)",
  eliminacion_directa: "Copa",
};

type Paso = "codigo" | "equipo" | "listo";

export function TournamentJoinScreen() {
  const { setScreen, setTournamentId } = useGame();
  const { user } = useAuth();

  const [paso, setPaso] = useState<Paso>("codigo");
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torneo, setTorneo] = useState<Tournament | null>(null);

  const [nombreEquipo, setNombreEquipo] = useState("");
  const [colorEquipo, setColorEquipo] = useState(COLORS[0].value);
  const [squadEquipo, setSquadEquipo] = useState<Player[]>(() => generateSquad(20));
  const [uniendo, setUniendo] = useState(false);

  async function handleBuscar() {
    if (!codigo.trim()) return;
    if (!user) {
      setError("Necesitás iniciar sesión para unirte a un torneo.");
      return;
    }
    setBuscando(true);
    setError(null);
    try {
      const t = await fetchTorneoPorCodigo(codigo.trim());
      if (!t.isOnline) {
        setError("Ese código no corresponde a un torneo online.");
        return;
      }
      if (t.status !== "armado") {
        setError("Ese torneo ya arrancó o ya terminó — no se pueden sumar más equipos.");
        return;
      }
      setTorneo(t);
      setPaso("equipo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo buscar el torneo.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleUnirse() {
    if (!torneo || !nombreEquipo.trim()) return;
    setUniendo(true);
    setError(null);
    try {
      const team = makeTeamFromSquad(
        { name: nombreEquipo.trim(), color: colorEquipo, isBot: false },
        squadEquipo,
      );
      await unirseATorneoConCodigo({
        codigo: torneo.roomCode ?? codigo.trim(),
        displayName: team.config.name,
        teamConfig: team.config,
        squad: team.squad,
        formation: team.formation,
        style: team.style,
        lineHeight: team.lineHeight,
        buildUp: team.buildUp,
        pressIntensity: team.pressIntensity,
      });
      setTournamentId(torneo.id);
      setPaso("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo unir al torneo.");
    } finally {
      setUniendo(false);
    }
  }

  if (paso === "codigo") {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="max-w-lg mx-auto">
          <button className="btn-ghost mb-4" onClick={() => setScreen("tournament_list")}>← Volver</button>
          <h1 className="font-display text-3xl font-black">Unirme a un torneo</h1>
          <div className="card p-4 mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Código del torneo
              </label>
              <input
                className="input w-full text-center text-2xl tracking-[0.3em] font-display font-black uppercase"
                maxLength={6}
                placeholder="ABCDEF"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              />
            </div>
            {error && (
              <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
                {error}
              </p>
            )}
            <button
              className="btn-primary w-full disabled:opacity-50"
              disabled={buscando || codigo.trim().length !== 6}
              onClick={handleBuscar}
            >
              {buscando ? "Buscando..." : "Buscar torneo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paso === "equipo" && torneo) {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <button className="btn-ghost mb-4" onClick={() => setPaso("codigo")}>← Volver</button>
          <h1 className="font-display text-3xl font-black">{torneo.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {FORMATO_LABEL[torneo.format]} · Armá tu equipo para anotarte
          </p>

          <div className="card p-4 mt-4">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground">
              Nombre del equipo
            </label>
            <input
              className="input mt-1 w-full"
              value={nombreEquipo}
              onChange={(e) => setNombreEquipo(e.target.value)}
              placeholder="Ej: Los Titanes"
            />
            <label className="block mt-3 text-xs uppercase tracking-wider text-muted-foreground">
              Color de camiseta
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setColorEquipo(c.value)}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    colorEquipo === c.value ? "border-primary scale-110" : "border-border"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <SquadOriginSelector onSquadReady={setSquadEquipo} />

            {error && (
              <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1 mt-3">
                {error}
              </p>
            )}

            <button
              className="btn-primary w-full mt-4 disabled:opacity-50"
              disabled={uniendo || !nombreEquipo.trim()}
              onClick={handleUnirse}
            >
              {uniendo ? "Uniéndote..." : "Unirme con este equipo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-lg mx-auto text-center">
        <h1 className="font-display text-3xl font-black">¡Listo!</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Te anotaste en {torneo?.name}. Cuando el creador complete los cupos y arranque el
          torneo, lo vas a ver actualizado en "Mis torneos".
        </p>
        <button className="btn-primary mt-6" onClick={() => setScreen("tournament_list")}>
          Ir a Mis torneos
        </button>
      </div>
    </div>
  );
}