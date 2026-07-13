-- Reemplaza las políticas de escritura en partidas_online con restricciones reales.
-- SELECT se mantiene público (cualquiera puede leer para unirse por código).
-- INSERT: sólo requiere estar autenticado (anon o real). La partida no tiene
--         usuario_id; el ownership queda en jugadores_online.admin_device_id.
--         No se puede validar contra jugadores_online porque el jugador aún no existe.
-- UPDATE/DELETE: el usuario autenticado debe tener una fila activa en jugadores_online
--         para esa partida. Esto bloquea editar o borrar partidas ajenas.
--         El service_role del servidor bypassa RLS por completo, por lo que los
--         ticks, sucesión de admin y transferencias siguen funcionando sin cambios.

DROP POLICY IF EXISTS "Inserción de partidas" ON partidas_online;
CREATE POLICY "Inserción de partidas"
  ON partidas_online FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Actualización de partidas" ON partidas_online;
CREATE POLICY "Actualización de partidas"
  ON partidas_online FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM jugadores_online j
      WHERE j.partida_id = id
        AND j.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM jugadores_online j
      WHERE j.partida_id = id
        AND j.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Eliminación de partidas" ON partidas_online;
CREATE POLICY "Eliminación de partidas"
  ON partidas_online FOR DELETE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM jugadores_online j
      WHERE j.partida_id = id
        AND j.usuario_id = auth.uid()
    )
  );
