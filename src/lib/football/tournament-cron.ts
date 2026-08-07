/**
 * tournament-cron.ts — resolución masiva de partidos online vencidos.
 * Pensado para ser invocado por un endpoint HTTP protegido (ver
 * routes/api/resolver-torneos.ts), disparado periódicamente por
 * pg_cron + pg_net desde Supabase (4.4-6, sin construir todavía).
 * Usa service_role: nadie llama esto desde el navegador.
 */

import { getServiceClient } from "@/lib/online/supabase-server";
import { resolverPartidoAutomatico } from "./tournament-bot-resolve";
import { avanzarRondaSiCorresponde } from "./tournament-api";
import { rowToFixtureMatch, rowToSlot, type TorneoPartidoRow, type TorneoSlotRow } from "./tournament-api";

export interface ResolucionMasivaResultado {
  resueltos: number;
  errores: string[];
}

export async function resolverPartidosVencidos(): Promise<ResolucionMasivaResultado> {
  const supabase = getServiceClient();
  const ahoraIso = new Date().toISOString();

  const { data: partidosVencidosRaw, error } = await supabase
    .from("torneo_partidos")
    .select("*, torneos!inner(es_online, estado, formato, config_partido)")
    .eq("estado", "pendiente")
    .eq("torneos.es_online", true)
    .eq("torneos.estado", "en_curso")
    .not("hora_programada", "is", null)
    .lte("hora_programada", ahoraIso);

  if (error) throw new Error(error.message);
  if (!partidosVencidosRaw || partidosVencidosRaw.length === 0) {
    return { resueltos: 0, errores: [] };
  }

  let resueltos = 0;
  const errores: string[] = [];
  const torneoIdsAfectados = new Set<string>();

  for (const row of partidosVencidosRaw as Array<TorneoPartidoRow & { torneos: { es_online: boolean; estado: string; formato: string; config_partido: any } }>) {
    try {
      const match = rowToFixtureMatch(row);
      torneoIdsAfectados.add(row.torneo_id);

      const { data: slotsData, error: slotsError } = await supabase
        .from("torneo_slots")
        .select("*")
        .in("id", [match.homeSlotId, match.awaySlotId]);
      if (slotsError) throw new Error(slotsError.message);

      const slots = (slotsData ?? []).map((s) => rowToSlot(s as TorneoSlotRow));
      const home = slots.find((s) => s.id === match.homeSlotId);
      const away = slots.find((s) => s.id === match.awaySlotId);
      if (!home || !away) throw new Error(`Faltan slots para el partido ${match.id}.`);

      await resolverPartidoAutomatico({
        match,
        home,
        away,
        matchSettings: row.torneos.config_partido,
        esEliminacionDirecta: row.torneos.formato === "eliminacion_directa",
      });
      resueltos++;
    } catch (e) {
      errores.push(`Partido ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const torneoId of torneoIdsAfectados) {
    try {
      await avanzarRondaSiCorresponde(torneoId);
    } catch (e) {
      errores.push(`Avance de ronda, torneo ${torneoId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { resueltos, errores };
}