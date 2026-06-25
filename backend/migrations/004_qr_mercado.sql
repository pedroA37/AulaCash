-- Vincular códigos QR a un mercado específico
ALTER TABLE codigos_qr
  ADD COLUMN IF NOT EXISTS mercado_id INTEGER REFERENCES mercados(id);
