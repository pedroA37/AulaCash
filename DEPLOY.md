# Guía de Deploy — AulaCash

Stack: Render (frontend + backend) + Supabase (PostgreSQL) + UptimeRobot (keep alive)
Todo 100% gratis, sin cold starts.

---

## Paso 1 — Supabase (base de datos)

> Render tiene PostgreSQL gratis pero expira en 90 días. Supabase es gratis para siempre.

1. Ir a https://supabase.com → Create a new project
2. Región: **South America (São Paulo)** — más rápido desde Argentina
3. Ir a **Settings → Database → Connection string → URI**
4. Copiar la URL — se ve así:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
5. Guardarla para el paso 3

---

## Paso 2 — Subir el código a GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/tu-usuario/aulacash.git
git push -u origin main
```

---

## Paso 3 — Render

1. Ir a https://render.com → New → **Blueprint**
2. Conectar el repo de GitHub
3. Render detecta `render.yaml` y encuentra dos servicios:
   - `aulacash-backend`
   - `aulacash-frontend`
4. Antes de confirmar, setear las variables del **backend**:

   | Variable        | Valor                                      |
   |-----------------|--------------------------------------------|
   | DATABASE_URL    | La URL de Supabase del paso 1              |
   | JWT_SECRET      | String random largo (ej: mv3k9xp2qr8...)   |
   | FRONTEND_URL    | Dejar vacío por ahora                      |
   | RESEND_API_KEY  | Opcional (solo si querés emails de reset)  |
   | EMAIL_FROM      | Opcional                                   |

5. Click en **Apply** → Render despliega ambos servicios
   - El backend corre `npm install && npm run migrate` automáticamente
6. Esperar que el backend termine → copiar su URL:
   ```
   https://aulacash-backend.onrender.com
   ```
7. Ir a **aulacash-frontend → Environment** → agregar:
   ```
   VITE_API_URL = https://aulacash-backend.onrender.com/api
   ```
8. Ir a **aulacash-backend → Environment** → completar:
   ```
   FRONTEND_URL = https://aulacash-frontend.onrender.com
   ```
9. Render re-despliega automáticamente con los nuevos valores

---

## Paso 4 — Crear el primer admin (una sola vez)

En Render → aulacash-backend → pestaña **Shell**:

```bash
ADMIN_EMAIL=tu@email.com ADMIN_PASSWORD=tuPassword123 npm run seed
```

---

## Paso 5 — UptimeRobot (evitar que Render duerma)

1. Ir a https://uptimerobot.com → Create Free Account
2. Add New Monitor:
   - Type: **HTTP(s)**
   - Friendly Name: `AulaCash Backend`
   - URL: `https://aulacash-backend.onrender.com/api/health`
   - Monitoring Interval: **5 minutes**
3. Save → listo

---

## Resultado

| Qué          | URL                                        |
|--------------|--------------------------------------------|
| Frontend     | https://aulacash-frontend.onrender.com     |
| Backend      | https://aulacash-backend.onrender.com      |
| Base de datos| Supabase (São Paulo)                       |
| Keep alive   | UptimeRobot cada 5 minutos                 |

---

## Notas importantes

- Las migraciones (`001` a `004`) se aplican solas en cada deploy — son idempotentes.
- El seed (`npm run seed`) solo se corre una vez manualmente.
- Si cambiás código, hacer `git push` es suficiente — Render redespliega automáticamente.
- El `.env` nunca se commitea — las variables van solo en el dashboard de Render.
