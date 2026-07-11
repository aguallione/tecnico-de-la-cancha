-- ============================================================
-- setup-supabase.sql
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Si ya tenés la tabla sin la columna usuario_id, ejecutá primero
-- la sección "MIGRACIÓN" al final del archivo.
-- ============================================================

-- ── Crear tabla (primera vez) ────────────────────────────────────────────────

create table if not exists equipos_guardados (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  nombre      text not null,
  plantel     jsonb not null,
  creado_en   timestamptz not null default now()
);

-- Índice por usuario (todas las queries filtran por esto)
create index if not exists equipos_guardados_usuario_idx
  on equipos_guardados (usuario_id);

-- Índice secundario por nombre (case-insensitive)
create index if not exists equipos_guardados_nombre_idx
  on equipos_guardados (lower(nombre));

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Cada usuario solo puede ver, insertar y eliminar sus propios equipos.
-- auth.uid() es el UUID del usuario autenticado provisto por Supabase Auth.

alter table equipos_guardados enable row level security;

drop policy if exists "Lectura por usuario" on equipos_guardados;
create policy "Lectura por usuario"
  on equipos_guardados for select
  using (auth.uid() = usuario_id);

drop policy if exists "Inserción por usuario" on equipos_guardados;
create policy "Inserción por usuario"
  on equipos_guardados for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "Eliminación por usuario" on equipos_guardados;
create policy "Eliminación por usuario"
  on equipos_guardados for delete
  using (auth.uid() = usuario_id);


-- ============================================================
-- MIGRACIÓN — solo si ya tenías la tabla sin la columna usuario_id
-- Descomentá y ejecutá estas líneas en lugar del bloque de arriba.
-- ============================================================

-- -- 1. Agregar la columna (nullable al principio para no romper filas existentes)
-- alter table equipos_guardados
--   add column if not exists usuario_id uuid references auth.users(id) on delete cascade;

-- -- 2. Eliminar filas sin usuario_id (no se pueden asociar a nadie)
-- delete from equipos_guardados where usuario_id is null;

-- -- 3. Hacer la columna NOT NULL ahora que no hay nulls
-- alter table equipos_guardados
--   alter column usuario_id set not null;

-- -- 4. Índices
-- create index if not exists equipos_guardados_usuario_idx
--   on equipos_guardados (usuario_id);
-- create index if not exists equipos_guardados_nombre_idx
--   on equipos_guardados (lower(nombre));

-- -- 5. RLS: eliminar las policies permisivas anteriores y crear las nuevas
-- alter table equipos_guardados enable row level security;
-- drop policy if exists "Lectura pública" on equipos_guardados;
-- drop policy if exists "Inserción pública" on equipos_guardados;
-- drop policy if exists "Eliminación pública" on equipos_guardados;
-- create policy "Lectura por usuario" on equipos_guardados for select using (auth.uid() = usuario_id);
-- create policy "Inserción por usuario" on equipos_guardados for insert with check (auth.uid() = usuario_id);
-- create policy "Eliminación por usuario" on equipos_guardados for delete using (auth.uid() = usuario_id);
