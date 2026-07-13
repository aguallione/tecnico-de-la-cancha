-- Corrección: referencia explícita a partidas_online.id en el subquery correlacionado.
-- Sin alias explícito, Postgres resolvía "id" como j.id en vez de partidas_online.id.

DROP POLICY IF EXISTS "Actualización de partidas" ON partidas_online;
CREATE POLICY "Actualización de partidas"
  ON partidas_online FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM jugadores_online j
      WHERE j.partida_id = partidas_online.id
        AND j.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM jugadores_online j
      WHERE j.partida_id = partidas_online.id
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
      WHERE j.partida_id = partidas_online.id
        AND j.usuario_id = auth.uid()
    )
  );
