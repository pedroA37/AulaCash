-- Agregar vendedor_id a mercado_productos
ALTER TABLE mercado_productos ADD COLUMN IF NOT EXISTS vendedor_id INTEGER REFERENCES usuarios(id);

-- Backfill: los productos existentes quedan a nombre del admin del mercado
UPDATE mercado_productos p
SET vendedor_id = m.admin_id
FROM mercados m
WHERE p.mercado_id = m.id AND p.vendedor_id IS NULL;

-- Pedidos (agrupa items de carrito)
CREATE TABLE IF NOT EXISTS mercado_pedidos (
  id           SERIAL PRIMARY KEY,
  mercado_id   INTEGER       NOT NULL REFERENCES mercados(id) ON DELETE CASCADE,
  comprador_id INTEGER       NOT NULL REFERENCES usuarios(id),
  total        NUMERIC(14,2) NOT NULL CHECK (total > 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Items del pedido (snapshot al momento de compra)
CREATE TABLE IF NOT EXISTS mercado_pedido_items (
  id               SERIAL PRIMARY KEY,
  pedido_id        INTEGER       NOT NULL REFERENCES mercado_pedidos(id) ON DELETE CASCADE,
  producto_id      INTEGER       REFERENCES mercado_productos(id) ON DELETE SET NULL,
  vendedor_id      INTEGER       NOT NULL REFERENCES usuarios(id),
  nombre_producto  VARCHAR(100)  NOT NULL,
  precio           NUMERIC(14,2) NOT NULL,
  cantidad         INTEGER       NOT NULL DEFAULT 1 CHECK (cantidad > 0)
);

-- Ligar transacciones a pedidos
ALTER TABLE mercado_transacciones
  ADD COLUMN IF NOT EXISTS pedido_id INTEGER REFERENCES mercado_pedidos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_mercado      ON mercado_pedidos(mercado_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_comprador    ON mercado_pedidos(comprador_id);
CREATE INDEX IF NOT EXISTS idx_pitems_pedido        ON mercado_pedido_items(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pitems_vendedor      ON mercado_pedido_items(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_mprod_vendedor       ON mercado_productos(vendedor_id);
