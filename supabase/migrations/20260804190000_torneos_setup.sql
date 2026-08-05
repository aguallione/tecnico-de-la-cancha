-- ============================================================
-- Etapa 4.1b: Torneos — tablas base + RLS
-- ============================================================

-- ============================================================
-- 1. torneos
-- ============================================================
CREATE TABLE IF NOT EXISTS torneos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre             text NOT NULL,
  formato            text NOT NULL CHECK (formato IN ('liga_simple', 'liga_ida_vuelta', 'eliminacion_directa')),
  estado             text NOT NULL DEFAULT 'armado' CHECK (estado IN ('armado', 'en_curso', 'finalizado')),
  target_slot_count  integer NOT NULL,
  ronda_actual       integer NOT NULL DEFAULT 0,
  total_rondas       integer NOT NULL DEFAULT 0,
  es_online          boolean NOT NULL DEFAULT false,
  codigo_sala        text UNIQUE,
  creado_por         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_partido     jsonb NOT NULL DEFAULT '{}'::jsonb,
  campeon_slot_id    uuid,
  creado_en          timestamptz NOT NULL DEFAULT now(),
  finalizado_en      timestamptz
);

CREATE INDEX IF NOT EXISTS torneos_creado_por_idx ON torneos (creado_por);
CREATE INDEX IF NOT EXISTS torneos_codigo_sala_idx ON torneos (codigo_sala);

ALTER TABLE torneos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública torneos" ON torneos;
CREATE POLICY "Lectura pública torneos"
  ON torneos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inserción propia torneo" ON torneos;
CREATE POLICY "Inserción propia torneo"
  ON torneos FOR INSERT
  WITH CHECK (auth.uid() = creado_por);

DROP POLICY IF EXISTS "Actualización por creador" ON torneos;
CREATE POLICY "Actualización por creador"
  ON torneos FOR UPDATE
  USING (auth.uid() = creado_por)
  WITH CHECK (auth.uid() = creado_por);

-- ============================================================
-- 2. torneo_slots
-- ============================================================
CREATE TABLE IF NOT EXISTS torneo_slots (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id           uuid NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  nombre_visible      text NOT NULL,
  config_equipo       jsonb NOT NULL DEFAULT '{}'::jsonb,
  plantel             jsonb NOT NULL DEFAULT '[]'::jsonb,
  formacion           text NOT NULL,
  estilo              text NOT NULL,
  altura_linea        text NOT NULL,
  salida              text NOT NULL,
  presion             text NOT NULL,
  usuario_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  equipo_guardado_id  uuid REFERENCES equipos_guardados(id) ON DELETE SET NULL,
  seed                integer NOT NULL,
  creado_en           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS torneo_slots_torneo_idx ON torneo_slots (torneo_id);
CREATE INDEX IF NOT EXISTS torneo_slots_usuario_idx ON torneo_slots (usuario_id);

ALTER TABLE torneo_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública torneo_slots" ON torneo_slots;
CREATE POLICY "Lectura pública torneo_slots"
  ON torneo_slots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inserción por creador del torneo" ON torneo_slots;
CREATE POLICY "Inserción por creador del torneo"
  ON torneo_slots FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT creado_por FROM torneos WHERE id = torneo_id)
  );

DROP POLICY IF EXISTS "Actualización por creador del torneo" ON torneo_slots;
CREATE POLICY "Actualización por creador del torneo"
  ON torneo_slots FOR UPDATE
  USING (
    auth.uid() = (SELECT creado_por FROM torneos WHERE id = torneo_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT creado_por FROM torneos WHERE id = torneo_id)
  );

DROP POLICY IF EXISTS "Eliminación por creador del torneo" ON torneo_slots;
CREATE POLICY "Eliminación por creador del torneo"
  ON torneo_slots FOR DELETE
  USING (
    auth.uid() = (SELECT creado_por FROM torneos WHERE id = torneo_id)
  );

-- ============================================================
-- 3. torneo_partidos
-- ============================================================
CREATE TABLE IF NOT EXISTS torneo_partidos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  torneo_id          uuid NOT NULL REFERENCES torneos(id) ON DELETE CASCADE,
  ronda              integer NOT NULL,
  slot_local_id      uuid NOT NULL REFERENCES torneo_slots(id) ON DELETE CASCADE,
  slot_visitante_id  uuid NOT NULL REFERENCES torneo_slots(id) ON DELETE CASCADE,
  estado             text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'jugado', 'walkover')),
  resultado          jsonb,
  partida_online_id  uuid REFERENCES partidas_online(id) ON DELETE SET NULL,
  posicion_bracket   integer,
  creado_en          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS torneo_partidos_torneo_idx ON torneo_partidos (torneo_id);
CREATE INDEX IF NOT EXISTS torneo_partidos_ronda_idx ON torneo_partidos (torneo_id, ronda);

ALTER TABLE torneo_partidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública torneo_partidos" ON torneo_partidos;
CREATE POLICY "Lectura pública torneo_partidos"
  ON torneo_partidos FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Inserción por creador del torneo" ON torneo_partidos;
CREATE POLICY "Inserción por creador del torneo"
  ON torneo_partidos FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT creado_por FROM torneos WHERE id = torneo_id)
  );

-- A propósito: NO se crea ninguna policy de UPDATE para torneo_partidos.
-- El resultado de un partido de torneo lo escribe únicamente una server
-- function con service_role (bypassea RLS), nunca el cliente directo.
-- Esto evita que un usuario falsee un marcador con un UPDATE manual.
DROP POLICY IF EXISTS "Actualización de partidos de torneo" ON torneo_partidos;