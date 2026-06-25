-- MERCADOS
CREATE TABLE IF NOT EXISTS mercados (
  id                       SERIAL PRIMARY KEY,
  nombre                   VARCHAR(100) NOT NULL,
  logo_url                 TEXT,
  moneda_nombre            VARCHAR(50)  NOT NULL DEFAULT 'Fichas',
  moneda_acronimo          VARCHAR(10)  NOT NULL DEFAULT 'FCH',
  admin_id                 INTEGER      NOT NULL REFERENCES usuarios(id),
  codigo                   VARCHAR(8)   UNIQUE NOT NULL,
  hora_inicio              TIMESTAMPTZ,
  hora_cierre              TIMESTAMPTZ,
  estado                   VARCHAR(15)  NOT NULL DEFAULT 'borrador'
                               CHECK (estado IN ('borrador','abierto','cerrado')),
  notificacion_30_enviada  BOOLEAN      NOT NULL DEFAULT false,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- PARTICIPANTES CON SALDO
CREATE TABLE IF NOT EXISTS mercado_usuarios (
  id          SERIAL PRIMARY KEY,
  mercado_id  INTEGER       NOT NULL REFERENCES mercados(id) ON DELETE CASCADE,
  usuario_id  INTEGER       NOT NULL REFERENCES usuarios(id),
  saldo       NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  joined_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (mercado_id, usuario_id)
);

-- PSEUDO-ADMINS SCOPED AL MERCADO
CREATE TABLE IF NOT EXISTS mercado_pseudo_admins (
  id          SERIAL PRIMARY KEY,
  mercado_id  INTEGER NOT NULL REFERENCES mercados(id) ON DELETE CASCADE,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
  creado_por  INTEGER NOT NULL REFERENCES usuarios(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mercado_id, usuario_id)
);

-- LIBRO DE TRANSACCIONES DEL MERCADO
CREATE TABLE IF NOT EXISTS mercado_transacciones (
  id                  SERIAL PRIMARY KEY,
  mercado_id          INTEGER       NOT NULL REFERENCES mercados(id),
  tipo                VARCHAR(20)   NOT NULL
                          CHECK (tipo IN ('carga','transferencia','compra','devolucion')),
  usuario_origen_id   INTEGER REFERENCES usuarios(id),
  usuario_destino_id  INTEGER       NOT NULL REFERENCES usuarios(id),
  monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  descripcion         TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- CATÁLOGO DE PRODUCTOS (tienda del admin)
CREATE TABLE IF NOT EXISTS mercado_productos (
  id          SERIAL PRIMARY KEY,
  mercado_id  INTEGER       NOT NULL REFERENCES mercados(id) ON DELETE CASCADE,
  nombre      VARCHAR(100)  NOT NULL,
  descripcion TEXT,
  precio      NUMERIC(14,2) NOT NULL CHECK (precio > 0),
  imagen_url  TEXT,
  stock       INTEGER,
  activo      BOOLEAN        NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- PUSH SUBSCRIPTIONS (Web Push VAPID)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  endpoint    TEXT    UNIQUE NOT NULL,
  p256dh      TEXT    NOT NULL,
  auth        TEXT    NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mu_mercado    ON mercado_usuarios(mercado_id);
CREATE INDEX IF NOT EXISTS idx_mu_usuario    ON mercado_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mtx_mercado   ON mercado_transacciones(mercado_id);
CREATE INDEX IF NOT EXISTS idx_mprod_mercado ON mercado_productos(mercado_id);
CREATE INDEX IF NOT EXISTS idx_push_usuario  ON push_subscriptions(usuario_id);
