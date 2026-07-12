-- Extensión necesaria para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. partidas_online
-- ============================================================
CREATE TABLE IF NOT EXISTS partidas_online (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo               text UNIQUE NOT NULL,
  estado               text NOT NULL DEFAULT 'esperando',
  admin_device_id      text NOT NULL,
  controller_device_id text,
  configuracion        jsonb,
  equipo_0             jsonb,
  equipo_1             jsonb,
  match_state          jsonb,
  velocidad            text NOT NULL DEFAULT 'manual',
  bloque_minutos       integer NOT NULL DEFAULT 5,
  modo_coop_0          text NOT NULL DEFAULT 'libre',
  modo_coop_1          text NOT NULL DEFAULT 'libre',
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partidas_online_codigo_idx ON partidas_online (codigo);

ALTER TABLE partidas_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública partidas" ON partidas_online;
CREATE POLICY "Lectura pública partidas"
  ON partidas_online FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inserción de partidas" ON partidas_online;
CREATE POLICY "Inserción de partidas"
  ON partidas_online FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Actualización de partidas" ON partidas_online;
CREATE POLICY "Actualización de partidas"
  ON partidas_online FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Eliminación de partidas" ON partidas_online;
CREATE POLICY "Eliminación de partidas"
  ON partidas_online FOR DELETE
  USING (true);

-- ============================================================
-- 2. jugadores_online
-- ============================================================
CREATE TABLE IF NOT EXISTS jugadores_online (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partida_id       uuid NOT NULL REFERENCES partidas_online(id) ON DELETE CASCADE,
  device_id        text NOT NULL,
  nombre           text NOT NULL,
  equipo_idx       integer NOT NULL,
  rol              text NOT NULL DEFAULT 'jugador',
  equipo_listo     boolean NOT NULL DEFAULT false,
  subs_pendientes  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ultimo_heartbeat timestamptz NOT NULL DEFAULT now(),
  usuario_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unido_en         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jugadores_online_partida_idx ON jugadores_online (partida_id);
CREATE INDEX IF NOT EXISTS jugadores_online_usuario_idx ON jugadores_online (usuario_id);

ALTER TABLE jugadores_online ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública jugadores" ON jugadores_online;
CREATE POLICY "Lectura pública jugadores"
  ON jugadores_online FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inserción propia jugador" ON jugadores_online;
CREATE POLICY "Inserción propia jugador"
  ON jugadores_online FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Actualización propia jugador" ON jugadores_online;
CREATE POLICY "Actualización propia jugador"
  ON jugadores_online FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Eliminación propia jugador" ON jugadores_online;
CREATE POLICY "Eliminación propia jugador"
  ON jugadores_online FOR DELETE
  USING (auth.uid() = usuario_id);

-- ============================================================
-- 3. equipos_guardados: columna es_publico
-- ============================================================
ALTER TABLE equipos_guardados
  ADD COLUMN IF NOT EXISTS es_publico boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Lectura pública equipos_publicos" ON equipos_guardados;
CREATE POLICY "Lectura pública equipos_publicos"
  ON equipos_guardados FOR SELECT
  USING (es_publico = true OR auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Actualización por usuario" ON equipos_guardados;
CREATE POLICY "Actualización por usuario"
  ON equipos_guardados FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);
