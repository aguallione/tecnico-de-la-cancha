-- ============================================================
-- Seguridad de administradores y horarios de torneos online
-- ============================================================

-- ------------------------------------------------------------
-- 1. Impedir que cualquier usuario se agregue como administrador
-- ------------------------------------------------------------

drop policy if exists "torneo_admins_insert_autenticados"
  on public.torneo_admins;

drop policy if exists "torneo_admins_insert_creador"
  on public.torneo_admins;

create policy "torneo_admins_insert_creador"
  on public.torneo_admins
  for insert
  to authenticated
  with check (
    usuario_id = auth.uid()
    and exists (
      select 1
      from public.torneos t
      where t.id = torneo_admins.torneo_id
        and t.creado_por = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 2. Quitar la actualización directa de torneo_partidos
-- ------------------------------------------------------------

drop policy if exists "torneo_partidos_update_horario_admin"
  on public.torneo_partidos;

revoke update
  on table public.torneo_partidos
  from anon, authenticated;

-- ------------------------------------------------------------
-- 3. Crear una función segura para asignar horarios
-- ------------------------------------------------------------

create or replace function public.asignar_hora_partido_torneo(
  p_torneo_partido_id uuid,
  p_fecha_hora timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partido public.torneo_partidos%rowtype;
  v_usuario_id uuid;
  v_clave_local bigint;
  v_clave_visitante bigint;
  v_clave_primera bigint;
  v_clave_segunda bigint;
begin
  v_usuario_id := auth.uid();

  if v_usuario_id is null then
    raise exception 'Necesitás iniciar sesión para modificar este horario.';
  end if;

  if p_fecha_hora is null then
    raise exception 'Tenés que elegir una fecha y una hora.';
  end if;

  if p_fecha_hora < pg_catalog.now() then
    raise exception 'El horario no puede estar en el pasado.';
  end if;

  select *
  into v_partido
  from public.torneo_partidos
  where id = p_torneo_partido_id
  for update;

  if not found then
    raise exception 'El partido de torneo no existe.';
  end if;

  if v_partido.estado <> 'pendiente' then
    raise exception 'Solo se puede modificar el horario de un partido pendiente.';
  end if;

  if not exists (
    select 1
    from public.torneo_admins a
    where a.torneo_id = v_partido.torneo_id
      and a.usuario_id = v_usuario_id
  ) then
    raise exception 'No tenés permisos de administrador para modificar este horario.';
  end if;

  v_clave_local := pg_catalog.hashtextextended(
    'torneo_slot:' || v_partido.slot_local_id::text,
    0
  );

  v_clave_visitante := pg_catalog.hashtextextended(
    'torneo_slot:' || v_partido.slot_visitante_id::text,
    0
  );

  v_clave_primera := least(v_clave_local, v_clave_visitante);
  v_clave_segunda := greatest(v_clave_local, v_clave_visitante);

  perform pg_catalog.pg_advisory_xact_lock(v_clave_primera);

  if v_clave_segunda <> v_clave_primera then
    perform pg_catalog.pg_advisory_xact_lock(v_clave_segunda);
  end if;

  if exists (
    select 1
    from public.torneo_partidos otro
    where otro.torneo_id = v_partido.torneo_id
      and otro.id <> v_partido.id
      and otro.estado = 'en_curso'
      and (
        otro.slot_local_id in (
          v_partido.slot_local_id,
          v_partido.slot_visitante_id
        )
        or otro.slot_visitante_id in (
          v_partido.slot_local_id,
          v_partido.slot_visitante_id
        )
      )
  ) then
    raise exception 'Uno de los dos equipos ya tiene un partido en curso ahora mismo.';
  end if;

  if exists (
    select 1
    from public.torneo_partidos otro
    where otro.torneo_id = v_partido.torneo_id
      and otro.id <> v_partido.id
      and otro.estado = 'pendiente'
      and otro.hora_programada is not null
      and otro.hora_programada > p_fecha_hora - interval '15 minutes'
      and otro.hora_programada < p_fecha_hora + interval '15 minutes'
      and (
        otro.slot_local_id in (
          v_partido.slot_local_id,
          v_partido.slot_visitante_id
        )
        or otro.slot_visitante_id in (
          v_partido.slot_local_id,
          v_partido.slot_visitante_id
        )
      )
  ) then
    raise exception 'Uno de los dos equipos ya tiene otro partido programado a menos de 15 minutos de este horario.';
  end if;

  update public.torneo_partidos
  set hora_programada = p_fecha_hora
  where id = v_partido.id;
end;
$$;

revoke all
  on function public.asignar_hora_partido_torneo(uuid, timestamptz)
  from public;

grant execute
  on function public.asignar_hora_partido_torneo(uuid, timestamptz)
  to authenticated;