-- ============================================================
-- Etapa 4.4-6a: nivel de IA co-DT por torneo + estado "en_curso"
-- para partidos de torneo online (antes solo pendiente/jugado/walkover)
-- ============================================================

ALTER TABLE torneos
  ADD COLUMN IF NOT EXISTS nivel_ia text CHECK (nivel_ia IN ('ninguna', 'poca', 'media', 'mucha'));

ALTER TABLE torneo_partidos
  DROP CONSTRAINT IF EXISTS torneo_partidos_estado_check;

ALTER TABLE torneo_partidos
  ADD CONSTRAINT torneo_partidos_estado_check
  CHECK (estado IN ('pendiente', 'en_curso', 'jugado', 'walkover'));