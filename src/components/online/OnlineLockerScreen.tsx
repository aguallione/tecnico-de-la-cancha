'use client';
/**
 * OnlineLockerScreen.tsx
 *
 * Vestuario online. Cada jugador arma/edita el equipo de su equipo_idx según el
 * modo de coordinación:
 *   · libre    → cualquiera edita.
 *   · roles    → solo el rol "alineación" edita; el resto verá subs en el partido.
 *   · consenso → todos editan y TODOS deben confirmar para avanzar.
 *   · tiempos  → edición libre en el vestuario (el turno rota en el partido).
 *
 * Al confirmar: guarda el equipo en partidas_online.equipo_X y marca equipo_listo.
 * El Admin inicia el partido cuando ambos equipos están listos (inicializa el
 * match_state serializado y pasa a estado 'jugando').
 */

import { useMemo, useRef, useState } from "react";
import { FORMATION_LIST, slotsFor } from "@/lib/football/formations";
import { autoLineup } from "@/lib/football/bot";
import { initMatch, outOfPositionFactor } from "@/lib/football/engine";
import {
  LINE_HEIGHT_TABLE,
  BUILDUP_TABLE,
  PRESS_TABLE,
  ROLE_TABLE,
  rolesForPosition,
  roleEffect,
} from "@/lib/football/tactics";
import { serializeMatchState } from "@/lib/football/serialization";
import type {
  BuildUp,
  FormationName,
  LineHeight,
  MatchSettings,
  Player,
  Position,
  PressIntensity,
  Style,
  Team,
} from "@/lib/football/types";
import { useOnlineGame } from "@/lib/online/store";
import { estaConectado, type JugadorOnline, type ModoCoop } from "@/lib/online/types";
import { guardarEquipo, guardarMatchState, marcarEquipoListo } from "@/lib/online/api";
import { TransferirAdminModal } from "@/components/online/TransferirAdminModal";
import { OnlineHeader } from "@/components/online/OnlineHeader";

const POSITION_SHORT: Record<Position, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };

const DEFAULT_SETTINGS: MatchSettings = {
  injuriesEnabled: true,
  maxSubs: 5,
  vsBot: false,
  automations: { closingDown: false, exploitRedCard: false, staminaAlert: false },
  seeRivalSquad: true,
  seeRivalRatings: true,
  seeOwnRatings: true,
};

function jugadoresDeEquipo(jugadores: JugadorOnline[], idx: 0 | 1): JugadorOnline[] {
  return [...jugadores.filter((j) => j.equipo_idx === idx)].sort(
    (a, b) => new Date(a.unido_en).getTime() - new Date(b.unido_en).getTime(),
  );
}

/** Readiness de un equipo según su modo. */
export function equipoListo(
  jugadores: JugadorOnline[],
  idx: 0 | 1,
  modo: ModoCoop,
  tienePlantel: boolean,
): boolean {
  const arr = jugadoresDeEquipo(jugadores, idx);
  if (!tienePlantel || arr.length === 0) return false;
  if (modo === "consenso") return arr.every((j) => j.equipo_listo);
  return arr.some((j) => j.equipo_listo);
}

export function OnlineLockerScreen() {
  const { partida, partidaId, jugadores, miJugador, soyAdmin, refrescar } = useOnlineGame();

  if (!partida || !partidaId || !miJugador) {
    return <div className="min-h-screen grid place-items-center bg-background text-foreground">Cargando vestuario...</div>;
  }

  const miEquipo = miJugador.equipo_idx as 0 | 1;
  const teamData = miEquipo === 0 ? partida.equipo_0 : partida.equipo_1;

  if (!teamData) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Tu equipo todavía no tiene un plantel cargado. Volvé a la sala para elegirlo.
        </p>
      </div>
    );
  }

  return (
    <LockerInner
      key={miEquipo}
      initialTeam={teamData}
      miEquipo={miEquipo}
      partidaId={partidaId}
    />
  );
}

function cloneTeam(t: Team): Team {
  return JSON.parse(JSON.stringify(t)) as Team;
}

function LockerInner({
  initialTeam,
  miEquipo,
  partidaId,
}: {
  initialTeam: Team;
  miEquipo: 0 | 1;
  partidaId: string;
}) {
  const { partida, jugadores, miJugador, soyAdmin, refrescar } = useOnlineGame();
  const [team, setTeam] = useState<Team>(() => cloneTeam(initialTeam));
  const [, force] = useState(0);
  const rerender = () => force((n) => n + 1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const startedRef = useRef(false);

  const modo: ModoCoop = miEquipo === 0 ? partida!.modo_coop_0 : partida!.modo_coop_1;
  const misCompaneros = jugadoresDeEquipo(jugadores, miEquipo);
  const esRolAlineacion = misCompaneros[0]?.id === miJugador!.id; // líder = rol alineación en modo roles
  const canEdit = modo !== "roles" || esRolAlineacion;

  const slots = useMemo(() => slotsFor(team.formation), [team.formation]);

  function changeFormation(f: FormationName) {
    team.formation = f;
    team.starting = autoLineup(team.squad, f);
    const starters = team.squad.filter((p) => team.starting.includes(p.id));
    if (!team.captainId || !starters.some((p) => p.id === team.captainId)) team.captainId = starters[0]?.id;
    if (!team.penaltyTakerId || !starters.some((p) => p.id === team.penaltyTakerId))
      team.penaltyTakerId = [...starters].sort((a, b) => b.attack - a.attack)[0]?.id;
    if (!team.setPieceTakerId) team.setPieceTakerId = team.penaltyTakerId;
    rerender();
  }

  function swapSlot(slotIndex: number, newPlayerId: string) {
    const current = team.starting[slotIndex];
    if (current === newPlayerId) return;
    const otherSlot = team.starting.indexOf(newPlayerId);
    if (otherSlot >= 0) team.starting[otherSlot] = current;
    team.starting[slotIndex] = newPlayerId;
    rerender();
  }

  async function confirmar() {
    if (team.starting.length !== 11 || team.starting.some((id) => !id)) {
      setError("Faltan jugadores en la alineación.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      team.substitutionsLeft = partida!.configuracion?.maxSubs ?? 5;
      await guardarEquipo(partidaId, miEquipo, team);
      await marcarEquipoListo(miJugador!.id, true);
      await refrescar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al confirmar el equipo.");
    } finally {
      setSaving(false);
    }
  }

  async function iniciarPartido() {
    if (startedRef.current) return;
    startedRef.current = true;
    setError(null);
    try {
      const t0 = partida!.equipo_0;
      const t1 = partida!.equipo_1;
      if (!t0 || !t1) throw new Error("Faltan equipos.");
      const settings = partida!.configuracion ?? DEFAULT_SETTINGS;
      const state = initMatch([cloneTeam(t0), cloneTeam(t1)], settings);
      await guardarMatchState(partidaId, serializeMatchState(state), "jugando");
      await refrescar();
    } catch (e) {
      startedRef.current = false;
      setError(e instanceof Error ? e.message : "Error al iniciar el partido.");
    }
  }

  const yoListo = miJugador!.equipo_listo;
  const readyCount = misCompaneros.filter((j) => j.equipo_listo).length;

  const ambosListos =
    equipoListo(jugadores, 0, partida!.modo_coop_0, !!partida!.equipo_0) &&
    equipoListo(jugadores, 1, partida!.modo_coop_1, !!partida!.equipo_1);

  const starters = team.squad.filter((p) => team.starting.includes(p.id));

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      <OnlineHeader />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-5 w-5 rounded-full shrink-0" style={{ backgroundColor: team.config.color }} />
            <h1 className="font-display text-2xl sm:text-3xl font-black truncate">
              {team.config.name} · Vestuario
            </h1>
          </div>
          <span className="text-xs text-muted-foreground">Modo: {modo}</span>
        </div>

        {/* Estado del rol / consenso */}
        {modo === "roles" && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
            Tu rol: <b>{esRolAlineacion ? "Alineación" : "Sustituciones"}</b>.
            {esRolAlineacion
              ? " Controlás la alineación de este equipo."
              : " La alineación la controla otro jugador; vos gestionarás las sustituciones en el partido."}
          </div>
        )}
        {modo === "consenso" && (
          <div className="mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
            Consenso: {readyCount}/{misCompaneros.length} confirmaron. Todos deben confirmar para avanzar.
          </div>
        )}

        {/* Táctica */}
        <fieldset disabled={!canEdit} className={!canEdit ? "opacity-60" : ""}>
          <div className="card p-4 mt-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="label">Formación</div>
                <select
                  className="input mt-1 w-full"
                  value={team.formation}
                  onChange={(e) => changeFormation(e.target.value as FormationName)}
                >
                  {FORMATION_LIST.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Estilo</div>
                <select
                  className="input mt-1 w-full"
                  value={team.style}
                  onChange={(e) => {
                    team.style = e.target.value as Style;
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
                    rerender();
                  }}
                >
                  {starters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Táctica avanzada */}
          <div className="card p-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="label">Altura de línea</div>
                <select
                  className="input mt-1 w-full"
                  value={team.lineHeight}
                  onChange={(e) => {
                    team.lineHeight = e.target.value as LineHeight;
                    rerender();
                  }}
                >
                  {(Object.keys(LINE_HEIGHT_TABLE) as LineHeight[]).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Salida</div>
                <select
                  className="input mt-1 w-full"
                  value={team.buildUp}
                  onChange={(e) => {
                    team.buildUp = e.target.value as BuildUp;
                    rerender();
                  }}
                >
                  {(Object.keys(BUILDUP_TABLE) as BuildUp[]).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Presión</div>
                <select
                  className="input mt-1 w-full"
                  value={team.pressIntensity}
                  onChange={(e) => {
                    team.pressIntensity = e.target.value as PressIntensity;
                    rerender();
                  }}
                >
                  {(Object.keys(PRESS_TABLE) as PressIntensity[]).map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cancha */}
          <div className="mt-5 rounded-2xl bg-pitch relative overflow-hidden" style={{ minHeight: 380 }}>
            <div className="relative z-10 grid grid-rows-4 h-[380px] p-3 gap-1">
              {(["FWD", "MID", "DEF", "GK"] as Position[]).map((rowPos) => {
                const indexes = slots.map((s, i) => (s === rowPos ? i : -1)).filter((i) => i >= 0);
                if (indexes.length === 0) return null;
                return (
                  <div key={rowPos} className="flex items-center justify-around gap-2">
                    {indexes.map((i) => {
                      const id = team.starting[i];
                      const p = team.squad.find((pp) => pp.id === id);
                      const slotPos = slots[i];
                      const factor = p ? outOfPositionFactor({ ...p, fieldPosition: slotPos }) : 1;
                      const oop = p && factor < 1;
                      return (
                        <label key={i} className="flex flex-col items-center text-center max-w-[9rem] flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-lime-200/80">
                            {POSITION_SHORT[slotPos]}
                          </span>
                          <select
                            value={id ?? ""}
                            onChange={(e) => swapSlot(i, e.target.value)}
                            className="mt-1 w-full appearance-none rounded-lg bg-white/95 text-foreground text-xs font-medium px-2 py-1.5 shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {team.squad.map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.name} ({sp.overall} {POSITION_SHORT[sp.position]})
                              </option>
                            ))}
                          </select>
                          {oop && <span className="text-[10px] font-bold text-red-400 mt-0.5">Fuera de pos.</span>}
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </fieldset>

        {/* Roles individuales — siempre visibles pero solo editables si canEdit */}
        <IndividualRoles team={team} slots={slots} onChange={rerender} canEdit={canEdit} />

        {!canEdit && (
          <p className="mt-3 text-xs text-muted-foreground">
            En modo Roles solo el encargado de la alineación puede editarla.
          </p>
        )}

        {error && (
          <div className="mt-4 text-sm text-destructive-foreground bg-destructive rounded-md px-3 py-2">{error}</div>
        )}
      </div>

      {/* Barra inferior */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-background/95 backdrop-blur px-4 py-3">
        <div className="max-w-4xl mx-auto flex flex-wrap gap-3 items-center">
          {canEdit && (
            <button className="btn-secondary" onClick={() => { team.starting = autoLineup(team.squad, team.formation); rerender(); }}>
              Auto-alineación
            </button>
          )}
          <button className="btn-primary flex-1 min-w-[10rem]" onClick={confirmar} disabled={saving}>
            {saving ? "Guardando..." : yoListo ? "Actualizar confirmación" : "Confirmar equipo"}
          </button>
          {soyAdmin && (
            <>
              <button className="btn-ghost" onClick={() => setTransferOpen(true)}>
                Transferir control
              </button>
              <button
                className="btn-primary min-w-[10rem] disabled:opacity-50"
                onClick={iniciarPartido}
                disabled={!ambosListos}
                title={ambosListos ? "" : "Ambos equipos deben confirmar"}
              >
                Iniciar partido →
              </button>
            </>
          )}
        </div>
        {soyAdmin && !ambosListos && (
          <p className="max-w-4xl mx-auto mt-1 text-[11px] text-muted-foreground">
            Esperando a que ambos equipos confirmen su alineación.
          </p>
        )}
      </div>

      {transferOpen && (
        <TransferirAdminModal
          partidaId={partidaId}
          jugadores={jugadores}
          adminDeviceId={partida!.admin_device_id}
          onClose={() => setTransferOpen(false)}
          onDone={refrescar}
        />
      )}
    </div>
  );
}

const POSITION_SHORT_ROLES: Record<Position, string> = { GK: "ARQ", DEF: "DEF", MID: "MED", FWD: "DEL" };

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

function IndividualRoles({
  team,
  slots,
  onChange,
  canEdit,
}: {
  team: Team;
  slots: Position[];
  onChange: () => void;
  canEdit: boolean;
}) {
  const starters = team.starting
    .map((id, i) => {
      const p = team.squad.find((pp) => pp.id === id);
      return p ? { p, fieldPos: slots[i] } : null;
    })
    .filter(Boolean) as Array<{ p: Player; fieldPos: Position }>;

  return (
    <div className="mt-6">
      <h2 className="font-display font-bold text-lg">Roles individuales</h2>
      <p className="text-xs text-muted-foreground mt-0.5">
        Ajustan levemente el aporte de cada jugador al Nivel de Ataque o Defensa del equipo.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {starters.map(({ p, fieldPos }) => {
          const roles = rolesForPosition(fieldPos);
          const groups = Array.from(new Set(roles.map((r) => ROLE_TABLE[r].group ?? "")));
          const currentRole = roles.includes(p.individualRole || "") ? p.individualRole : "";
          return (
            <div key={p.id} className="card px-3 py-2 flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {p.name}{" "}
                  <span className="text-xs text-muted-foreground">({POSITION_SHORT_ROLES[fieldPos]})</span>
                </div>
                {roles.length > 0 ? (
                  <select
                    className="input mt-1 w-full text-xs"
                    disabled={!canEdit}
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
