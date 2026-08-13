/**
 * tournament-live-server-fns.ts — server functions invocables desde el
 * navegador para el partido de torneo en vivo. Separado de
 * tournament-server-fns.ts para evitar un ciclo de imports (ese archivo
 * es importado por tournament-cron.ts, que es de donde viene
 * ponerAlDiaPartidoTorneo).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ponerAlDiaPartidoTorneo } from "./tournament-cron";

export const avanzarPartidoTorneoEnVivo = createServerFn({ method: "POST" })
  .validator(
    z.object({
      torneo_partido_id: z.string(),
      partida_online_id: z.string(),
      formato: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const resultado = await ponerAlDiaPartidoTorneo(
      data.torneo_partido_id,
      data.partida_online_id,
      data.formato,
    );
    return { resultado };
  });