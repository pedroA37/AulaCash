# Prompt para generar la Landing Page de AulaCash

Usá este prompt completo con cualquier herramienta de generación de código (v0, Cursor, Claude, etc.).

---

## PROMPT

Creá una landing page para **AulaCash**, una plataforma educativa de pagos digitales para el aula. AulaCash simula una billetera virtual (estilo Mercado Pago / BNA MODO) que los docentes usan para enseñar economía, finanzas personales y pagos digitales a sus alumnos. **No maneja dinero real.**

---

### Stack

- HTML + Tailwind CSS (via CDN) + JS vanilla. Sin frameworks.
- Un solo archivo `index.html`, auto-contenido.
- Fuente: **Inter** (Google Fonts).
- Íconos: **Material Symbols Outlined** (Google Fonts, peso 400).
- Sin dependencias adicionales. Sin imágenes externas salvo placeholders de Unsplash (solo si el diseño lo requiere como decoración de fondo — preferir SVG ilustrativos o mockups CSS puros).

---

### Sistema de diseño (igual que la app)

```
Colores primarios:
  Azul principal:   #009ee3   (botones, highlights, badge)
  Azul oscuro:      #006492   (links, íconos activos, gradientes)
  Verde éxito:      #00ac46   (estados positivos, "transferido")
  Rojo error:       #ba1a1a   (advertencias)
  Fondo app:        #f9f9f9
  Superficie card:  #ffffff
  Texto primario:   #1a1c1c
  Texto secundario: #5f5e5e
  Borde suave:      #eeeeee
  Muted/hint:       #6e7881

Elevación (box-shadow):
  L1: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06)
  L2: 0 4px 12px rgba(0,0,0,.10), 0 2px 4px rgba(0,0,0,.06)

Border radius: 12px (cards pequeñas), 16px (cards medianas), 24px (cards grandes), 9999px (botones pill)

Tipografía:
  Títulos grandes: font-bold, tracking-tight
  Labels sección: text-xs font-semibold uppercase tracking-wider text-[#6e7881]
  Cuerpo: text-sm/text-base, color #5f5e5e o #1a1c1c

Botón primario:
  bg-[#009ee3] text-white font-bold rounded-full h-14 px-8 shadow-lg
  hover: brightness-110, active: scale-[0.98]
```

---

### Estructura de secciones (en orden)

#### 1. Navbar fija
- Logo: ícono `account_balance_wallet` en cuadrado redondeado azul (#009ee3) + texto "AulaCash" en bold.
- Links: "Características", "¿Cómo funciona?", "Instalación", "Para docentes".
- CTA derecha: botón pill "Ir a la app →" con fondo #009ee3.
- Navbar con `backdrop-blur` y borde inferior sutil al hacer scroll.
- Mobile: hamburger menu con drawer lateral.

#### 2. Hero
- Fondo: gradiente sutil de #f9f9f9 a #e8f4fb (blanco roto a azul muy claro).
- Título grande (60px desktop, 36px mobile): "La billetera digital **para el aula**" — la palabra "aula" en color #009ee3.
- Subtítulo (18px): "Enseñá economía, pagos y finanzas personales con una simulación real. Tus alumnos usan transferencias, QR y mercados propios — sin dinero real."
- Badge arriba del título: pill "✦ 100% educativo · Sin dinero real" con fondo #009ee3/10 y texto #006492.
- Dos botones: "Empezar gratis →" (primario #009ee3) + "Ver demo" (ghost, borde #eeeeee).
- Mockup derecho: un teléfono CSS (sin imagen — dibujalo con divs y Tailwind) que simule la pantalla del Dashboard de la app. El teléfono muestra:
  - Cabecera azul (#006492) con "Hola, María 👋" y badge "Mercado Escolar — ARS"
  - Saldo grande: "$ 4.250,00"
  - Cuatro íconos de acción en fila: Transferir, QR, Historial, Mercado
  - Dos filas de transacciones recientes con íconos y montos
  - Borde del teléfono: negro/gris oscuro, notch arriba, esquinas muy redondeadas
- En mobile: el mockup va debajo del texto, centrado, escala al 80%.

#### 3. Franja de logos / prueba social
- Fondo blanco, borde superior e inferior #eeeeee.
- Texto: "Usado en escuelas de todo el país" en text-xs uppercase muted.
- Fila de íconos ilustrativos (Material Symbols): `school`, `groups`, `emoji_events`, `workspace_premium`, `star` — con labels cortos debajo como "Colegios secundarios", "Equipos docentes", etc.

#### 4. Sección "¿Qué es AulaCash?"
- Layout dos columnas (desktop): texto izquierda, visual derecha.
- Texto: párrafo que explica el concepto — simulación educativa, mercados propios con moneda personalizada, el docente es admin, los alumnos son usuarios.
- Visual derecha: tres cards apiladas con sombra L2, ligeramente rotadas (-3deg, 0deg, +3deg) que muestren:
  - Card 1: "Mercado del Aula 3A — Abierto — Moneda: Aulis (AUL)"
  - Card 2: Transacción "Juan → María: +150 AUL · Transferencia"
  - Card 3: QR de cobro genérico con monto "75 AUL"
- Las cards deben estar superpuestas en un stack visual, con efecto de profundidad.

#### 5. Características (Features grid)
- Título de sección: "Todo lo que necesitás para enseñar finanzas"
- Grid 3×2 en desktop, 1 columna en mobile.
- Cada feature card: ícono Material Symbols en cuadrado redondeado azul claro (#e8f4fb), título bold, descripción 2 líneas.
- Features:
  1. `qr_code_scanner` — **Pagos por QR** — Los alumnos generan y escanean QR para cobrar y pagar dentro del mercado.
  2. `swap_horiz` — **Transferencias instantáneas** — Enviá moneda de un alumno a otro con saldo actualizado en tiempo real.
  3. `storefront` — **Mercados propios** — Cada clase tiene su propio mercado con moneda y catálogo de productos únicos.
  4. `admin_panel_settings` — **Panel de administración** — El docente carga saldo, crea mercados, gestiona usuarios y ve todas las transacciones.
  5. `receipt_long` — **Comprobantes PDF** — Cada operación genera un comprobante descargable con número de operación.
  6. `install_mobile` — **PWA instalable** — Funciona como app nativa en Android e iOS, sin necesidad de Play Store ni App Store.

#### 6. ¿Cómo funciona? (Stepper horizontal)
- Título: "Tres pasos para empezar"
- Stepper de 3 pasos en desktop (horizontal), vertical en mobile:
  1. **El docente crea el mercado** — Define la moneda (ej: "Aulis"), abre el mercado y agrega a los alumnos. Ícono: `add_business`
  2. **Los alumnos operan** — Reciben saldo inicial, transfieren entre sí, compran en el catálogo y cobran por QR. Ícono: `people`
  3. **Aprendizaje real** — El docente puede ver el historial, cerrar el mercado y analizar los resultados con la clase. Ícono: `insights`
- Línea conectora entre pasos (dashed, color #eeeeee) en desktop.
- Número del paso en círculo #009ee3 con texto blanco.

#### 7. Instalación como PWA
- Fondo: gradiente de #006492 a #004a6e (azul oscuro).
- Texto blanco. Título: "Instalala en tu celular en 30 segundos"
- Dos columnas:
  - **Android (Chrome)**: pasos con íconos
    1. Abrí la app en Chrome → ícono `open_in_browser`
    2. Tocá los tres puntos del menú → ícono `more_vert`
    3. "Agregar a pantalla de inicio" → ícono `add_to_home_screen`
    4. Confirmá → ícono `check_circle`
  - **iPhone (Safari)**: pasos con íconos
    1. Abrí la app en Safari → ícono `open_in_browser`
    2. Tocá el botón compartir → ícono `ios_share`
    3. "Agregar a pantalla de inicio" → ícono `add_to_home_screen`
    4. Confirmá → ícono `check_circle`
- Cada paso: círculo numerado con borde blanco/40, texto blanco.
- Debajo: badge "Sin Play Store · Sin App Store · Funciona offline" en blanco/20 redondeado.

#### 8. Para docentes (CTA secundario)
- Fondo blanco, centrado.
- Ícono grande `school` en #009ee3.
- Título: "Diseñado con y para docentes"
- Párrafo: "AulaCash nació en el aula. Cada feature fue pensado para que el docente tenga control total y los alumnos una experiencia realista. Gratis, sin registro de tarjeta, sin publicidad."
- Tres pills de ventajas en fila: "✓ Gratis para siempre" · "✓ Sin datos sensibles" · "✓ Sin publicidad"
- Botón grande: "Empezar ahora →" (#009ee3)

#### 9. Footer
- Fondo #1a1c1c, texto blanco/80.
- Logo AulaCash (ícono + texto) a la izquierda.
- Columna centro: links "Inicio", "Características", "Instalación", "Panel docente".
- Columna derecha: "Contacto" con email de soporte.
- Línea inferior: "AulaCash — simulación educativa · Los saldos no representan dinero real · 2025"
- El disclaimer legal debe ser visible pero en texto pequeño (text-xs) con opacidad reducida.

---

### Comportamiento y animaciones

- Scroll suave entre secciones (`scroll-behavior: smooth`).
- Navbar cambia de transparente a fondo blanco + sombra al hacer scroll (JS con `scroll` event).
- Feature cards: hover eleva con `transition-all duration-200` y `shadow-lg`.
- Hero mockup de teléfono: animación CSS sutil de float (`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`).
- Stepper: los pasos se iluminan con Intersection Observer al entrar en viewport (añade clase `active` que cambia el círculo de borde a relleno).
- Botones: `active:scale-[0.98] transition-all`.
- No usar animaciones de scroll pesadas (no AOS, no GSAP) — solo CSS puro y JS mínimo.

---

### Responsive breakpoints

- Mobile: < 640px — todo en una columna, fuentes reducidas.
- Tablet: 640–1024px — grid 2 col donde aplique.
- Desktop: > 1024px — layout completo con dos columnas en hero y features.

---

### Notas adicionales

- No incluir ninguna imagen real. Todos los mockups son CSS/HTML puro.
- El disclaimer "simulación educativa — no dinero real" debe aparecer en: hero (badge), footer (texto legal), y sección features (subtítulo de la sección).
- Paleta y tipografía deben ser **idénticas** a la app para que la landing y la app se sientan como el mismo producto.
- El CTA principal "Ir a la app →" debe apuntar a `https://aulacash-frontend.onrender.com` (o la URL real que se configure).
- Toda la landing debe ser accesible: `alt` en imágenes, `aria-label` en botones icon-only, contraste WCAG AA.
- Código limpio, comentado por sección, sin CSS inline salvo lo estrictamente necesario.

---

### Entregable esperado

Un único archivo `landing/index.html` que al abrir en el navegador muestre la landing completa, funcional, responsiva, sin errores de consola. Incluir `<meta name="viewport">`, `<meta name="description" content="AulaCash — plataforma educativa de pagos digitales">`, y Open Graph tags básicos.
