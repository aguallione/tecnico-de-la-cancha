import { useMemo, useState } from "react";
import { useGame } from "@/lib/football/store";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import { autoLineup } from "@/lib/football/bot";
import { computePlayerPositionRating } from "@/lib/football/engine";
import {
  ROLE_TABLE,
  rolesForPosition,
  roleEffect,
  LINE_HEIGHT_TABLE,
  BUILDUP_TABLE,
  PRESS_TABLE,
} from "@/lib/football/tactics";
import type {
  BuildUp,
  FormationName,
  LineHeight,
  Player,
  Position,
  PositionGroup,
  PressIntensity,
  Style,
  Team,
} from "@/lib/football/types";
import { POSITION_GROUP } from "@/lib/football/types";

const POSITION_LABEL: Record<Position, string> = {
  POR: "Arquero",
  DFC: "Def. Central", LI: "Lateral Izq.", LD: "Lateral Der.", CAI: "Carrilero Izq.", CAD: "Carrilero Der.",
  MCD: "Med. Defensivo", MC: "Med. Central", MI: "Med. Izquierdo", MD: "Med. Derecho", MCO: "Med. Ofensivo",
  DC: "Del. Centro", SD: "Segundo Del.", EI: "Extremo Izq.", ED: "Extremo Der.",
};
const POSITION_SHORT: Record<Position, string> = {
  POR: "POR",
  DFC: "DFC", LI: "LI", LD: "LD", CAI: "CAI", CAD: "CAD",
  MCD: "MCD", MC: "MC", MI: "MI", MD: "MD", MCO: "MCO",
  DC: "DC", SD: "SD", EI: "EI", ED: "ED",
};
const GROUP_SHORT: Record<PositionGroup, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };
const avg = (a: number[]) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0);

export function LockerScreen() {
  const { setScreen, teams, activeLockerTeam, setActiveLockerTeam, settings, setTeams } = useGame();
  const maybeTeam = teams[activeLockerTeam];
  if (!maybeTeam) return null;
  const team: Team = maybeTeam;
  const otherIdx = activeLockerTeam === 0 ? 1 : 0;
  const seeOwnRatings = settings.seeOwnRatings ?? true;

  const [, forceTick] = useState(0);
  const rerender = () => forceTick((n) => n + 1);
  const [error, setError] = useState<string | null>(null);

  const slots = useMemo(() => slotsFor(team.formation), [team.formation]);

  function changeFormation(f: FormationName) {
    team.formation = f;
    team.starting = autoLineup(team.squad, f);
    // Actualizar pateadores/capitán si dejaron de ser titulares
    const starters = team.squad.filter((p) => team.starting.includes(p.id));
    if (!team.captainId || !starters.some((p) => p.id === team.captainId)) team.captainId = starters[0]?.id;
    if (!team.penaltyTakerId || !starters.some((p) => p.id === team.penaltyTakerId))
      team.penaltyTakerId = [...starters].sort((a, b) => b.shooting - a.shooting)[0]?.id;
    if (!team.setPieceTakerId || !starters.some((p) => p.id === team.setPieceTakerId))
      team.setPieceTakerId = team.penaltyTakerId;
    setError(null);
    rerender();
  }

  function swapSlot(slotIndex: number, newPlayerId: string) {
    const current = team.starting[slotIndex];
    if (current === newPlayerId) return;
    const otherSlot = team.starting.indexOf(newPlayerId);
    if (otherSlot >= 0) {
      // ya titular: intercambiar
      team.starting[otherSlot] = current;
    }
    team.starting[slotIndex] = newPlayerId;
    setError(null);
    rerender();
  }

  function confirmTeam() {
    // Validación: los 11 no vacíos y GK presente
    if (team.starting.length !== 11 || team.starting.some((id) => !id)) {
      setError("Faltan jugadores en la alineación.");
      return;
    }
    const groupMap: Record<PositionGroup, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    team.starting.forEach((id, i) => {
      const p = team.squad.find((pp) => pp.id === id);
      const slotGroup = slots[i]; // slots es PositionGroup[]
      if (p) groupMap[slotGroup] += 1;
    });
    if (groupMap.GK < 1) {
      setError("Falta el arquero en la alineación.");
      return;
    }
    team.substitutionsLeft = settings.maxSubs;
    // Guardar teams
    setTeams([teams[0], teams[1]]);
    // Siguiente pantalla: si hay otro humano por armar, handoff; si no, confirm
    const other = teams[otherIdx];
    if (other && !other.config.isBot && !(other as any)._armed) {
      // marcar armado
      (team as any)._armed = true;
      setActiveLockerTeam(otherIdx as 0 | 1);
      setScreen("handoff");
      return;
    }
    (team as any)._armed = true;
    // Si el otro es bot y no está armado, ir por handoff (auto arma bot); si ya está armado, confirm
    if (other && other.config.isBot && !(other as any)._armed) {
      setActiveLockerTeam(otherIdx as 0 | 1);
      setScreen("handoff");
    } else {
      setScreen("confirm");
    }
  }

  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  const bench = team.squad.filter((p) => !team.starting.includes(p.id));

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
            <h1 className="font-display text-2xl sm:text-3xl font-black truncate">{team.config.name} · Vestuario</h1>
          </div>
          {seeOwnRatings && (
            <div className="text-xs text-muted-foreground">Promedio: {Math.round(starters.reduce((s, p) => s + p.overall, 0) / (starters.length || 1))}</div>
          )}
        </div>

        {/* Táctica */}
        <div className="card p-4 mt-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="label">Formación</div>
              <select className="input mt-1 w-full" value={team.formation}
                onChange={(e) => changeFormation(e.target.value as FormationName)}>
                {FORMATION_LIST.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Estilo de juego</div>
              <select className="input mt-1 w-full" value={team.style}
                onChange={(e) => { team.style = e.target.value as Style; rerender(); }}>
                <option>Ofensivo</option>
                <option>Equilibrado</option>
                <option>Defensivo</option>
              </select>
            </div>
            <div>
              <div className="label">Capitán</div>
              <select className="input mt-1 w-full" value={team.captainId ?? ""}
                onChange={(e) => { team.captainId = e.target.value; rerender(); }}>
                {starters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Pateador de penales</div>
              <select className="input mt-1 w-full" value={team.penaltyTakerId ?? ""}
                onChange={(e) => { team.penaltyTakerId = e.target.value; rerender(); }}>
                {starters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <div className="label">Pateador de córners / tiros libres</div>
              <select className="input mt-1 w-full" value={team.setPieceTakerId ?? ""}
                onChange={(e) => { team.setPieceTakerId = e.target.value; rerender(); }}>
                {starters.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Táctica avanzada */}
        <div className="card p-4 mt-4">
          <div className="label mb-1">Táctica avanzada</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="label">Altura de línea</div>
              <select className="input mt-1 w-full" value={team.lineHeight}
                onChange={(e) => { team.lineHeight = e.target.value as LineHeight; rerender(); }}>
                {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => <option key={k}>{k}</option>)}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{LINE_HEIGHT_TABLE[team.lineHeight].blurb}</div>
            </div>
            <div>
              <div className="label">Salida (build-up)</div>
              <select className="input mt-1 w-full" value={team.buildUp}
                onChange={(e) => { team.buildUp = e.target.value as BuildUp; rerender(); }}>
                {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => <option key={k}>{k}</option>)}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{BUILDUP_TABLE[team.buildUp].blurb}</div>
            </div>
            <div>
              <div className="label">Intensidad de presión</div>
              <select className="input mt-1 w-full" value={team.pressIntensity}
                onChange={(e) => { team.pressIntensity = e.target.value as PressIntensity; rerender(); }}>
                {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => <option key={k}>{k}</option>)}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{PRESS_TABLE[team.pressIntensity].blurb}</div>
            </div>
          </div>
        </div>

        {/* Cancha visual con slots */}
        <div className="mt-5 rounded-2xl bg-pitch relative overflow-hidden border border-pitch/50"
          style={{ minHeight: 420 }}>
          <PitchLines />
          <div className="relative z-10 grid grid-rows-4 h-[420px] p-3 gap-1">
            {(["FWD", "MID", "DEF", "GK"] as PositionGroup[]).map((row) => (
              <SlotRow key={row} team={team} slots={slots} rowPos={row} onSwap={swapSlot} seeOwnRatings={seeOwnRatings} />
            ))}
          </div>
        </div>

        {/* Resumen fuera de posición */}
        {(() => {
          const starters = team.starting.map((pid, i) => ({
            p: team.squad.find((pp) => pp.id === pid),
            group: slots[i], // PositionGroup del slot
          })).filter((s) => s.p);
          // Fuera de posición = el grupo natural del jugador no coincide con el slot
          const oopList = starters.filter((s) => POSITION_GROUP[s.p!.position] !== s.group);
          if (oopList.length === 0) return null;
              const baseAvg = Math.round(avg(starters.map((s) => s.p!.overall)));
              const effAvg = Math.round(avg(starters.map((s) => computePlayerPositionRating(s.p!, s.group))));
              return (
                <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
                    <span>⚠ {oopList.length} jugador{oopList.length > 1 ? "es" : ""} fuera de posición</span>
                    {seeOwnRatings && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span>Promedio base: <b className="text-foreground">{baseAvg}</b></span>
                        <span className="text-red-400">→ Efectivo: <b>{effAvg}</b></span>
                      </>
                    )}
                  </div>
              <div className="mt-1 text-xs text-red-200/70">
                {oopList.map((s) => `${s.p!.name} (${POSITION_SHORT[s.p!.position]}→${GROUP_SHORT[s.group]})`).join(" · ")}
              </div>
            </div>
          );
        })()}

        {/* Roles individuales */}
        <IndividualRoles team={team} slots={slots} onChange={rerender} />

        {/* Suplentes */}
        <div className="mt-6">
          <h2 className="font-display font-bold text-lg">Suplentes ({bench.length})</h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {bench.map((p) => (
              <div key={p.id} className="card px-3 py-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{POSITION_LABEL[p.position]} · {p.age} años</div>
                </div>
                {seeOwnRatings && (
                  <div className="text-right">
                    <div className="font-display font-black text-lg">{p.overall}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Plantel rival */}
        <RivalSquadSection
          rival={teams[otherIdx] ?? null}
          seeRivalSquad={settings.seeRivalSquad ?? true}
          seeRivalRatings={settings.seeRivalRatings ?? true}
        />

        {error && <div className="mt-4 text-sm text-destructive-foreground bg-destructive rounded-md px-3 py-2">{error}</div>}
      </div>

      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button className="btn-secondary flex-1" onClick={() => { team.starting = autoLineup(team.squad, team.formation); rerender(); }}>
            Auto-alineación
          </button>
          <button className="btn-primary flex-1" onClick={confirmTeam}>Confirmar equipo →</button>
        </div>
      </div>
    </div>
  );
}

function RoleEffectBadge({ role }: { role: string | undefined }) {
  const eff = roleEffect(role);
  if (!role || (eff.attack === 0 && eff.defense === 0)) {
    return <span className="text-[11px] text-muted-foreground">Sin efecto</span>;
  }
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  return (
    <span className="text-[11px] flex items-center gap-2">
      <span className={eff.attack > 0 ? "text-green-500" : eff.attack < 0 ? "text-red-400" : "text-muted-foreground"}>
        ATA {fmt(eff.attack)}
      </span>
      <span className={eff.defense > 0 ? "text-green-500" : eff.defense < 0 ? "text-red-400" : "text-muted-foreground"}>
        DEF {fmt(eff.defense)}
      </span>
    </span>
  );
}

function IndividualRoles({ team, slots, onChange }: {
  team: Team; slots: PositionGroup[]; onChange: () => void;
}) {
  // Titulares en el orden de la alineación, con su grupo de posición EN CANCHA (slot).
  const starters = team.starting
    .map((id, i) => {
      const p = team.squad.find((pp) => pp.id === id);
      return p ? { p, fieldGroup: slots[i] } : null;
    })
    .filter(Boolean) as Array<{ p: Player; fieldGroup: PositionGroup }>;

  return (
    <div className="mt-6">
      <h2 className="font-display font-bold text-lg">Roles individuales</h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Ajustan levemente el aporte de cada jugador al Nivel de Ataque o Defensa del equipo.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {starters.map(({ p, fieldGroup }) => {
          const roles = rolesForPosition(fieldGroup);
          const groups = Array.from(
            new Set(roles.map((r) => ROLE_TABLE[r].group ?? "")),
          );
          // El rol solo cuenta si corresponde al grupo de la posición de cancha actual.
          const currentRole = roles.includes(p.individualRole || "") ? p.individualRole : "";
          return (
            <div key={p.id} className="card px-3 py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {p.name} <span className="text-xs text-muted-foreground">({POSITION_SHORT[p.position]})</span>
                </div>
                {roles.length > 0 ? (
                  <select
                    className="input mt-1 w-full text-xs"
                    value={currentRole || ""}
                    onChange={(e) => { p.individualRole = e.target.value; onChange(); }}
                  >
                    <option value="">Sin rol específico</option>
                    {groups.map((g) =>
                      g ? (
                        <optgroup key={g} label={g}>
                          {roles.filter((r) => ROLE_TABLE[r].group === g).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </optgroup>
                      ) : (
                        roles.filter((r) => !ROLE_TABLE[r].group).map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))
                      ),
                    )}
                  </select>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground">El arquero no tiene rol específico</div>
                )}
              </div>
              <div className="text-right shrink-0">
                <RoleEffectBadge role={currentRole || undefined} />
                {currentRole && ROLE_TABLE[currentRole] && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[8rem]">
                    {ROLE_TABLE[currentRole].blurb}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotRow({ team, slots, rowPos, onSwap, seeOwnRatings }: {
  team: Team; slots: PositionGroup[]; rowPos: PositionGroup;
  onSwap: (slotIndex: number, newPlayerId: string) => void;
  seeOwnRatings: boolean;
}) {
  const indexes = slots.map((s, i) => (s === rowPos ? i : -1)).filter((i) => i >= 0);
  return (
    <div className="flex items-center justify-around gap-2">
      {indexes.map((i) => (
        <SlotChip key={i} team={team} slotIndex={i} onSwap={onSwap} slotGroup={slots[i]} seeOwnRatings={seeOwnRatings} />
      ))}
    </div>
  );
}

function SlotChip({ team, slotIndex, slotGroup, onSwap, seeOwnRatings }: {
  team: Team; slotIndex: number; slotGroup: PositionGroup;
  onSwap: (slotIndex: number, newPlayerId: string) => void;
  seeOwnRatings: boolean;
}) {
  const id = team.starting[slotIndex];
  const p = team.squad.find((pp) => pp.id === id);
  const effective = p ? computePlayerPositionRating(p, slotGroup) : 0;
  const oop = p ? effective !== p.overall : false;
  return (
    <label className="relative flex flex-col items-center text-center max-w-[9rem]">
      <span className="text-[10px] uppercase tracking-wider text-lime-200/80">{GROUP_SHORT[slotGroup]}</span>
      <select
        value={id ?? ""}
        onChange={(e) => onSwap(slotIndex, e.target.value)}
        className="mt-1 w-full appearance-none rounded-lg bg-white/95 text-foreground text-xs sm:text-sm font-medium px-2 py-1.5 shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {team.squad.map((sp) => (
          <option key={sp.id} value={sp.id}>
            {seeOwnRatings
              ? `${sp.name} (${sp.overall} ${POSITION_SHORT[sp.position]})`
              : `${sp.name} (${POSITION_SHORT[sp.position]})`}
          </option>
        ))}
      </select>
      {p && (
        <div className="mt-1 flex items-center gap-1">
          {seeOwnRatings ? (
            <>
              <span className="text-[10px] text-lime-100/70">
                PAS {Math.round(p.passing)} TIR {Math.round(p.shooting)} REG {Math.round(p.dribbling)} DEF {Math.round(p.defense)} FIS {Math.round(p.physical)} VEL {Math.round(p.pace)}
              </span>
              <span className="text-[10px] font-bold text-lime-100/90">{p.overall}</span>
              {oop && (
                <span className="text-[10px] font-bold text-red-400" title={`Fuera de posición: ${POSITION_LABEL[p.position]} en slot ${GROUP_SHORT[slotGroup]}`}>
                  → {effective}
                </span>
              )}
            </>
          ) : (
            oop && (
              <span className="text-[10px] font-bold text-red-400" title={`Fuera de posición: ${POSITION_LABEL[p.position]} en slot ${GROUP_SHORT[slotGroup]}`}>
                ⚠ Fuera de pos.
              </span>
            )
          )}
        </div>
      )}
    </label>
  );
}

function RivalSquadSection({
  rival,
  seeRivalSquad,
  seeRivalRatings,
}: {
  rival: Team | null;
  seeRivalSquad: boolean;
  seeRivalRatings: boolean;
}) {
  if (!rival) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display font-bold text-lg flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: rival.config.color }}
          aria-hidden="true"
        />
        Plantel rival
        {!seeRivalSquad && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">(oculto por configuración)</span>
        )}
      </h2>

      {!seeRivalSquad ? (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
          La visibilidad del plantel rival está desactivada en las reglas del partido.
        </div>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {rival.squad.map((p) => {
            const isStarter = rival.starting.includes(p.id);
            return (
              <div
                key={p.id}
                className={`card px-3 py-2 flex items-center justify-between gap-2 text-sm ${
                  isStarter ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {POSITION_SHORT[p.position]} · {p.age} años
                    {isStarter ? "" : " · Suplente"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {seeRivalRatings ? (
                    <div className="font-display font-black text-lg">{p.overall}</div>
                  ) : (
                    <div
                      className="font-display font-black text-lg text-muted-foreground"
                      aria-label="Valoración oculta"
                    >
                      ?
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PitchLines() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute inset-0 opacity-20 [background:repeating-linear-gradient(90deg,transparent_0_10%,rgba(255,255,255,0.06)_10%_20%)]" />
      <div className="absolute inset-3 border border-white/30 rounded-lg" />
      <div className="absolute left-1/2 top-3 bottom-3 border-l border-white/30" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/30" />
    </div>
  );
}
