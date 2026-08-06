-- Multi-admin de torneos
create table if not exists torneo_admins (
  torneo_id uuid not null references torneos(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (torneo_id, usuario_id)
);

alter table torneo_admins enable row level security;

-- Cualquiera puede ver quiénes son admins de un torneo (no es información sensible)
create policy "torneo_admins_select_todos"
  on torneo_admins for select
  using (true);

-- Solo un admin existente puede promover a otro (se valida en la función de
-- servidor, no acá — la policy de INSERT se deja abierta a usuarios
-- autenticados porque la validación real de "sos admin" vive en el server fn
-- con service_role, igual que el resto de la escritura de Torneos)
create policy "torneo_admins_insert_autenticados"
  on torneo_admins for insert
  to authenticated
  with check (true);

-- Configuración de horario del torneo
alter table torneos
  add column if not exists modo_horario text
    check (modo_horario in ('manual', 'automatico_simultaneo', 'automatico_escalonado')),
  add column if not exists horario_aleatorio boolean not null default false,
  add column if not exists rango_horario_inicio time,
  add column if not exists rango_horario_fin time,
  add column if not exists intervalo_horas numeric;

-- Horario programado por partido
alter table torneo_partidos
  add column if not exists hora_programada timestamptz;