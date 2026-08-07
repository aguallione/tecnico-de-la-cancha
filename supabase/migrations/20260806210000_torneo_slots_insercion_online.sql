create policy "Inserción propia al unirse a torneo online"
on "public"."torneo_slots"
as permissive
for insert
to public
with check (
  (auth.uid() = usuario_id)
  and (exists (
    select 1 from torneos
    where torneos.id = torneo_slots.torneo_id
      and torneos.es_online = true
      and torneos.estado = 'armado'
  ))
);