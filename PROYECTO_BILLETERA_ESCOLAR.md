# Billetera Virtual Escolar — Documento de Contexto del Proyecto

> Este documento es el contexto completo para continuar el desarrollo en Claude Code.
> Contiene todas las decisiones de producto, arquitectura, modelo de datos y plan de trabajo
> ya acordadas. Leer completo antes de empezar a codear.

---

## 1. Qué es este proyecto

Una **simulación educativa de billetera virtual** para uso interno de una escuela. Inspirada
en la experiencia de Mercado Pago / BNA MODO, pero **no mueve dinero real**: los saldos son
virtuales y la base de datos vive en un entorno controlado por la institución.

⚠️ **Importante dejar esto explícito en la UI** (pantalla de login o "Acerca de"): es un
proyecto educativo, no una entidad financiera regulada, los saldos no representan dinero real.
Esto evita confusiones y cualquier problema de encuadre legal (operar como entidad financiera
sin autorización está regulado por el BCRA en Argentina).

### Requisito no negociable
**100% gratis**, tanto para los usuarios finales como para el desarrollador/mantenedor.
Ninguna decisión técnica puede introducir un costo recurrente ni un pago único obligatorio.

---

## 2. Decisiones de producto ya tomadas

| Tema | Decisión |
|---|---|
| Distribución | **PWA** (Progressive Web App) instalable desde navegador + landing page con instrucciones. Se descartó publicar en App Store / Google Play para evitar el costo de 99 USD/año de Apple Developer Program. Se descartó distribución vía APK/TestFlight porque TestFlight también requiere cuenta paga de Apple. |
| Quién crea usuarios | **Autoregistro abierto** (cualquiera se registra solo, como Mercado Pago). No requiere aprobación de admin. |
| Identificador único / anti-duplicados | **DNI + Email**, ambos con constraint UNIQUE en base de datos y validación previa en backend. |
| Recuperación de contraseña | **Por email**, con token de un solo uso y expiración (1h). Usar **Resend** (free tier: 3000 emails/mes, 100/día) por simplicidad de integración vs SMTP de Gmail. |
| Roles | Dos roles: `user` y `admin`. El admin se crea manualmente (seed/script), no por autoregistro. |
| Transferencias | Por **alias** o **CBU/CVU simulado** (generado automáticamente al crear cuenta, no es un CBU real). |
| Cobro con QR | Usuario genera QR con monto fijo → otro usuario lo escanea con la cámara del celular (vía navegador, sin app nativa) → confirma → se transfiere. |
| Admin | Puede: (1) ingresar dinero ("carga") a la cuenta de cualquier usuario, (2) ver listado de todos los usuarios, (3) ver historial completo de transacciones de cualquier usuario. |

---

## 3. Stack técnico

| Capa | Tecnología | Por qué |
|---|---|---|
| Frontend | **React + Vite** + `vite-plugin-pwa` | Genera automáticamente manifest.json y service worker necesarios para que la app sea instalable. |
| Estilos | **Tailwind CSS** | Iteración rápida, visual cuidado sin escribir CSS a mano. |
| Backend | **Node.js + Express** | Pedido explícito del usuario: control total del backend. |
| Base de datos | **PostgreSQL** | El dominio es inherentemente relacional con necesidad de integridad transaccional fuerte (transferencias atómicas, sin estados inconsistentes). Se descartó NoSQL por este motivo. |
| Auth | JWT (JSON Web Tokens) | Estándar simple, sin estado en servidor. |
| Hashing de passwords | bcrypt | Estándar de la industria. |
| QR — generación | `qrcode` (Node) o `qrcode.react` (frontend) | — |
| QR — lectura/escaneo | `html5-qrcode` (usa la cámara desde el navegador, sin apps nativas) | — |
| Envío de emails | **Resend** | Free tier generoso, integración simple via API REST. |

### Hosting 100% gratuito

| Componente | Servicio sugerido | Notas |
|---|---|---|
| Backend (Node/Express) | Render.com free tier (alt: Fly.io) | El server "duerme" tras inactividad y demora unos segundos en despertar — aceptable para uso escolar. |
| Base de datos Postgres | Supabase o Neon.tech | Free tier hasta 500MB–1GB, más que suficiente. |
| Frontend (PWA estática) | Vercel o Netlify | Gratis e ilimitado para este tamaño de proyecto. HTTPS automático (obligatorio: las PWA requieren HTTPS). |
| Landing page de instalación | Mismo hosting que el frontend (Vercel/Netlify) | Explica qué es la app + tutorial paso a paso de instalación en Android e iOS. |

---

## 4. Modelo de datos (PostgreSQL)

```sql
-- Usuarios
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    dni             VARCHAR(20)  UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    rol             VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (rol IN ('user', 'admin')),
    alias           VARCHAR(50)  UNIQUE NOT NULL,
    cbu             VARCHAR(22)  UNIQUE NOT NULL,
    saldo           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Transacciones
CREATE TABLE transacciones (
    id                  SERIAL PRIMARY KEY,
    usuario_origen_id   INTEGER REFERENCES usuarios(id),   -- NULL si es carga de admin
    usuario_destino_id  INTEGER NOT NULL REFERENCES usuarios(id),
    monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('transferencia', 'carga_admin', 'cobro_qr')),
    estado              VARCHAR(10) NOT NULL DEFAULT 'completada' CHECK (estado IN ('completada', 'fallida')),
    descripcion         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Códigos QR de cobro
CREATE TABLE codigos_qr (
    id                  SERIAL PRIMARY KEY,
    token               UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    usuario_emisor_id   INTEGER NOT NULL REFERENCES usuarios(id),
    monto               NUMERIC(14,2) NOT NULL CHECK (monto > 0),
    estado              VARCHAR(10) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'usado', 'expirado')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL
);

-- Tokens de recuperación de contraseña
CREATE TABLE password_resets (
    id          SERIAL PRIMARY KEY,
    usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
    token       UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    expires_at  TIMESTAMPTZ NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transacciones_origen ON transacciones(usuario_origen_id);
CREATE INDEX idx_transacciones_destino ON transacciones(usuario_destino_id);
CREATE INDEX idx_usuarios_alias ON usuarios(alias);
CREATE INDEX idx_usuarios_cbu ON usuarios(cbu);
```

### Regla crítica de integridad
Toda transferencia (`tipo = 'transferencia'` o `'cobro_qr'`) debe ejecutarse dentro de una
**transacción SQL** (`BEGIN` / `COMMIT` / `ROLLBACK`) que:
1. Verifica saldo suficiente del origen.
2. Descuenta del origen.
3. Acredita al destino.
4. Inserta el registro en `transacciones`.

El `CHECK (saldo >= 0)` en la tabla `usuarios` es una red de seguridad adicional para que sea
**imposible** quedar en saldo negativo incluso ante condiciones de carrera (dos transferencias
simultáneas desde la misma cuenta).

---

## 5. Endpoints de la API (borrador)

### Auth
- `POST /api/auth/registro` — body: `{ dni, email, password, nombre, apellido }`. Valida unicidad de DNI y email antes de insertar. Genera alias y CBU automáticamente.
- `POST /api/auth/login` — body: `{ email, password }`. Devuelve JWT.
- `POST /api/auth/forgot-password` — body: `{ email }`. Genera token, envía email vía Resend.
- `POST /api/auth/reset-password` — body: `{ token, nuevaPassword }`.

### Usuario (requiere JWT, rol user o admin)
- `GET /api/cuenta/me` — datos de la cuenta propia (saldo, alias, CBU).
- `GET /api/cuenta/buscar?alias=X` o `?cbu=X` — buscar destinatario para transferencia.
- `POST /api/transferencias` — body: `{ destino_alias_o_cbu, monto, descripcion }`.
- `GET /api/transacciones/me` — historial propio.
- `POST /api/qr/generar` — body: `{ monto }`. Devuelve token + expiración.
- `POST /api/qr/cobrar` — body: `{ token }`. Ejecuta la transferencia asociada al QR (la ejecuta quien escanea, transfiriendo al emisor).
- `GET /api/qr/:token` — info del QR antes de confirmar el pago (monto, a quién).

### Admin (requiere JWT, rol admin)
- `GET /api/admin/usuarios` — listado completo con buscador.
- `GET /api/admin/usuarios/:id` — detalle de usuario.
- `GET /api/admin/usuarios/:id/transacciones` — historial completo de ese usuario.
- `POST /api/admin/cargar-saldo` — body: `{ usuario_id, monto, descripcion }`. Crea transacción `carga_admin`.

---

## 6. Estructura de carpetas propuesta

```
billetera-escolar/
├── backend/
│   ├── src/
│   │   ├── config/          # conexión a Postgres, env vars
│   │   ├── middleware/      # auth (JWT), validación de rol admin
│   │   ├── models/          # queries SQL agrupadas por entidad
│   │   ├── routes/          # auth.routes.js, cuenta.routes.js, admin.routes.js, qr.routes.js
│   │   ├── controllers/
│   │   ├── services/        # lógica de transferencias atómicas, generación de alias/CBU
│   │   └── server.js
│   ├── migrations/          # SQL de creación de tablas (sección 4)
│   ├── seed/                # script para crear el primer usuario admin
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # Login, Registro, RecuperarPassword, Dashboard, Transferir, QR, Admin*
│   │   ├── components/
│   │   ├── services/         # cliente API (fetch/axios)
│   │   ├── context/           # AuthContext (JWT en memoria/localStorage)
│   │   └── App.jsx
│   ├── public/
│   │   ├── manifest.json     # generado por vite-plugin-pwa
│   │   └── icons/
│   ├── vite.config.js        # con vite-plugin-pwa configurado
│   └── package.json
├── landing/                  # landing page de instalación (puede ser parte del frontend o sitio aparte)
│   └── index.html            # explica el proyecto + tutorial instalación Android/iOS
└── PROYECTO_BILLETERA_ESCOLAR.md   # este archivo
```

---

## 7. Plan de trabajo por fases

1. **Backend — base**: estructura del proyecto, conexión a Postgres, migraciones (tablas de
   sección 4), endpoints de `auth` (registro con validación de duplicados, login con JWT).
2. **Backend — negocio**: endpoints de transferencias (con transacción SQL atómica), QR
   (generar/cobrar), historial, y endpoints de admin (listado, detalle, carga de saldo).
3. **Backend — recuperación de contraseña**: integración con Resend, endpoints de
   forgot/reset password.
4. **Frontend — auth**: pantallas de Login, Registro, Recuperar contraseña.
5. **Frontend — usuario**: Dashboard (saldo + accesos rápidos), Transferir (buscar por
   alias/CBU), Generar QR, Escanear QR (cámara), Historial de movimientos.
6. **Frontend — admin**: Listado de usuarios con buscador, Detalle de usuario + su historial,
   Formulario de carga de saldo.
7. **PWA**: configurar `vite-plugin-pwa` (manifest, ícono, service worker), probar
   instalación en Android y iOS.
8. **Landing page**: copy explicando el proyecto (aclarando que es educativo/no dinero real)
   + tutorial visual de instalación paso a paso para Android e iOS.
9. **Deploy**: backend en Render, DB en Neon/Supabase, frontend+landing en Vercel/Netlify.
   Configurar variables de entorno de producción.
10. **Seed inicial**: script para crear el primer usuario `admin` directamente en la base
    (no vía registro público).

---

## 8. Pendientes / decisiones a tomar más adelante

- Definir si el QR expira (sugerido: 15-30 min) y qué pasa si expira sin usarse.
- Definir límites de monto por transferencia (opcional, para fines didácticos).
- Definir si se notifica por email cada transferencia recibida (no definido aún, no
  bloqueante para el MVP).
- Definir paleta de colores / identidad visual de la app (no definido aún).
- Nombre final de la app.

---

## 9. Próximo paso inmediato

Empezar por la **Fase 1 (Backend — base)**: estructura del proyecto Node.js + Express,
migraciones SQL de la sección 4, y endpoints de `/api/auth/registro` y `/api/auth/login`.
