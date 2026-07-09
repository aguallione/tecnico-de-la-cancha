import { useState } from "react";
import { makeTeam, useGame } from "@/lib/football/store";

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

export function SetupScreen() {
  const { setScreen, setTeams, settings, setSettings, setActiveLockerTeam } = useGame();
  const [name1, setName1] = useState("");
  const [color1, setColor1] = useState(COLORS[0].value);
  const [name2, setName2] = useState("");
  const [color2, setColor2] = useState(COLORS[1].value);

  const vsBot = settings.vsBot;
  const team2Label = vsBot ? "Bot (rival)" : "Jugador 2";

  function start() {
    const t1 = makeTeam({ name: name1.trim() || "Jugador 1", color: color1, isBot: false });
    const t2 = makeTeam({
      name: name2.trim() || (vsBot ? "CPU FC" : "Jugador 2"),
      color: color2,
      isBot: vsBot,
    });
    setTeams([t1, t2]);
    setActiveLockerTeam(0);
    setScreen("handoff");
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <button className="btn-ghost mb-4" onClick={() => setScreen("home")}>← Volver</button>
        <h1 className="font-display text-3xl font-black">Configuración de partida</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {vsBot ? "Vos vs Bot" : "Dos jugadores humanos, mismo dispositivo"}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <TeamCard title="Jugador 1" name={name1} setName={setName1} color={color1} setColor={setColor1} />
          <TeamCard title={team2Label} name={name2} setName={setName2} color={color2} setColor={setColor2} disabled={vsBot ? false : false} />
        </div>

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
                type="number" min={0} max={11}
                className="input w-20"
                value={settings.maxSubs}
                onChange={(e) => setSettings({ ...settings, maxSubs: Math.max(0, Math.min(11, parseInt(e.target.value) || 0)) })}
              />
            </label>
          </div>
        </div>

        <div className="card p-4 mt-4">
          <h3 className="font-display text-lg font-bold">Automatizaciones</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Reglas que se ejecutan automáticamente durante la simulación. Todas desactivadas por defecto.
          </p>
          <div className="mt-3 space-y-4 text-sm">
            <AutomationToggle
              checked={settings.automations?.closingDown ?? false}
              onChange={(v) => setSettings({ ...settings, automations: { ...(settings.automations ?? { exploitRedCard: false, staminaAlert: false }), closingDown: v } })}
              label="Cerrar el partido"
              description="Si ganás por 1 gol después del minuto 75, baja automáticamente la línea a Baja y la mentalidad a Defensivo."
            />
            <AutomationToggle
              checked={settings.automations?.exploitRedCard ?? false}
              onChange={(v) => setSettings({ ...settings, automations: { ...(settings.automations ?? { closingDown: false, staminaAlert: false }), exploitRedCard: v } })}
              label="Explotar inferioridad rival"
              description="Si el rival queda con un jugador expulsado, sube automáticamente la línea a Alta."
            />
            <AutomationToggle
              checked={settings.automations?.staminaAlert ?? false}
              onChange={(v) => setSettings({ ...settings, automations: { ...(settings.automations ?? { closingDown: false, exploitRedCard: false }), staminaAlert: v } })}
              label="Alerta de cansancio"
              description="Cuando un jugador propio baja del 60 % de energía, aparece una notificación en el relato sugiriendo el cambio."
            />
          </div>
        </div>

        <button className="btn-primary mt-6 w-full" onClick={start}>Continuar al vestuario →</button>
      </div>
    </div>
  );
}

function AutomationToggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
    </label>
  );
}

function TeamCard({ title, name, setName, color, setColor }: {
  title: string; name: string; setName: (v: string) => void;
  color: string; setColor: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="card p-4">
      <h3 className="font-display font-bold text-lg">{title}</h3>
      <label className="block mt-3 text-xs uppercase tracking-wider text-muted-foreground">Nombre del equipo</label>
      <input
        className="input mt-1 w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Los Titanes"
      />
      <label className="block mt-3 text-xs uppercase tracking-wider text-muted-foreground">Color de camiseta</label>
      <div className="mt-2 flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c.value}
            aria-label={c.name}
            onClick={() => setColor(c.value)}
            className={`h-8 w-8 rounded-full border-2 transition ${color === c.value ? "border-primary scale-110" : "border-border"}`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
    </div>
  );
}
