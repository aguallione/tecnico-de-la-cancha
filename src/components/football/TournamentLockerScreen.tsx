import { useEffect, useMemo, useState } from "react";
import { useGame } from "@/lib/football/store";
import { useAuth } from "@/hooks/use-auth";
import { FORMATION_LIST, slotsFor, rowsFor, registerCustomFormation, slotGroup as slotGroupForPosition } from "@/lib/football/formations";
import { useFormacionesPersonalizadas } from "@/hooks/use-formaciones-personalizadas";
import { FormationEditorModal } from "@/components/football/FormationEditorModal";
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
import { fetchSlots, teamFromSlot, actualizarMiSlot } from "@/lib/football/tournament-api";
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
import type { TournamentSlot } from "@/lib/football/tournament-types";

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

export function TournamentLockerScreen() {
  const { tournamentId, setScreen, settings } = useGame();
  const { user } = useAuth();
  const seeOwnRatings = settings.seeOwnRatings ?? true;

  const [slot, setSlot] = useState<TournamentSlot | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [, forceTick] = useState(0);
  const rerender = () => forceTick((n) => n + 1);
  const [editorOpen, setEditorOpen] = useState(false);
  const { formaciones: formacionesPersonalizadas, guardar: guardarFormacion } = useFormacionesPersonalizadas();

  useEffect(() => {
    for (const f of formacionesPersonalizadas) registerCustomFormation(f.id, f.filas);
  }, [formacionesPersonalizadas]);

  useEffect(() => {
    if (!tournamentId || !user) return;
    let cancelado = false;
    (async () => {
      setLoading(true);
      try {
        const slotsDelTorneo = await fetchSlots(tournamentId);
        const propio = slotsDelTorneo.find((s) => s.ownerUserId === user.id);
        if (!propio) {
          if (!cancelado) setError("No tenés un equipo anotado en este torneo.");
          return;
        }
        if (cancelado) return;
        setSlot(propio);
        setTeam(teamFromSlot(propio));
        setError(null);
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : "No se pudo cargar tu equipo.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [tournamentId, user]);

  const slotsCancha = useMemo(() => (team ? slotsFor(team.formation) : []), [team?.formation]);
  const rows = useMemo(() => (team ? rowsFor(team.formation) : []), [team?.formation]);

  if (loading || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="text-center">
          <p className="text-muted-foreground">{error ?? "Cargando..."}</p>
          {error && (
            <button className="btn-primary mt-4" onClick={() => setScreen("tournament_hub")}>
              Volver al torneo
            </button>
          )}
        </div>
      </div>
    );
  }

  function changeFormation(f: FormationName) {
    team!.formation = f;
    team!.starting = autoLineup(team!.squad, f);
    const starters = team!.squad.filter((p) => team!.starting.includes(p.id));
    if (!team!.captainId || !starters.some((p) => p.id === team!.captainId)) team!.captainId = starters[0]?.id;
    if (!team!.penaltyTakerId || !starters.some((p) => p.id === team!.penaltyTakerId))
      team!.penaltyTakerId = [...starters].sort((a, b) => b.shooting - a.shooting)[0]?.id;
    if (!team!.setPieceTakerId || !starters.some((p) => p.id === team!.setPieceTakerId))
      team!.setPieceTakerId = team!.penaltyTakerId;
    setGuardadoOk(false);
    rerender();
  }

  function swapSlot(slotIndex: number, newPlayerId: string) {
    const current = team!.starting[slotIndex];
    if (current === newPlayerId) return;
    const otherSlot = team!.starting.indexOf(newPlayerId);
    if (otherSlot >= 0) team!.starting[otherSlot] = current;
    team!.starting[slotIndex] = newPlayerId;
    setGuardadoOk(false);
    rerender();
  }

  async function handleGuardar() {
    if (!slot || !team) return;
    if (team.starting.length !== 11 || team.starting.some((id) => !id)) {
      setError("Faltan jugadores en la alineación.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      await actualizarMiSlot({
        slotId: slot.id,
        formation: team.formation,
        style: team.style,
        lineHeight: team.lineHeight,
        buildUp: team.buildUp,
        pressIntensity: team.pressIntensity,
        squad: team.squad,
        starting: team.starting,
        captainId: team.captainId,
        penaltyTakerId: team.penaltyTakerId,
        setPieceTakerId: team.setPieceTakerId,
      });
      setGuardadoOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const starters = team.squad.filter((p) => team.starting.includes(p.id));
  const bench = team.squad.filter((p) => !team.starting.includes(p.id));

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <button className="btn-ghost mb-2" onClick={() => setScreen("tournament_hub")}>
          ← Volver al torneo
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
          <h1 className="font-display text-2xl sm:text-3xl font-black truncate">
            {team.config.name} · Vestuario del torneo
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          El plantel es fijo durante todo el torneo — acá solo se ajusta formación, alineación y táctica.
        </p>

        {/* Táctica */}
        <div className="card p-4 mt-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="label">Formación</div>
              <select
                className="input mt-1 w-full"
                value={team.formation}
                onChange={(e) => changeFormation(e.target.value as FormationName)}
              >
                <optgroup label="Predefinidas">
                  {FORMATION_LIST.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </optgroup>
                {formacionesPersonalizadas.length > 0 && (
                  <optgroup label="Mis formaciones">
                    {formacionesPersonalizadas.map((f) => (
                      <option key={f.id} value={f.id}>{f.nombre}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button type="button" onClick={() => setEditorOpen(true)} className="btn-ghost text-xs mt-1 py-1 px-2">
                + Crear formación
              </button>
            </div>
            <div>
              <div className="label">Estilo de juego</div>
              <select
                className="input mt-1 w-full"
                value={team.style}
                onChange={(e) => {
                  team.style = e.target.value as Style;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                <option>Ofensivo</option>
                <option>Equilibrado</option>
                <option>Defensivo</option>
              </select>
            </div>
            <div>
              <div className="label">Capitán</div>
              <select
                className="input mt-1 w-full"
                value={team.captainId ?? ""}
                onChange={(e) => {
                  team.captainId = e.target.value;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {starters.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Pateador de penales</div>
              <select
                className="input mt-1 w-full"
                value={team.penaltyTakerId ?? ""}
                onChange={(e) => {
                  team.penaltyTakerId = e.target.value;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {starters.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="label">Pateador de córners / tiros libres</div>
              <select
                className="input mt-1 w-full"
                value={team.setPieceTakerId ?? ""}
                onChange={(e) => {
                  team.setPieceTakerId = e.target.value;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {starters.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
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
              <select
                className="input mt-1 w-full"
                value={team.lineHeight}
                onChange={(e) => {
                  team.lineHeight = e.target.value as LineHeight;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{LINE_HEIGHT_TABLE[team.lineHeight].blurb}</div>
            </div>
            <div>
              <div className="label">Salida (build-up)</div>
              <select
                className="input mt-1 w-full"
                value={team.buildUp}
                onChange={(e) => {
                  team.buildUp = e.target.value as BuildUp;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{BUILDUP_TABLE[team.buildUp].blurb}</div>
            </div>
            <div>
              <div className="label">Intensidad de presión</div>
              <select
                className="input mt-1 w-full"
                value={team.pressIntensity}
                onChange={(e) => {
                  team.pressIntensity = e.target.value as PressIntensity;
                  setGuardadoOk(false);
                  rerender();
                }}
              >
                {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <div className="mt-1 text-[11px] text-muted-foreground">{PRESS_TABLE[team.pressIntensity].blurb}</div>
            </div>
          </div>
        </div>

        {/* Cancha visual con slots */}
        <div
          className="mt-5 rounded-2xl bg-pitch relative overflow-hidden border border-pitch/50"
          style={{ minHeight: rows.length >= 5 ? 480 : 420 }}
        >
          <PitchLines />
          <div
            className="relative z-10 grid p-3 gap-1"
            style={{ gridTemplateRows: `repeat(${rows.length}, 1fr)`, height: rows.length >= 5 ? 480 : 420 }}
          >
            {[...rows.keys()].reverse().map((rowIdx) => {
              const row = rows[rowIdx];
              const offset = rows.slice(0, rowIdx).reduce((s, r) => s + r.length, 0);
              const indexes = row.map((_, i) => offset + i);
              return (
                <SlotRow key={rowIdx} team={team} row={row} indexes={indexes} onSwap={swapSlot} seeOwnRatings={seeOwnRatings} />
              );
            })}
          </div>
        </div>

        {/* Roles individuales */}
        <IndividualRoles
          team={team}
          slots={slotsCancha}
          onChange={() => {
            setGuardadoOk(false);
            rerender();
          }}
        />

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
                  <div className="font-display font-black text-lg">
                    {computePlayerPositionRating(p, POSITION_GROUP[p.position])}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-destructive-foreground bg-destructive rounded-md px-3 py-2">{error}</div>}
        {guardadoOk && <div className="mt-4 text-sm text-primary">Cambios guardados.</div>}
      </div>

      {editorOpen && (
        <FormationEditorModal
          guardar={guardarFormacion}
          onClose={() => setEditorOpen(false)}
          onSaved={(nombre: string, filasGuardadas: Position[][]) => {
            registerCustomFormation(nombre, filasGuardadas);
            changeFormation(nombre);
            setEditorOpen(false);
          }}
        />
      )}

      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            className="btn-secondary flex-1"
            onClick={() => {
              team.starting = autoLineup(team.squad, team.formation);
              setGuardadoOk(false);
              rerender();
            }}
          >
            Auto-alineación
          </button>
          <button className="btn-primary flex-1 disabled:opacity-50" disabled={guardando} onClick={handleGuardar}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
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

function IndividualRoles({ team, slots, onChange }: { team: Team; slots: Position[]; onChange: () => void }) {
  const starters = team.starting
    .map((id, i) => {
      const p = team.squad.find((pp) => pp.id === id);
      return p ? { p, fieldGroup: slotGroupForPosition(slots[i]) ?? "GK" } : null;
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
          const groups = Array.from(new Set(roles.map((r) => ROLE_TABLE[r].group ?? "")));
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
                    onChange={(e) => {
                      p.individualRole = e.target.value;
                      onChange();
                    }}
                  >
                    <option value="">Sin rol específico</option>
                    {groups.map((g) =>
                      g ? (
                        <optgroup key={g} label={g}>
                          {roles
                            .filter((r) => ROLE_TABLE[r].group === g)
                            .map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                        </optgroup>
                      ) : (
                        roles
                          .filter((r) => !ROLE_TABLE[r].group)
                          .map((r) => (
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

function SlotRow({
  team,
  row,
  indexes,
  onSwap,
  seeOwnRatings,
}: {
  team: Team;
  row: Position[];
  indexes: number[];
  onSwap: (slotIndex: number, newPlayerId: string) => void;
  seeOwnRatings: boolean;
}) {
  return (
    <div className="flex items-center justify-around gap-2">
      {indexes.map((slotIndex, i) => (
        <SlotChip key={slotIndex} team={team} slotIndex={slotIndex} onSwap={onSwap} slotGroup={row[i]} seeOwnRatings={seeOwnRatings} />
      ))}
    </div>
  );
}

function SlotChip({
  team,
  slotIndex,
  slotGroup,
  onSwap,
  seeOwnRatings,
}: {
  team: Team;
  slotIndex: number;
  slotGroup: Position;
  onSwap: (slotIndex: number, newPlayerId: string) => void;
  seeOwnRatings: boolean;
}) {
  const id = team.starting[slotIndex];
  const p = team.squad.find((pp) => pp.id === id);
  const effective = p ? computePlayerPositionRating(p, slotGroup) : 0;
  const slotGroupName = slotGroupForPosition(slotGroup);
  const oop = p ? slotGroupName !== POSITION_GROUP[p.position] : false;
  return (
    <label className="relative flex flex-col items-center text-center max-w-[9rem]">
      <span className="text-[10px] uppercase tracking-wider text-lime-200/80">{POSITION_SHORT[slotGroup]}</span>
      <select
        value={id ?? ""}
        onChange={(e) => onSwap(slotIndex, e.target.value)}
        className="mt-1 w-full appearance-none rounded-lg bg-white/95 text-foreground text-xs sm:text-sm font-medium px-2 py-1.5 shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {team.squad.map((sp) => {
          const effectiveOption = computePlayerPositionRating(sp, slotGroup);
          return (
            <option key={sp.id} value={sp.id}>
              {seeOwnRatings
                ? `${sp.name} (${effectiveOption} ${POSITION_SHORT[sp.position]})`
                : `${sp.name} (${POSITION_SHORT[sp.position]})`}
            </option>
          );
        })}
      </select>
      {p && (
        <div className="mt-1 flex items-center gap-1">
          {seeOwnRatings ? (
            <>
              <span className="text-[10px] text-lime-100/70">
                PAS {Math.round(p.passing)} TIR {Math.round(p.shooting)} REG {Math.round(p.dribbling)} DEF {Math.round(p.defense)} FIS {Math.round(p.physical)} VEL {Math.round(p.pace)}
              </span>
              <span className="text-[10px] font-bold text-lime-100/90">{oop ? `${p.overall} → ${effective}` : effective}</span>
            </>
          ) : (
            oop && (
              <span
                className="text-[10px] font-bold text-red-400"
                title={`Fuera de posición: ${POSITION_LABEL[p.position]} en slot ${POSITION_SHORT[slotGroup]}`}
              >
                ⚠ Fuera de pos.
              </span>
            )
          )}
        </div>
      )}
    </label>
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