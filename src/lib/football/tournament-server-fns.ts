/**
 * tournament-server-fns.ts — funciones de servidor para Torneos.
 * Usan service_role: son las únicas autorizadas a escribir el resultado
 * de un torneo_partidos (ver adenda, sección 2.6 — nunca desde el cliente).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceClient } from "@/lib/online/supabase-server";
import type { TournamentMatchResult } from "./tournament-types";

const matchStatsSchema = z.record(
  z.string(),
  z.object({
    playerId: z.string(),
    goals: z.number(),
    saves: z.number(),
    shots: z.number(),
    minutesPlayed: z.number(),
    yellowCards: z.number(),
    redCarded: z.boolean(),
  }),
);

const matchZoneSchema = z.object({
  team: z.union([z.literal(0), z.literal(1)]),
  depth: z.enum(["area_propia", "tercio_propio", "medio", "tercio_rival", "area_rival"]),
  lane: z.enum(["izquierda", "centro", "derecha"]),
});

const matchEventSchema = z.object({
  minute: z.number(),
  text: z.string(),
  kind: z.enum([
    "info", "goal", "chance", "card", "sub", "foul", "corner", "kickoff", "final", "insight",
  ]),
  team: z.union([z.literal(0), z.literal(1)]).optional(),
  zone: matchZoneSchema.optional(),
});

const resultadoSchema = z.object({
  homeGoals: z.number().min(0),
  awayGoals: z.number().min(0),
  stats: z.object({ players: matchStatsSchema }),
  events: z.array(matchEventSchema),
  penalties: z
    .object({ homeGoals: z.number().min(0), awayGoals: z.number().min(0) })
    .optional(),
});

/**
 * Escribe el resultado final de un partido de torneo. Es la única forma
 * autorizada de tocar el campo `resultado` de torneo_partidos — no hay
 * ninguna policy de UPDATE para el cliente en esa tabla (ver migración
 * 20260804190000_torneos_setup.sql).
 */
export const escribirResultadoTorneoPartido = createServerFn({ method: "POST" })
  .validator(
    z.object({
      torneo_partido_id: z.string(),
      resultado: resultadoSchema,
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServiceClient();

    const { data: partido, error: errorLectura } = await supabase
      .from("torneo_partidos")
      .select("*")
      .eq("id", data.torneo_partido_id)
      .maybeSingle();
    if (errorLectura) throw new Error(errorLectura.message);
    if (!partido) throw new Error("El partido de torneo no existe.");
    if (partido.estado === "jugado") {
      throw new Error("Este partido ya tiene un resultado cargado.");
    }

    const resultado: TournamentMatchResult = data.resultado as TournamentMatchResult;

    const { error: errorUpdate } = await supabase
      .from("torneo_partidos")
      .update({ resultado, estado: "jugado" })
      .eq("id", data.torneo_partido_id);
    if (errorUpdate) throw new Error(errorUpdate.message);

    return { ok: true as const };
  });