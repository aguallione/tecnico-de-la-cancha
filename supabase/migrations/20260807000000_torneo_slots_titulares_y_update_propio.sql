alter table "public"."torneo_slots"
  add column "titulares" jsonb,
  add column "capitan_id" text,
  add column "pateador_penales_id" text,
  add column "pateador_tiros_libres_id" text;

create policy "Actualización propia del slot"
on "public"."torneo_slots"
as permissive
for update
to public
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);