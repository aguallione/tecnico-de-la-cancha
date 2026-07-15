'use client';
/**
 * useEquiposGuardados
 *
 * Hook para operaciones CRUD contra la tabla `equipos_guardados` de Supabase.
 * Requiere sesión activa: filtra y escribe siempre con el usuario_id del usuario
 * autenticado. La RLS de Supabase refuerza esto a nivel base de datos.
 *
 * Esquema de la tabla:
 *   id          uuid  PK (generado por Supabase)
 *   usuario_id  uuid  NOT NULL  ← auth.uid() del usuario que lo creó
 *   nombre      text  NOT NULL
 *   plantel     jsonb NOT NULL  ← array de Player serializado
 *   creado_en   timestamptz
 *
 * Migración transparente: al cargar equipos con la estructura vieja de 4
 * atributos (attack/defense/physical/pace), se convierten automáticamente a
 * la nueva estructura de 6 atributos (passing/shooting/dribbling/defense/
 * physical/pace) usando migrateSquadIfNeeded.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { Player } from "@/lib/football/types";
import { migrateSquadFull } from "@/lib/football/migration";

export interface EquipoGuardado {
  id: string;
  usuario_id: string;
  nombre: string;
  plantel: Player[];
  es_publico: boolean;
  creado_en: string;
}

interface State {
  equipos: EquipoGuardado[];
  loading: boolean;
  error: string | null;
}

export function useEquiposGuardados() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    equipos: [],
    loading: false,
    error: null,
  });

  // ── Cargar lista (solo si hay usuario logueado) ───────────────────────────

  const cargar = useCallback(async () => {
    if (!user) {
      setState({ equipos: [], loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase
      .from("equipos_guardados")
      .select("id, usuario_id, nombre, plantel, es_publico, creado_en")
      .eq("usuario_id", user.id)
      .order("creado_en", { ascending: false });

    if (error) {
      setState({ equipos: [], loading: false, error: error.message });
      return;
    }

    // Migrar planteles viejos: 4 atributos → 6 atributos Y posiciones genéricas → 15 específicas
    const equiposMigrados = (data ?? []).map((e) => ({
      ...e,
      plantel: migrateSquadFull(e.plantel as Player[]),
    }));

    setState({ equipos: equiposMigrados as EquipoGuardado[], loading: false, error: null });
  }, [user]);

  // Recargar cada vez que cambia el usuario (login / logout)
  useEffect(() => {
    cargar();
  }, [cargar]);

  // ── Guardar un plantel nuevo ──────────────────────────────────────────────

  const guardar = useCallback(
    async (nombre: string, plantel: Player[]): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Necesitás iniciar sesión para guardar un equipo." };

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

      const { error } = await supabase.from("equipos_guardados").insert({
        usuario_id: user.id,
        nombre: nombre.trim(),
        plantel: plantelLimpio,
      });

      if (error) return { ok: false, error: error.message };

      await cargar();
      return { ok: true };
    },
    [user, cargar],
  );

  // ── Eliminar un equipo (solo el propio) ───────────────────────────────────

  const eliminar = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "No hay sesión activa." };

      const { error } = await supabase
        .from("equipos_guardados")
        .delete()
        .eq("id", id)
        .eq("usuario_id", user.id);

      if (error) return { ok: false, error: error.message };

      setState((s) => ({ ...s, equipos: s.equipos.filter((e) => e.id !== id) }));
      return { ok: true };
    },
    [user],
  );

  // ── Alternar visibilidad pública de un equipo propio ─────────────────────

  const togglePublico = useCallback(
    async (id: string, esPublico: boolean): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "No hay sesión activa." };

      const { error } = await supabase
        .from("equipos_guardados")
        .update({ es_publico: esPublico })
        .eq("id", id)
        .eq("usuario_id", user.id);

      if (error) return { ok: false, error: error.message };

      setState((s) => ({
        ...s,
        equipos: s.equipos.map((e) => (e.id === id ? { ...e, es_publico: esPublico } : e)),
      }));
      return { ok: true };
    },
    [user],
  );

  return {
    equipos: state.equipos,
    loading: state.loading,
    error: state.error,
    guardar,
    eliminar,
    togglePublico,
    refrescar: cargar,
  };
}
