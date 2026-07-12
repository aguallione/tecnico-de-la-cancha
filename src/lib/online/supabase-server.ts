/**
 * supabase-server.ts — cliente Supabase server-side con SERVICE ROLE.
 *
 * SOLO debe importarse desde funciones de servidor (createServerFn). Usa la
 * SUPABASE_SERVICE_ROLE_KEY, que bypassa RLS y es la autoridad única del motor
 * (aplica ticks, sucesión de admin, aprobación de subs). Nunca exponer al cliente.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  // En el servidor las VITE_* también están disponibles vía import.meta.env
  // (Vite las inyecta), y la service role solo por process.env.
  const url =
    process.env.VITE_PUBLIC_SUPABASE_URL ??
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Falta VITE_PUBLIC_SUPABASE_URL en el servidor.");
  if (!serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.");

  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
