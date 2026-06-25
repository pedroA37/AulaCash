-- Tabla independiente de monedas con ID único por mercado
CREATE TABLE IF NOT EXISTS monedas (
  id         SERIAL PRIMARY KEY,
  nombre     VARCHAR(50) NOT NULL,
  acronimo   VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columna moneda_id a mercados (nullable primero para migración)
ALTER TABLE mercados ADD COLUMN IF NOT EXISTS moneda_id INTEGER REFERENCES monedas(id);

-- Migrar cada mercado existente: crear su moneda y vincularla
-- (solo si las columnas legacy todavía existen — idempotente)
DO $$
DECLARE
  r           RECORD;
  nuevo_id    INTEGER;
  col_exists  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mercados' AND column_name = 'moneda_nombre'
  ) INTO col_exists;

  IF col_exists THEN
    FOR r IN
      SELECT id, moneda_nombre, moneda_acronimo
      FROM mercados
      WHERE moneda_id IS NULL
    LOOP
      INSERT INTO monedas (nombre, acronimo)
      VALUES (r.moneda_nombre, r.moneda_acronimo)
      RETURNING id INTO nuevo_id;

      UPDATE mercados SET moneda_id = nuevo_id WHERE id = r.id;
    END LOOP;
  END IF;
END $$;

-- Hacer moneda_id obligatorio y eliminar columnas redundantes
ALTER TABLE mercados ALTER COLUMN moneda_id SET NOT NULL;
ALTER TABLE mercados DROP COLUMN IF EXISTS moneda_nombre;
ALTER TABLE mercados DROP COLUMN IF EXISTS moneda_acronimo;

CREATE INDEX IF NOT EXISTS idx_mercados_moneda ON mercados(moneda_id);
