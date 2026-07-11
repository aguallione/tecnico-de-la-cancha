-- Ejecutar este script en el SQL Editor de tu proyecto Supabase
-- https://supabase.com/dashboard → SQL Editor

create table if not exists equipos_guardados (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  plantel     jsonb not null,
  creado_en   timestamptz not null default now()
);

-- Índice para búsquedas por nombre (case-insensitive)
create index if not exists equipos_guardados_nombre_idx
  on equipos_guardados (lower(nombre));

-- Row Level Security: en este juego no hay autenticación de usuarios,
-- así que se permiten todas las operaciones públicas (anon key).
-- Si en el futuro agregás auth, restringí estas políticas.
alter table equipos_guardados enable row level security;

drop policy if exists "Lectura pública" on equipos_guardados;
create policy "Lectura pública"
  on equipos_guardados for select
  using (true);

drop policy if exists "Inserción pública" on equipos_guardados;
create policy "Inserción pública"
  on equipos_guardados for insert
  with check (true);

drop policy if exists "Eliminación pública" on equipos_guardados;
create policy "Eliminación pública"
  on equipos_guardados for delete
  using (true);
