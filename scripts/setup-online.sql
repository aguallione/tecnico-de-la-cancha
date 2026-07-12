-- ============================================================
-- setup-online.sql
-- Multijugador online: tablas partidas_online, jugadores_online
-- y columna es_publico en equipos_guardados.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- NOTA: Según el flujo del proyecto, la migración base (crear las
-- tablas y la columna es_publico) YA fue aplicada. Este archivo es la
-- fuente de verdad del estado final e incluye la CORRECCIÓN DE
-- SEGURIDAD (sección al final) que debe aplicarse sobre lo ya creado:
--   · jugadores_online.usuario_id pasa a ser NOT NULL (uid real,
--     de cuenta o de sesión anónima de Supabase Auth).
--   · Las policies de UPDATE y DELETE dejan de ser USING (true) y
--     pasan a USING (auth.uid() = usuario_id), para que un jugador
--     nunca pueda editar ni borrar la fila de otro.
-- ============================================================


-- ── Extensión necesaria para gen_random_uuid() ──────────────────────────────
create extension if not exists "pgcrypto";


-- ============================================================
-- 1. partidas_online
-- ============================================================
create table if not exists partidas_online (
  id                   uuid primary key default gen_random_uuid(),
  codigo               text unique not null,             -- 6 chars, ej "XK7P2Q"
  estado               text not null default 'esperando',-- esperando|configurando|vestuario|jugando|terminado
  admin_device_id      text not null,
  controller_device_id text,                             -- quien puede avanzar (default = admin)
  configuracion        jsonb,                            -- MatchSettings serializado
  equipo_0             jsonb,                            -- Team serializado (equipo_idx=0)
  equipo_1             jsonb,                            -- Team serializado (equipo_idx=1)
  match_state          jsonb,                            -- MatchState serializado
  velocidad            text not null default 'manual',   -- manual|normal|rapido
  bloque_minutos       integer not null default 5,       -- 5|10|15
  modo_coop_0          text not null default 'libre',    -- libre|roles|consenso|tiempos
  modo_coop_1          text not null default 'libre',
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now()
);

create index if not exists partidas_online_codigo_idx on partidas_online (codigo);


-- ============================================================
-- 2. jugadores_online
-- ============================================================
create table if not exists jugadores_online (
  id               uuid primary key default gen_random_uuid(),
  partida_id       uuid not null references partidas_online(id) on delete cascade,
  device_id        text not null,                        -- SIN unique: varios jugadores por dispositivo
  nombre           text not null,
  equipo_idx       integer not null,                     -- 0 o 1
  rol              text not null default 'jugador',      -- admin|controller|jugador
  equipo_listo     boolean not null default false,
  subs_pendientes  jsonb not null default '[]'::jsonb,   -- cola de sustituciones propuestas
  ultimo_heartbeat timestamptz not null default now(),
  -- CORRECCIÓN DE SEGURIDAD: usuario_id es NOT NULL (uid de cuenta real
  -- o de sesión anónima de Supabase Auth). Nunca null.
  usuario_id       uuid not null references auth.users(id) on delete cascade,
  unido_en         timestamptz not null default now()
);

create index if not exists jugadores_online_partida_idx on jugadores_online (partida_id);
create index if not exists jugadores_online_usuario_idx on jugadores_online (usuario_id);


-- ============================================================
-- 3. equipos_guardados: columna es_publico
-- ============================================================
alter table equipos_guardados
  add column if not exists es_publico boolean not null default false;

-- Lectura pública SOLO de equipos marcados como públicos.
drop policy if exists "Lectura pública equipos_publicos" on equipos_guardados;
create policy "Lectura pública equipos_publicos"
  on equipos_guardados for select
  using (es_publico = true);

-- Permitir que el dueño alterne es_publico (UPDATE de sus propias filas).
drop policy if exists "Actualización por usuario" on equipos_guardados;
create policy "Actualización por usuario"
  on equipos_guardados for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);


-- ============================================================
-- 4. RLS partidas_online
--    SELECT público (para polling). Las escrituras críticas las hace
--    el servidor con service_role (bypassa RLS).
-- ============================================================
alter table partidas_online enable row level security;

drop policy if exists "Lectura pública partidas" on partidas_online;
create policy "Lectura pública partidas"
  on partidas_online for select
  using (true);

-- Inserción desde el cliente al crear la partida (el admin la crea).
drop policy if exists "Inserción de partidas" on partidas_online;
create policy "Inserción de partidas"
  on partidas_online for insert
  with check (true);

-- UPDATE desde el cliente: el plan permite que el cliente escriba
-- configuracion, equipo_0/equipo_1, modo_coop y transiciones de estado.
-- Los campos de autoridad (admin_device_id, controller_device_id, match_state)
-- se escriben SOLO desde las funciones de servidor con service_role; por
-- convención el código cliente nunca los toca.
drop policy if exists "Actualización de partidas" on partidas_online;
create policy "Actualización de partidas"
  on partidas_online for update
  using (true)
  with check (true);


-- ============================================================
-- 5. RLS jugadores_online  — CORRECCIÓN DE SEGURIDAD
--    SELECT público (polling). INSERT: solo puede insertar su propia
--    fila (auth.uid() = usuario_id). UPDATE / DELETE: solo la fila
--    propia. Un jugador NUNCA puede editar/borrar la de otro.
-- ============================================================
alter table jugadores_online enable row level security;

drop policy if exists "Lectura pública jugadores" on jugadores_online;
create policy "Lectura pública jugadores"
  on jugadores_online for select
  using (true);

drop policy if exists "Inserción propia jugador" on jugadores_online;
create policy "Inserción propia jugador"
  on jugadores_online for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "Actualización propia jugador" on jugadores_online;
create policy "Actualización propia jugador"
  on jugadores_online for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "Eliminación propia jugador" on jugadores_online;
create policy "Eliminación propia jugador"
  on jugadores_online for delete
  using (auth.uid() = usuario_id);


-- ============================================================
-- 6. CORRECCIÓN DE SEGURIDAD sobre tabla ya existente
--    (ejecutar si jugadores_online se creó antes con usuario_id
--     nullable y/o con policies USING (true) en UPDATE/DELETE).
-- ============================================================

-- 6.a Eliminar filas huérfanas sin usuario_id antes de poner NOT NULL
-- delete from jugadores_online where usuario_id is null;

-- 6.b Forzar NOT NULL
-- alter table jugadores_online alter column usuario_id set not null;

-- 6.c Reemplazar policies permisivas por las seguras (ya cubierto arriba
--     por los drop policy if exists + create policy).
