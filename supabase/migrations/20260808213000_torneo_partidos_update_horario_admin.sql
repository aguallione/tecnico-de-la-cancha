create policy "torneo_partidos_update_horario_admin"
  on torneo_partidos for update
  to authenticated
  using (
    estado = 'pendiente'
    and exists (
      select 1 from torneo_admins a
      where a.torneo_id = torneo_partidos.torneo_id
        and a.usuario_id = auth.uid()
    )
  )
  with check (
    estado = 'pendiente'
    and exists (
      select 1 from torneo_admins a
      where a.torneo_id = torneo_partidos.torneo_id
        and a.usuario_id = auth.uid()
    )
  );