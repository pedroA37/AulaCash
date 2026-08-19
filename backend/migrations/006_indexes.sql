-- Índices adicionales para soporte de 200 usuarios concurrentes

CREATE INDEX IF NOT EXISTS idx_codigos_qr_emisor       ON codigos_qr(usuario_emisor_id);
CREATE INDEX IF NOT EXISTS idx_codigos_qr_estado        ON codigos_qr(estado);
CREATE INDEX IF NOT EXISTS idx_mercados_admin           ON mercados(admin_id);
CREATE INDEX IF NOT EXISTS idx_mercados_estado          ON mercados(estado);
CREATE INDEX IF NOT EXISTS idx_mtx_origen               ON mercado_transacciones(usuario_origen_id);
CREATE INDEX IF NOT EXISTS idx_mtx_destino              ON mercado_transacciones(usuario_destino_id);
CREATE INDEX IF NOT EXISTS idx_mtx_created_at           ON mercado_transacciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mprod_activo             ON mercado_productos(mercado_id, activo) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_tx_created_at            ON transacciones(created_at DESC);
