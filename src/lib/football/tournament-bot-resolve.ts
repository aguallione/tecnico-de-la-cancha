/** Resolución segura, en el servidor, de cruces Bot contra Bot. */

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/online/supabase-server";
import { initMatch, tickMinute } from "./engine";
import {
  rowToFixtureMatch,
  rowToSlot,
  teamFromSlot,
  type TorneoPartidoRow,
  type TorneoSlotRow,
} from "./tournament-api";
import { simulatePenaltyShootout } from "./tournament-penalties";
import { escribirResultadoTorneoPartidoInterno } from "./tournament-server-fns";
import type { TournamentFormat } from "./tournament-types";
import type { MatchSettings } from "./types";

interface TorneoSeguro {
  id: string;
  creado_por: string;
  es_online: boolean;
  estado: string;
  formato: TournamentFormat;
  config_partido: MatchSettings;
}

export const resolverPartidoAutomatico = createServerFn({ method: "POST" })
  .validator(z.object({ torneo_partido_id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const authorization = getRequestHeader("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new Error("Necesitás iniciar sesión para resolver este partido.");

    const supabase = getServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      throw new Error("La sesión no es válida o venció. Volvé a iniciar sesión.");
    }

    const { data: partidoRaw, error: partidoError } = await supabase
      .from("torneo_partidos")
      .select("*, torneos!inner(id, creado_por, es_online, estado, formato, config_partido)")
      .eq("id", data.torneo_partido_id)
      .maybeSingle();
    if (partidoError) throw new Error(partidoError.message);
    if (!partidoRaw) throw new Error("El partido de torneo no existe.");

    const partido = rowToFixtureMatch(partidoRaw as TorneoPartidoRow);
    const torneo = partidoRaw.torneos as TorneoSeguro;
    const { data: admin } = await supabase
      .from("torneo_admins")
      .select("usuario_id")
      .eq("torneo_id", torneo.id)
      .eq("usuario_id", authData.user.id)
      .maybeSingle();
    if (torneo.creado_por !== authData.user.id && !admin) {
      throw new Error("No tenés permisos para resolver partidos de este torneo.");
    }
    if (torneo.es_online)
      throw new Error("Los partidos online no se pueden resolver automáticamente desde el Hub.");
    if (partidoRaw.resultado || partido.status === "jugado")
      throw new Error("Este partido ya fue resuelto.");
    if (partido.status !== "pendiente")
      throw new Error("Solo se puede resolver un partido pendiente.");
    if (torneo.estado !== "en_curso") throw new Error("El torneo no está en curso.");

    const { data: slotsRaw, error: slotsError } = await supabase
      .from("torneo_slots")
      .select("*")
      .eq("torneo_id", torneo.id)
      .in("id", [partido.homeSlotId, partido.awaySlotId]);
    if (slotsError) throw new Error(slotsError.message);
    const slots = (slotsRaw ?? []).map((row) => rowToSlot(row as TorneoSlotRow));
    const home = slots.find((slot) => slot.id === partido.homeSlotId);
    const away = slots.find((slot) => slot.id === partido.awaySlotId);
    if (!home || !away) throw new Error("Faltan los equipos reales de este partido.");
    if (!home.teamConfig.isBot || !away.teamConfig.isBot || home.ownerUserId || away.ownerUserId) {
      throw new Error("La resolución automática solo admite cruces Bot contra Bot.");
    }

    const state = initMatch([teamFromSlot(home), teamFromSlot(away)], {
      ...torneo.config_partido,
      interactive: false,
    });
    let minutosCorridos = 0;
    while (!state.finished) {
      tickMinute(state);
      if (++minutosCorridos > 500)
        throw new Error("El motor no terminó el partido dentro del límite permitido.");
    }

    const penalties =
      torneo.formato === "eliminacion_directa" && state.teams[0].goals === state.teams[1].goals
        ? simulatePenaltyShootout([state.teams[0], state.teams[1]]).result
        : undefined;
    await escribirResultadoTorneoPartidoInterno(partido.id, {
      homeGoals: state.teams[0].goals,
      awayGoals: state.teams[1].goals,
      stats: { players: state.playerStats },
      events: state.events,
      ...(penalties ? { penalties } : {}),
    });
    return { ok: true as const };
  });
