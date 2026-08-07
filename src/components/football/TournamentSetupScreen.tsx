import { useState } from "react";
import { useGame } from "@/lib/football/store";
import { generateSquad } from "@/lib/football/players";
import { makeTeamFromSquad } from "@/lib/football/store";
import { autoBotTeam } from "@/lib/football/bot";
import { SquadOriginSelector } from "@/components/football/SquadOriginSelector";
import { useAuth } from "@/hooks/use-auth";
import type { Player } from "@/lib/football/types";
import type { TournamentFormat, TournamentSlot } from "@/lib/football/tournament-types";
import { crearTorneo, agregarSlot, fetchSlots, generarFixtureYArrancar } from "@/lib/football/tournament-api";

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

type Paso = "config" | "equipos";

export function TournamentSetupScreen() {
  const { setScreen, settings, tournamentId, setTournamentId } = useGame();
  const { user } = useAuth();

  const [paso, setPaso] = useState<Paso>("config");
  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<TournamentFormat>("liga_simple");
  const [targetSlotCount, setTargetSlotCount] = useState(8);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Configuración online ──────────────────────────────────────────────
  const [esOnline, setEsOnline] = useState(false);
  const [modoHorario, setModoHorario] = useState<"manual" | "automatico_simultaneo" | "automatico_escalonado">("automatico_simultaneo");
  const [intervaloHoras, setIntervaloHoras] = useState(72);
  const [horarioAleatorio, setHorarioAleatorio] = useState(false);
  const [rangoInicio, setRangoInicio] = useState("19:00");
  const [rangoFin, setRangoFin] = useState("23:00");
  const [codigoSalaCreado, setCodigoSalaCreado] = useState<string | null>(null);

  const [slots, setSlots] = useState<TournamentSlot[]>([]);
  const [arrancando, setArrancando] = useState(false);

  // ── Formulario del equipo que se está agregando ──────────────────────────
  const [nombreEquipo, setNombreEquipo] = useState("");
  const [colorEquipo, setColorEquipo] = useState(COLORS[0].value);
  const [squadEquipo, setSquadEquipo] = useState<Player[]>(() => generateSquad(20));
  const [agregando, setAgregando] = useState(false);

  async function handleCrearTorneo() {
    if (!nombre.trim()) return;
    if (!user) {
      setError("Necesitás iniciar sesión para crear un torneo.");
      return;
    }
    setCreando(true);
    setError(null);
    try {
      const torneo = await crearTorneo({
        nombre: nombre.trim(),
        formato,
        targetSlotCount,
        matchSettings: settings,
        esOnline,
        modoHorario: esOnline ? modoHorario : undefined,
        horarioAleatorio: esOnline ? horarioAleatorio : undefined,
        rangoHorarioInicio: esOnline && horarioAleatorio ? rangoInicio : undefined,
        rangoHorarioFin: esOnline && horarioAleatorio ? rangoFin : undefined,
        intervaloHoras: esOnline ? intervaloHoras : undefined,
      });
      setTournamentId(torneo.id);
      setCodigoSalaCreado(torneo.roomCode ?? null);
      setPaso("equipos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el torneo.");
    } finally {
      setCreando(false);
    }
  }

  async function handleAgregarEquipo() {
    if (!tournamentId || !nombreEquipo.trim()) return;
    setAgregando(true);
    setError(null);
    try {
      const team = makeTeamFromSquad(
        { name: nombreEquipo.trim(), color: colorEquipo, isBot: false },
        squadEquipo,
      );
      await agregarSlot({
        torneoId: tournamentId,
        displayName: team.config.name,
        teamConfig: team.config,
        squad: team.squad,
        formation: team.formation,
        style: team.style,
        lineHeight: team.lineHeight,
        buildUp: team.buildUp,
        pressIntensity: team.pressIntensity,
        ownerUserId: user?.id,
        seed: slots.length,
      });
      const actualizados = await fetchSlots(tournamentId);
      setSlots(actualizados);
      setNombreEquipo("");
      setColorEquipo(COLORS[(actualizados.length) % COLORS.length].value);
      setSquadEquipo(generateSquad(20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo agregar el equipo.");
    } finally {
      setAgregando(false);
    }
  }

  async function handleCompletarConBots() {
    if (!tournamentId) return;
    setArrancando(true);
    setError(null);
    try {
      let actuales = slots.length;
      let seed = actuales;
      while (actuales < targetSlotCount) {
        const squad = generateSquad(20);
        const team = makeTeamFromSquad(
          { name: `Bot ${seed + 1}`, color: COLORS[seed % COLORS.length].value, isBot: true },
          squad,
        );
        autoBotTeam(team);
        await agregarSlot({
          torneoId: tournamentId,
          displayName: team.config.name,
          teamConfig: team.config,
          squad: team.squad,
          formation: team.formation,
          style: team.style,
          lineHeight: team.lineHeight,
          buildUp: team.buildUp,
          pressIntensity: team.pressIntensity,
          seed,
        });
        seed++;
        actuales++;
      }
      const actualizados = await fetchSlots(tournamentId);
      setSlots(actualizados);
      await arrancarTorneo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar con bots.");
      setArrancando(false);
    }
  }

  async function arrancarTorneo() {
    if (!tournamentId) return;
    setArrancando(true);
    setError(null);
    try {
      await generarFixtureYArrancar(tournamentId);
      setScreen("tournament_hub");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo arrancar el torneo.");
      setArrancando(false);
    }
  }

  // ── Paso 1: configuración base del torneo ────────────────────────────────

  if (paso === "config") {
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="max-w-lg mx-auto">
          <button className="btn-ghost mb-4" onClick={() => setScreen("home")}>← Volver</button>
          <h1 className="font-display text-3xl font-black">Nuevo torneo</h1>

          <div className="card p-4 mt-6 space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Nombre del torneo
              </label>
              <input
                className="input w-full"
                placeholder="Ej: Liga de Verano"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Formato
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  className={`chip py-2 ${formato === "liga_simple" ? "chip-active" : ""}`}
                  onClick={() => setFormato("liga_simple")}
                >
                  Liga (todos contra todos, ida única)
                </button>
                <button
                  type="button"
                  className={`chip py-2 ${formato === "liga_ida_vuelta" ? "chip-active" : ""}`}
                  onClick={() => setFormato("liga_ida_vuelta")}
                >
                  Liga (ida y vuelta)
                </button>
                <button
                  type="button"
                  className={`chip py-2 ${formato === "eliminacion_directa" ? "chip-active" : ""}`}
                  onClick={() => setFormato("eliminacion_directa")}
                >
                  Copa (eliminación directa)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Cantidad de equipos
              </label>
              <input
                type="number"
                min={2}
                max={16}
                className="input w-24"
                value={targetSlotCount}
                onChange={(e) =>
                  setTargetSlotCount(Math.max(2, Math.min(16, parseInt(e.target.value) || 2)))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Podés arrancar con menos equipos de los que anotes acá — al arrancar vas a poder
                completar los cupos vacíos con bots, o jugar solo con los que se hayan anotado.
                {formato === "eliminacion_directa" &&
                  " Para Copa, si no llegás a una potencia de 2 (4, 8, 16), se completa con bots automáticamente."}
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Modalidad
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={`chip py-2 ${!esOnline ? "chip-active" : ""}`} onClick={() => setEsOnline(false)}>
                  Local
                </button>
                <button type="button" className={`chip py-2 ${esOnline ? "chip-active" : ""}`} onClick={() => setEsOnline(true)}>
                  Online
                </button>
              </div>
            </div>

            {esOnline && (
              <div className="rounded-lg border border-border p-3 space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    ¿Cómo se juegan los partidos?
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      className={`chip py-2 text-left px-3 ${modoHorario === "automatico_simultaneo" ? "chip-active" : ""}`}
                      onClick={() => setModoHorario("automatico_simultaneo")}
                    >
                      Automático: toda la ronda al mismo horario
                    </button>
                    <button
                      type="button"
                      className={`chip py-2 text-left px-3 ${modoHorario === "automatico_escalonado" ? "chip-active" : ""}`}
                      onClick={() => setModoHorario("automatico_escalonado")}
                    >
                      Automático: un partido tras otro, cada tanto
                    </button>
                    <button
                      type="button"
                      className={`chip py-2 text-left px-3 ${modoHorario === "manual" ? "chip-active" : ""}`}
                      onClick={() => setModoHorario("manual")}
                    >
                      Manual: yo elijo cada horario a mano
                    </button>
                  </div>
                </div>

                {modoHorario !== "manual" && (
                  <>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        {modoHorario === "automatico_simultaneo" ? "Horas entre ronda y ronda" : "Horas entre partido y partido"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="input w-24"
                        value={intervaloHoras}
                        onChange={(e) => setIntervaloHoras(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={horarioAleatorio}
                        onChange={(e) => setHorarioAleatorio(e.target.checked)}
                      />
                      Elegir el horario al azar dentro de un rango, en vez de uno fijo
                    </label>

                    {horarioAleatorio && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Desde</label>
                          <input type="time" className="input w-full" value={rangoInicio} onChange={(e) => setRangoInicio(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Hasta</label>
                          <input type="time" className="input w-full" value={rangoFin} onChange={(e) => setRangoFin(e.target.value)} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <p className="text-xs text-muted-foreground">
                  Se va a generar un código de 6 letras al crear el torneo, para que otros se anoten con su equipo.
                </p>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">
                {error}
              </p>
            )}

            <button
              className="btn-primary w-full disabled:opacity-50"
              disabled={creando || !nombre.trim()}
              onClick={handleCrearTorneo}
            >
              {creando ? "Creando..." : "Siguiente: agregar equipos →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 2: agregar equipos ───────────────────────────────────────────────

  const faltan = Math.max(0, targetSlotCount - slots.length);

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-black">{nombre}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {slots.length} de {targetSlotCount} equipos anotados
        </p>

        {codigoSalaCreado && (
          <div className="card p-4 mt-4 bg-primary/10 border border-primary/30 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Código del torneo</div>
            <div className="font-display text-3xl font-black tracking-[0.3em] mt-1">{codigoSalaCreado}</div>
            <p className="text-xs text-muted-foreground mt-1">Compartilo para que otros se anoten con su equipo.</p>
          </div>
        )}

        {slots.length > 0 && (
          <div className="card p-4 mt-4">
            <h3 className="font-display text-lg font-bold">Equipos anotados</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full inline-block"
                    style={{ backgroundColor: s.teamConfig.color }}
                  />
                  {s.displayName}
                  {s.teamConfig.isBot && (
                    <span className="text-xs text-muted-foreground">(bot)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="card p-4 mt-4">
          <h3 className="font-display font-bold text-lg">Agregar equipo</h3>
          <label className="block mt-3 text-xs uppercase tracking-wider text-muted-foreground">
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
            disabled={agregando || !nombreEquipo.trim()}
            onClick={handleAgregarEquipo}
          >
            {agregando ? "Agregando..." : "Agregar equipo al torneo"}
          </button>
        </div>

        <div className="mt-6 space-y-2">
          {slots.length >= 2 && faltan === 0 && (
            <button
              className="btn-primary w-full disabled:opacity-50"
              disabled={arrancando}
              onClick={arrancarTorneo}
            >
              {arrancando ? "Arrancando..." : "Arrancar torneo →"}
            </button>
          )}
          {slots.length >= 2 && faltan > 0 && (
            <>
              <button
                className="btn-primary w-full disabled:opacity-50"
                disabled={arrancando}
                onClick={handleCompletarConBots}
              >
                {arrancando ? "Arrancando..." : `Completar ${faltan} cupo(s) con bots y arrancar →`}
              </button>
              <button
                className="btn-secondary w-full disabled:opacity-50"
                disabled={arrancando}
                onClick={arrancarTorneo}
              >
                Arrancar solo con los {slots.length} anotados →
              </button>
            </>
          )}
          {slots.length < 2 && (
            <p className="text-xs text-muted-foreground text-center">
              Hacen falta al menos 2 equipos para arrancar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}