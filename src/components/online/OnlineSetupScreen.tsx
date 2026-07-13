'use client';
/**
 * OnlineSetupScreen.tsx
 *
 * Configuración de la partida. Solo el Admin edita MatchSettings, velocidad y
 * tamaño de bloque; el resto lo ve en modo lectura. Al confirmar, el Admin
 * guarda la configuración y pasa la partida al estado 'vestuario'.
 */

import { useState } from "react";
import type { AutomationRules, MatchSettings } from "@/lib/football/types";
import { useOnlineGame } from "@/lib/online/store";
import type { Velocidad } from "@/lib/online/types";
import { actualizarEstado, guardarAjustesPartida, guardarConfiguracion } from "@/lib/online/api";

const DEFAULT_AUTOMATIONS: AutomationRules = {
  closingDown: false,
  exploitRedCard: false,
  staminaAlert: false,
};

const DEFAULT_SETTINGS: MatchSettings = {
  injuriesEnabled: true,
  maxSubs: 5,
  vsBot: false,
  automations: DEFAULT_AUTOMATIONS,
  seeRivalSquad: true,
  seeRivalRatings: true,
  seeOwnRatings: true,
};

const VELOCIDAD_LABEL: Record<Velocidad, string> = {
  manual: "Manual (el controlador avanza bloque a bloque)",
  normal: "Automático normal (~2s por bloque)",
  rapido: "Automático rápido (~0.5s por bloque)",
};

export function OnlineSetupScreen() {
  const { partida, partidaId, soyAdmin, refrescar } = useOnlineGame();
  const [settings, setSettings] = useState<MatchSettings>(partida?.configuracion ?? DEFAULT_SETTINGS);
  const [velocidad, setVelocidad] = useState<Velocidad>(partida?.velocidad ?? "manual");
  const [bloque, setBloque] = useState<number>(partida?.bloque_minutos ?? 5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!partida || !partidaId) {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Cargando...</div>;
  }

  // Vista de solo lectura para no-admins.
  if (!soyAdmin) {
    const c = partida.configuracion ?? DEFAULT_SETTINGS;
    return (
      <div className="min-h-screen bg-background text-foreground px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-black">Configuración de la partida</h1>
          <p className="text-muted-foreground text-sm mt-1">El Admin está configurando la partida...</p>
          <div className="card p-4 mt-6 space-y-2 text-sm">
            <ReadRow label="Lesiones" value={c.injuriesEnabled ? "Sí" : "No"} />
            <ReadRow label="Máximo de cambios" value={String(c.maxSubs)} />
            <ReadRow label="Ver plantel rival" value={c.seeRivalSquad ? "Sí" : "No"} />
            <ReadRow label="Ver valoraciones rival" value={c.seeRivalRatings ? "Sí" : "No"} />
            <ReadRow label="Ver valoraciones propias" value={c.seeOwnRatings ? "Sí" : "No"} />
            <ReadRow label="Velocidad" value={VELOCIDAD_LABEL[partida.velocidad]} />
            <ReadRow label="Bloque" value={`${partida.bloque_minutos} min`} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Esperá a que el Admin continúe al vestuario.</p>
        </div>
      </div>
    );
  }

  async function continuar() {
    setSaving(true);
    setError(null);
    try {
      await guardarConfiguracion(partidaId!, settings);
      await guardarAjustesPartida(partidaId!, { velocidad, bloque_minutos: bloque });
      await actualizarEstado(partidaId!, "vestuario");
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar la configuración.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl font-black">Configuración de la partida</h1>
        <p className="text-muted-foreground text-sm mt-1">Sos el Admin: definí las reglas para todos.</p>

        <div className="card p-4 mt-6">
          <h3 className="font-display text-lg font-bold">Reglas del partido</h3>
          <div className="mt-3 space-y-3 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.injuriesEnabled}
                onChange={(e) => setSettings({ ...settings, injuriesEnabled: e.target.checked })}
              />
              Lesiones activadas
            </label>
            <label className="flex items-center gap-3">
              Máximo de cambios:
              <input
                type="number"
                min={0}
                max={11}
                className="input w-20"
                value={settings.maxSubs}
                onChange={(e) =>
                  setSettings({ ...settings, maxSubs: Math.max(0, Math.min(11, parseInt(e.target.value) || 0)) })
                }
              />
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings.seeRivalSquad ?? true}
                onChange={(e) => setSettings({ ...settings, seeRivalSquad: e.target.checked })}
              />
              <div>
                <div className="font-medium">Conocer plantel del rival</div>
                <div className="text-xs text-muted-foreground">Muestra nombres y posiciones del rival en el vestuario.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings.seeRivalRatings ?? true}
                onChange={(e) => setSettings({ ...settings, seeRivalRatings: e.target.checked })}
              />
              <div>
                <div className="font-medium">Conocer valoraciones del rival</div>
                <div className="text-xs text-muted-foreground">Muestra el puntaje de los jugadores rivales (requiere ver plantel).</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings.seeOwnRatings ?? true}
                onChange={(e) => setSettings({ ...settings, seeOwnRatings: e.target.checked })}
              />
              <div>
                <div className="font-medium">Ver valoraciones propias</div>
                <div className="text-xs text-muted-foreground">Ocultar para un modo más desafiante: cada DT ve a sus jugadores sin puntajes.</div>
              </div>
            </label>
          </div>
        </div>

        <div className="card p-4 mt-4">
          <h3 className="font-display text-lg font-bold">Ritmo de la simulación</h3>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="label mb-1">Avance</div>
              <div className="grid gap-2">
                {(Object.keys(VELOCIDAD_LABEL) as Velocidad[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVelocidad(v)}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                      velocidad === v ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <span className="text-sm">{VELOCIDAD_LABEL[v]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">Minutos por bloque</div>
              <div className="flex gap-2">
                {[5, 10, 15].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBloque(b)}
                    className={`chip ${bloque === b ? "chip-active" : ""}`}
                  >
                    {b} min
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-destructive-foreground bg-destructive rounded-md px-3 py-2">{error}</div>
        )}

        <button className="btn-primary mt-6 w-full" onClick={continuar} disabled={saving}>
          {saving ? "Guardando..." : "Continuar al vestuario →"}
        </button>
      </div>
    </div>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
