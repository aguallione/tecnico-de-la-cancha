/**
 * tournament-penalties.ts — definición por penales, lógica pura sin Supabase.
 * Tanda estándar de 5 penales alternados; si sigue empatado, muerte súbita
 * de a un par hasta que se rompa el empate. No incluye la optimización real
 * de "corte anticipado cuando ya está matemáticamente definido" — se patean
 * los 5 aunque ya esté decidido, para no complicar la lógica sin necesidad.
 */

import type { Player, Team } from "./types";
import type { TournamentPenaltyResult } from "./tournament-types";

export interface PenaltyKick {
  teamIdx: 0 | 1;
  shooterName: string;
  scored: boolean;
  roundNumber: number;
}

export interface PenaltyShootoutResult {
  kicks: PenaltyKick[];
  result: TournamentPenaltyResult;
}

function pateadoresOrdenados(team: Team): Player[] {
  const starters = team.squad.filter((p) => team.starting.includes(p.id) && p.position !== "POR");
  const ordenados = [...starters].sort((a, b) => b.shooting - a.shooting);
  const preferidoId = team.penaltyTakerId;
  const preferido = preferidoId ? ordenados.find((p) => p.id === preferidoId) : undefined;
  if (preferido) {
    return [preferido, ...ordenados.filter((p) => p.id !== preferido.id)];
  }
  return ordenados.length > 0 ? ordenados : team.squad.filter((p) => team.starting.includes(p.id));
}

function arqueroDe(team: Team): Player | undefined {
  return team.squad.find((p) => team.starting.includes(p.id) && p.position === "POR");
}

function probabilidadDeGol(shooter: Player, gkRival: Player | undefined): number {
  const base = 0.72 + (shooter.shooting - 60) / 300;
  const paradaGk = gkRival
    ? (gkRival.gkReflexes ?? 50) * 0.6 + (gkRival.gkDiving ?? 50) * 0.4
    : 50;
  const ajusteGk = (60 - paradaGk) / 400;
  return Math.max(0.35, Math.min(0.92, base + ajusteGk));
}

export function simulatePenaltyShootout(teams: [Team, Team]): PenaltyShootoutResult {
  const [A, B] = teams;
  const tandaA = pateadoresOrdenados(A);
  const tandaB = pateadoresOrdenados(B);
  const gkA = arqueroDe(A);
  const gkB = arqueroDe(B);

  const kicks: PenaltyKick[] = [];
  let golesA = 0;
  let golesB = 0;

  function patear(tanda: Player[], idx: number, teamIdx: 0 | 1, gkRival: Player | undefined, ronda: number): boolean {
    const shooter = tanda[idx % tanda.length];
    const scored = Math.random() < probabilidadDeGol(shooter, gkRival);
    kicks.push({ teamIdx, shooterName: shooter.name, scored, roundNumber: ronda });
    return scored;
  }

  for (let ronda = 1; ronda <= 5; ronda++) {
    if (patear(tandaA, ronda - 1, 0, gkB, ronda)) golesA++;
    if (patear(tandaB, ronda - 1, 1, gkA, ronda)) golesB++;
  }

  let rondaExtra = 6;
  while (golesA === golesB) {
    if (patear(tandaA, rondaExtra - 1, 0, gkB, rondaExtra)) golesA++;
    if (patear(tandaB, rondaExtra - 1, 1, gkA, rondaExtra)) golesB++;
    rondaExtra++;
    if (rondaExtra > 40) break; // salvaguarda de emergencia, no debería pasar nunca
  }

  return { kicks, result: { homeGoals: golesA, awayGoals: golesB } };
}