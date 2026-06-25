-- Habilitar extensión para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    dni             VARCHAR(20)   UNIQUE NOT NULL,
    email           VARCHAR(255)  UNIQUE NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,
    nombre          VARCHAR(100)  NOT NULL,
    apellido        VARCHAR(100)  NOT NULL,
    rol             VARCHAR(10)   NOT NULL DEFAULT 'user' CHECK (rol IN ('user', 'admin')),
    alias           VARCHAR(50)   UNIQUE NOT NULL,
    cbu             VARCHAR(22)   UNIQUE NOT NULL,
    saldo           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Transacciones
CREATE TABLE IF NOT EXISTS transacciones (
    id                  SERIAL PRIMARY KEY,
    usuario_origen_id   INTEGER REFERENCES usuarios(id),
    usuario_destino_id  INTEGER NOT NULL REFERENCES usuarios(id),
    monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
    tipo                VARCHAR(20)   NOT NULL CHECK (tipo IN ('transferencia', 'carga_admin', 'cobro_qr')),
    estado              VARCHAR(10)   NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'fallida')),
    descripcion         TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Códigos QR de cobro
CREATE TABLE IF NOT EXISTS codigos_qr (
    id                  SERIAL PRIMARY KEY,
    token               UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    usuario_emisor_id   INTEGER NOT NULL REFERENCES usuarios(id),
    monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
    estado              VARCHAR(10)   NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'usado', 'expirado')),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ   NOT NULL
);

-- Tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_resets (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    token       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    expires_at  TIMESTAMPTZ NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transacciones_origen  ON transacciones(usuario_origen_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_destino ON transacciones(usuario_destino_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_alias        ON usuarios(alias);
CREATE INDEX IF NOT EXISTS idx_usuarios_cbu          ON usuarios(cbu);
