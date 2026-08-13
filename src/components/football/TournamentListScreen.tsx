import { useEffect, useState } from "react";
import { useGame } from "@/lib/football/store";
import { useAuth } from "@/hooks/use-auth";
import { fetchMisTorneos } from "@/lib/football/tournament-api";
import type { Tournament } from "@/lib/football/tournament-types";

const ESTADO_LABEL: Record<Tournament["status"], string> = {
  armado: "Armado (falta arrancar)",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const FORMATO_LABEL: Record<Tournament["format"], string> = {
  liga_simple: "Liga",
  liga_ida_vuelta: "Liga (ida y vuelta)",
  eliminacion_directa: "Copa",
};

export function TournamentListScreen() {
  const { setScreen, setTournamentId } = useGame();
  const { user } = useAuth();
  const [torneos, setTorneos] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function cargar() {
      setLoading(true);
      try {
        const data = await fetchMisTorneos();
        if (!cancelado) { setTorneos(data); setError(null); }
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudieron cargar tus torneos.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    }
    cargar();
    return () => { cancelado = true; };
  }, []);

  function entrar(t: Tournament) {
    setTournamentId(t.id);
    setScreen(t.status === "armado" ? "tournament_setup" : "tournament_hub");
  }

  /**
   * Un torneo armado solo se puede retomar desde acá si sos el creador —
   * TournamentSetupScreen todavía no sabe leer un torneo ya existente
   * (bug conocido, anotado en la adenda). Un participante que se unió con
   * código a un torneo ajeno todavía armado solo puede esperar.
   */
  function puedeEntrar(t: Tournament): boolean {
    return t.status !== "armado" || t.createdByUserId === user?.id;
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-4" onClick={() => setScreen("home")}>← Volver</button>
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-black">Mis torneos</h1>
          <button className="btn-secondary text-sm shrink-0" onClick={() => setScreen("tournament_join")}>
            Unirme con código
          </button>
        </div>

        {loading && <p className="text-muted-foreground text-sm mt-4">Cargando...</p>}
        {error && (
          <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1 mt-4">{error}</p>
        )}

        {!loading && !error && torneos.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">
            Todavía no creaste ningún torneo.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {torneos.map((t) =>
            puedeEntrar(t) ? (
              <button
                key={t.id}
                onClick={() => entrar(t)}
                className="card p-4 w-full text-left hover:opacity-90 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display font-bold truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {FORMATO_LABEL[t.format]} · {ESTADO_LABEL[t.status]}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">Entrar →</span>
                </div>
              </button>
            ) : (
              <div key={t.id} className="card p-4 w-full opacity-70">
                <div className="min-w-0">
                  <div className="font-display font-bold truncate">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {FORMATO_LABEL[t.format]} · Esperando que el creador arranque el torneo
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}