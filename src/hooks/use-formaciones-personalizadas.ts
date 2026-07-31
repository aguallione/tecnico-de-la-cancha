'use client';
/**
 * useFormacionesPersonalizadas
 *
 * Hook para operaciones CRUD contra la tabla `formaciones_personalizadas` de
 * Supabase. Requiere sesión activa: filtra y escribe siempre con el usuario_id
 * del usuario autenticado. La RLS de Supabase refuerza esto a nivel base de datos.
 *
 * Esquema de la tabla:
 *   id          uuid  PK
 *   usuario_id  uuid  NOT NULL  ← auth.uid() del usuario que la creó
 *   nombre      text  NOT NULL
 *   filas       jsonb NOT NULL  ← array de arrays de Position, de atrás (arquero)
 *                                 hacia adelante (ataque), ya en orden izquierda-
 *                                 derecha, mismo formato que FORMATION_ROWS.
 *   creado_en   timestamptz
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";
import type { Position } from "@/lib/football/types";

export interface FormacionPersonalizada {
  id: string;
  usuario_id: string;
  nombre: string;
  filas: Position[][];
  creado_en: string;
}

interface State {
  formaciones: FormacionPersonalizada[];
  loading: boolean;
  error: string | null;
}

export function useFormacionesPersonalizadas() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({
    formaciones: [],
    loading: false,
    error: null,
  });

  const cargar = useCallback(async () => {
    if (!user) {
      setState({ formaciones: [], loading: false, error: null });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, error } = await supabase
      .from("formaciones_personalizadas")
      .select("id, usuario_id, nombre, filas, creado_en")
      .eq("usuario_id", user.id)
      .order("creado_en", { ascending: false });

    if (error) {
      setState({ formaciones: [], loading: false, error: error.message });
      return;
    }

    setState({ formaciones: (data ?? []) as FormacionPersonalizada[], loading: false, error: null });
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = useCallback(
    async (nombre: string, filas: Position[][]): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "Necesitás iniciar sesión para guardar una formación." };

      const totalJugadores = filas.reduce((s, fila) => s + fila.length, 0);
      const totalArqueros = filas.flat().filter((p) => p === "POR").length;
      if (totalJugadores !== 11) return { ok: false, error: "La formación debe tener exactamente 11 jugadores." };
      if (totalArqueros !== 1) return { ok: false, error: "La formación debe tener exactamente 1 arquero." };

      const { error } = await supabase.from("formaciones_personalizadas").insert({
        usuario_id: user.id,
        nombre: nombre.trim(),
        filas,
      });

      if (error) return { ok: false, error: error.message };

      await cargar();
      return { ok: true };
    },
    [user, cargar],
  );

  const eliminar = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      if (!user) return { ok: false, error: "No hay sesión activa." };

      const { error } = await supabase
        .from("formaciones_personalizadas")
        .delete()
        .eq("id", id)
        .eq("usuario_id", user.id);

      if (error) return { ok: false, error: error.message };

      setState((s) => ({ ...s, formaciones: s.formaciones.filter((f) => f.id !== id) }));
      return { ok: true };
    },
    [user],
  );

  return {
    formaciones: state.formaciones,
    loading: state.loading,
    error: state.error,
    guardar,
    eliminar,
    refrescar: cargar,
  };
}