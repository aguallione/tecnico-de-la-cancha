import { createFileRoute } from "@tanstack/react-router";
import { resolverPartidosVencidos } from "@/lib/football/tournament-cron";

export const Route = createFileRoute("/api/resolver-torneos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secreto = request.headers.get("x-resolver-secret");
        if (!secreto || secreto !== process.env.TORNEO_RESOLVER_SECRET) {
          return new Response(JSON.stringify({ error: "No autorizado." }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const resultado = await resolverPartidosVencidos();
          return Response.json(resultado);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});