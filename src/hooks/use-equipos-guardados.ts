/**
 * useEquiposGuardados
 *
 * Hook para operaciones CRUD contra la tabla `equipos_guardados` de Supabase.
 * No depende de autenticación: usa la anon key con RLS permisiva.
 *
 * Esquema de la tabla:
 *   id         uuid  PK (generado por Supabase)
 *   nombre     text  NOT NULL
 *   plantel    jsonb NOT NULL  ← array de Player serializado
 *   creado_en  timestamptz
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/lib/football/types";

export interface EquipoGuardado {
  id: string;
  nombre: string;
  plantel: Player[];
  creado_en: string;
}

interface State {
  equipos: EquipoGuardado[];
  loading: boolean;
  error: string | null;
}

export function useEquiposGuardados() {
  const [state, setState] = useState<State>({
    equipos: [],
    loading: true,
    error: null,
  });

  // ── Cargar lista ──────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase
      .from("equipos_guardados")
      .select("id, nombre, plantel, creado_en")
      .order("creado_en", { ascending: false });

    if (error) {
      setState({ equipos: [], loading: false, error: error.message });
      return;
    }

    setState({ equipos: (data ?? []) as EquipoGuardado[], loading: false, error: null });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Guardar un plantel nuevo ──────────────────────────────────────────────

  const guardar = useCallback(
    async (nombre: string, plantel: Player[]): Promise<{ ok: boolean; error?: string }> => {
      // Limpiar campos de estado dinámico antes de persistir
      const plantelLimpio: Player[] = plantel.map((p) => ({
        ...p,
        stamina: 100,
        onField: false,
        redCarded: false,
        yellowCards: 0,
        injured: false,
        fieldPosition: undefined,
        slotIndex: undefined,
      }));

      const { error } = await supabase
        .from("equipos_guardados")
        .insert({ nombre: nombre.trim(), plantel: plantelLimpio });

      if (error) return { ok: false, error: error.message };

      // Refrescar lista local tras insertar
      await cargar();
      return { ok: true };
    },
    [cargar],
  );

  // ── Eliminar un equipo ────────────────────────────────────────────────────

  const eliminar = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      const { error } = await supabase.from("equipos_guardados").delete().eq("id", id);

      if (error) return { ok: false, error: error.message };

      setState((s) => ({ ...s, equipos: s.equipos.filter((e) => e.id !== id) }));
      return { ok: true };
    },
    [],
  );

  return {
    equipos: state.equipos,
    loading: state.loading,
    error: state.error,
    guardar,
    eliminar,
    refrescar: cargar,
  };
}
