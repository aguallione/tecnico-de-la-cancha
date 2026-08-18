/**
 * Escritura interna de resultados de torneos.
 *
 * La escritura privilegiada no es una createServerFn. El único camino público
 * de este módulo valida por separado el caso manual de torneos offline.
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
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
    "info",
    "goal",
    "chance",
    "card",
    "sub",
    "foul",
    "corner",
    "kickoff",
    "final",
    "insight",
  ]),
  team: z.union([z.literal(0), z.literal(1)]).optional(),
  zone: matchZoneSchema.optional(),
});

const resultadoSchema = z.object({
  homeGoals: z.number().min(0),
  awayGoals: z.number().min(0),
  stats: z.object({ players: matchStatsSchema }),
  events: z.array(matchEventSchema),
  penalties: z.object({ homeGoals: z.number().min(0), awayGoals: z.number().min(0) }).optional(),
});

export async function escribirResultadoTorneoPartidoInterno(
  torneoPartidoId: string,
  resultado: TournamentMatchResult,
): Promise<void> {
  const supabase = getServiceClient();

  const { data: partido, error: errorLectura } = await supabase
    .from("torneo_partidos")
    .select("estado")
    .eq("id", torneoPartidoId)
    .maybeSingle();
  if (errorLectura) throw new Error(errorLectura.message);
  if (!partido) throw new Error("El partido de torneo no existe.");
  if (partido.estado === "jugado") {
    throw new Error("Este partido ya tiene un resultado cargado.");
  }

  const { data: actualizado, error: errorUpdate } = await supabase
    .from("torneo_partidos")
    .update({ resultado, estado: "jugado" })
    .eq("id", torneoPartidoId)
    .in("estado", ["pendiente", "en_curso"])
    .is("resultado", null)
    .select("id")
    .maybeSingle();
  if (errorUpdate) throw new Error(errorUpdate.message);
  if (!actualizado) throw new Error("El partido ya fue resuelto o no admite resultados.");
}

/**
 * Guarda el resultado producido por un partido manual. Solo se admite para
 * torneos offline que administra el usuario autenticado.
 */
export const guardarResultadoManualTorneo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      torneo_partido_id: z.string().uuid(),
      resultado: resultadoSchema,
    }),
  )
  .handler(async ({ data }) => {
    const authorization = getRequestHeader("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new Error("Necesitás iniciar sesión para guardar este resultado.");

    const supabase = getServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      throw new Error("La sesión no es válida o venció. Volvé a iniciar sesión.");
    }

    const { data: partido, error: partidoError } = await supabase
      .from("torneo_partidos")
      .select("id, estado, resultado, torneos!inner(id, creado_por, es_online, estado)")
      .eq("id", data.torneo_partido_id)
      .maybeSingle();
    if (partidoError) throw new Error(partidoError.message);
    if (!partido) throw new Error("El partido de torneo no existe.");

    const torneo = partido.torneos as unknown as {
      id: string;
      creado_por: string;
      es_online: boolean;
      estado: string;
    };
    if (torneo.es_online) {
      throw new Error(
        "Los resultados manuales enviados por el navegador no se admiten en torneos online.",
      );
    }
    if (torneo.estado !== "en_curso") throw new Error("El torneo no está en curso.");
    if (partido.resultado || partido.estado === "jugado") {
      throw new Error("Este partido ya fue resuelto.");
    }
    if (partido.estado !== "pendiente") {
      throw new Error("Solo se puede guardar el resultado de un partido pendiente.");
    }

    const { data: admin, error: adminError } = await supabase
      .from("torneo_admins")
      .select("usuario_id")
      .eq("torneo_id", torneo.id)
      .eq("usuario_id", authData.user.id)
      .maybeSingle();
    if (adminError) throw new Error(adminError.message);
    if (torneo.creado_por !== authData.user.id && !admin) {
      throw new Error("No tenés permisos para guardar resultados de este torneo.");
    }

    await escribirResultadoTorneoPartidoInterno(partido.id, data.resultado);
    return { ok: true as const };
  });
