/**
 * tournament-live-server-fns.ts — server functions invocables desde el
 * navegador para el partido de torneo en vivo. Separado de
 * tournament-server-fns.ts para evitar un ciclo de imports (ese archivo
 * es importado por tournament-cron.ts, que es de donde viene
 * ponerAlDiaPartidoTorneo).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getServiceClient } from "@/lib/online/supabase-server";
import { ponerAlDiaPartidoTorneo } from "./tournament-cron";

export const avanzarPartidoTorneoEnVivo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      torneo_partido_id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const authorization = getRequestHeader("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw new Error("Necesitás iniciar sesión para ver este partido.");

    const supabase = getServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) {
      throw new Error("La sesión no es válida o venció. Volvé a iniciar sesión.");
    }

    const { data: partido, error: partidoError } = await supabase
      .from("torneo_partidos")
      .select("id, partida_online_id, torneos!inner(id, creado_por, es_online, formato)")
      .eq("id", data.torneo_partido_id)
      .maybeSingle();
    if (partidoError) throw new Error(partidoError.message);
    if (!partido) throw new Error("El partido de torneo no existe.");

    const torneo = partido.torneos as unknown as {
      id: string;
      creado_por: string;
      es_online: boolean;
      formato: string;
    };
    if (!torneo.es_online) throw new Error("Este partido no pertenece a un torneo online.");
    if (!partido.partida_online_id)
      throw new Error("El partido online todavía no está disponible.");

    const usuarioId = authData.user.id;
    const [{ data: participante, error: participanteError }, { data: admin, error: adminError }] =
      await Promise.all([
        supabase
          .from("torneo_slots")
          .select("id")
          .eq("torneo_id", torneo.id)
          .eq("usuario_id", usuarioId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("torneo_admins")
          .select("usuario_id")
          .eq("torneo_id", torneo.id)
          .eq("usuario_id", usuarioId)
          .maybeSingle(),
      ]);
    if (participanteError) throw new Error(participanteError.message);
    if (adminError) throw new Error(adminError.message);
    if (torneo.creado_por !== usuarioId && !participante && !admin) {
      throw new Error("No tenés permisos para ver partidos de este torneo.");
    }

    const resultado = await ponerAlDiaPartidoTorneo(
      partido.id,
      partido.partida_online_id,
      torneo.formato,
    );
    return { resultado };
  });
