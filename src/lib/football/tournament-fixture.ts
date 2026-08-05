/**
 * tournament-fixture.ts — generación de fixture, sin dependencia de Supabase.
 * Lógica pura: dado un listado de slots (y su orden de seed), devuelve los
 * cruces a crear en torneo_partidos. Nada de esto toca la base de datos.
 */

import type { TournamentFixtureMatch } from "./tournament-types";

type FixtureDraft = Pick<TournamentFixtureMatch, "round" | "homeSlotId" | "awaySlotId" | "bracketPosition">;

const BYE = "__BYE__";

/**
 * Liga simple (o ida y vuelta) por el método del círculo.
 * Determinístico: mismo orden de entrada → mismo fixture siempre.
 * Si la cantidad de slots es impar, se agrega un "descanso" ficticio (BYE)
 * que no genera partido — un equipo libra esa jornada.
 */
export function generateRoundRobinFixture(
  slotIdsEnOrden: string[],
  idaYVuelta: boolean,
): FixtureDraft[] {
  const ids = [...slotIdsEnOrden];
  if (ids.length % 2 !== 0) ids.push(BYE);

  const n = ids.length;
  const jornadasIda = n - 1;
  const mitad = n / 2;
  const matches: FixtureDraft[] = [];

  const arr = [...ids];
  for (let ronda = 0; ronda < jornadasIda; ronda++) {
    for (let i = 0; i < mitad; i++) {
      const local = arr[i];
      const visitante = arr[n - 1 - i];
      if (local === BYE || visitante === BYE) continue;
      const invertir = ronda % 2 === 1;
      matches.push({
        round: ronda + 1,
        homeSlotId: invertir ? visitante : local,
        awaySlotId: invertir ? local : visitante,
      });
    }
    const fijo = arr[0];
    const resto = arr.slice(1);
    resto.unshift(resto.pop()!);
    arr.splice(0, arr.length, fijo, ...resto);
  }

  if (idaYVuelta) {
    const vuelta = matches.map((m) => ({
      round: m.round + jornadasIda,
      homeSlotId: m.awaySlotId,
      awaySlotId: m.homeSlotId,
    }));
    matches.push(...vuelta);
  }

  return matches;
}

export function totalRondasLiga(cantidadSlots: number, idaYVuelta: boolean): number {
  const n = cantidadSlots % 2 === 0 ? cantidadSlots : cantidadSlots + 1;
  const jornadasIda = n - 1;
  return idaYVuelta ? jornadasIda * 2 : jornadasIda;
}

/**
 * Eliminación directa — primera ronda del bracket, emparejando por seed
 * (1 vs último, 2 vs anteúltimo, etc.) para que los mejores no se crucen
 * temprano. Requiere que la cantidad de slots sea potencia de 2 — completar
 * con bots antes de llamar a esta función si hace falta.
 */
export function generateBracketFirstRound(slotIdsPorSeed: string[]): FixtureDraft[] {
  const n = slotIdsPorSeed.length;
  const esPotenciaDeDos = n > 0 && (n & (n - 1)) === 0;
  if (!esPotenciaDeDos) {
    throw new Error(
      `generateBracketFirstRound requiere una potencia de 2 (recibió ${n}). Completar cupos con bots antes de generar el bracket.`,
    );
  }
  const matches: FixtureDraft[] = [];
  for (let i = 0; i < n / 2; i++) {
    matches.push({
      round: 1,
      homeSlotId: slotIdsPorSeed[i],
      awaySlotId: slotIdsPorSeed[n - 1 - i],
      bracketPosition: i,
    });
  }
  return matches;
}

export function totalRondasBracket(cantidadSlots: number): number {
  return Math.log2(cantidadSlots);
}