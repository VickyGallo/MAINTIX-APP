# Fase 0 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.

---

### F0-T01 · Aceptar ADR 001–004
- **Depende de:** —
- **Qué:** revisar los ADR con el responsable de producto y pasarlos a estado `Aceptado`, o registrar los cambios pedidos.
- **Criterios de aceptación:**
  - [ ] Los 4 ADR tienen estado `Aceptado` y fecha de aceptación.
  - [ ] Las objeciones quedan registradas en la sección "Consecuencias" del ADR correspondiente.
- **Tests:** n/a
- **Tamaño:** S

### F0-T02 · Convertir la documentación a Markdown
- **Depende de:** —
- **Qué:**
  - Convertir `docs/*.md.docx` a `.md`, preservando el contenido.
  - Incorporar `Documento 01.docx` como `docs/01_Product_Vision.md`.
  - Eliminar los `.docx` del repo.
- **Criterios de aceptación:**
  - [ ] Existen `01_Product_Vision.md`, `03_Domain_Model.md`, `04_Data_Model.md`, `05_Application_Flow.md` y `CONTRIBUTING.md`.
  - [ ] No hay `.docx` en `docs/`.
  - [ ] Los diagramas ASCII se ven correctamente (bloques de código).
- **Tests:** n/a
- **Tamaño:** S

### F0-T03 · Actualizar `04_Data_Model.md` según los ADR
- **Depende de:** F0-T01, F0-T02
- **Qué:** reflejar lo decidido en los ADR:
  - Drizzle en lugar de Prisma.
  - `organization_id` y `memberships`.
  - Entidades nuevas: `Finding`, `Invoice`, `Payment`, `PreventiveOccurrence`, `ActivityLog`, `WorkflowState`/`WorkflowTransition`, `Job`.
  - Moneda por importe.
  - Numeración por organización.
- **Criterios de aceptación:**
  - [ ] Ninguna mención a Prisma.
  - [ ] Todas las entidades de las specs F1–F6 figuran con sus relaciones.
  - [ ] Se indica qué pasa de "V2" al MVP (`ActivityLog`, organización).
- **Tests:** n/a
- **Tamaño:** M

### F0-T04 · Actualizar `03_Domain_Model.md` y `05_Application_Flow.md`
- **Depende de:** F0-T01, F0-T02
- **Qué:**
  - En 03: estados configurables, hallazgos, pagos y regla de urgencias.
  - En 05: solicitud simplificada del cliente (propiedad → descripción/voz → fotos → enviar), bandeja "Requiere tu aprobación", rol `ORG_ADMIN`.
- **Criterios de aceptación:**
  - [ ] Los flujos de 05 coinciden con las pantallas de las specs F3, F4 y F6.
  - [ ] 03 lista las reglas de dominio de las specs F3, F4 y F5.
- **Tests:** n/a
- **Tamaño:** M

### F0-T05 · Resolver el submódulo `legacy/tws-facility-app`
- **Depende de:** —
- **Qué:** el repo tiene un gitlink (commit `8edbc39`) sin `.gitmodules`. Hay que:
  - Obtener la URL y el acceso al repo legacy.
  - Agregar `.gitmodules`, o eliminar el gitlink y documentar la ubicación del legacy.
  - Inventariar qué se puede reutilizar (lógica, catálogos, pantallas).
- **Criterios de aceptación:**
  - [ ] `git clone --recurse-submodules` no deja carpetas vacías sin explicación.
  - [ ] Existe `legacy/README.md` con ubicación, estado e inventario de lo reutilizable (o "sin acceso" y responsable).
- **Tests:** n/a
- **Tamaño:** S
- **Bloqueante externo:** acceso al repo legacy.

### F0-T06 · Scaffold Next.js con estructura modular
- **Depende de:** —
- **Qué:**
  - Crear la app Next.js (App Router, TypeScript `strict`, `pnpm`, alias `@/`).
  - Estructura de carpetas de la spec, con un módulo de ejemplo vacío (`src/modules/_template`).
  - Verificar con context7 la versión estable vigente de Next.js y sus convenciones (por ejemplo, `proxy.ts`).
- **Criterios de aceptación:**
  - [ ] `pnpm dev` y `pnpm build` funcionan.
  - [ ] `tsconfig` con `strict`, `noUncheckedIndexedAccess` y `noImplicitOverride`.
  - [ ] README raíz con requisitos y comandos.
- **Tests:** build en CI (F0-T12).
- **Tamaño:** M

### F0-T07 · Lint, formato y límites entre capas
- **Depende de:** F0-T06
- **Qué:** ESLint + Prettier, regla de límites entre capas (`eslint-plugin-boundaries` o `dependency-cruiser`) y regla que prohíbe importar `adminDb` fuera de `src/modules/jobs/**`, `src/modules/importer/**` y `scripts/**`.
- **Criterios de aceptación:**
  - [ ] `pnpm lint` falla si `domain` importa `infrastructure`.
  - [ ] `pnpm lint` falla si `src/app/**` importa `adminDb`.
  - [ ] `pnpm format:check` disponible.
- **Tests:** archivos de prueba que violan las reglas y verifican que el lint falla (se eliminan al terminar, o quedan como fixture ignorado).
- **Tamaño:** M

### F0-T08 · Base de testing
- **Depende de:** F0-T06
- **Qué:** Vitest con proyectos `unit` e `integration` y Playwright para E2E, con un test de humo de cada tipo.
- **Criterios de aceptación:**
  - [ ] `pnpm test:unit`, `pnpm test:integration` y `pnpm test:e2e` existen y pasan.
  - [ ] Reporte de cobertura de `unit` generado.
- **Tests:** los de humo.
- **Tamaño:** S

### F0-T09 · Supabase local
- **Depende de:** F0-T06
- **Qué:** `supabase init` y `supabase start`, scripts `db:start`, `db:stop`, `db:reset`, y documentación de requisitos (Docker).
- **Criterios de aceptación:**
  - [ ] `pnpm db:reset` recrea la base local aplicando migraciones y seed.
  - [ ] `.env.example` con las variables locales (URL, publishable key, `DATABASE_URL`).
- **Tests:** n/a
- **Tamaño:** S

### F0-T10 · Configurar Drizzle con Supabase
- **Depende de:** F0-T09
- **Qué:**
  - `drizzle.config.ts` con `dialect: "postgresql"`, `schema: "./src/db/schema"`, `out: "./supabase/migrations"`, `migrations.prefix: "supabase"` y `entities.roles.provider: "supabase"`.
  - Clientes `adminDb` y `client` en `src/shared/db`.
  - Scripts `db:generate` y `db:migrate`.
  - Verificar la API vigente con context7 antes de implementar.
- **Criterios de aceptación:**
  - [ ] Una tabla de prueba genera su migración en `supabase/migrations` y se aplica en local.
  - [ ] Los roles de Supabase (`authenticated`, `anon`) no aparecen como entidades gestionadas por drizzle-kit.
  - [ ] La tabla de prueba se elimina al cerrar la tarea.
- **Tests:** test de integración que conecta y ejecuta `select 1`.
- **Tamaño:** M

### F0-T11 · Entornos cloud y variables de entorno
- **Depende de:** F0-T01
- **Qué:**
  - Crear Supabase `maintix-dev` (Free) y `maintix-prod` (Pro), y el proyecto en Vercel (Pro).
  - Configurar variables por entorno (Preview → dev, Production → prod).
  - Validar las variables al arrancar (schema zod en `src/shared/env.ts`).
- **Criterios de aceptación:**
  - [ ] **Costo mensual aprobado por el titular de la cuenta antes de activar los planes pagos.**
  - [ ] La app no arranca si falta una variable requerida (mensaje claro).
  - [ ] Ningún secreto en el repo (`.env*` en `.gitignore`, salvo `.env.example`).
- **Tests:** unit test del schema de env.
- **Tamaño:** S
- **Bloqueante externo:** aprobación de gasto.

### F0-T12 · CI en GitHub Actions
- **Depende de:** F0-T07, F0-T08, F0-T10
- **Qué:** workflow de PR con install (con caché), `typecheck`, `lint`, `test:unit`, `test:integration` (Supabase local en el runner) y `build`.
- **Criterios de aceptación:**
  - [ ] Los checks son requeridos para mergear a `main`.
  - [ ] El pipeline tarda menos de 10 min en un PR típico.
- **Tests:** PR de prueba con un test roto → CI en rojo.
- **Tamaño:** M

### F0-T13 · CD: previews y migraciones controladas
- **Depende de:** F0-T11, F0-T12
- **Qué:**
  - Previews de Vercel por PR contra `maintix-dev`.
  - Workflow manual `migrate-prod` (environment con aprobación requerida) que aplica las migraciones pendientes a prod antes del deploy.
- **Criterios de aceptación:**
  - [ ] Cada PR muestra la URL de preview.
  - [ ] Aplicar migraciones en prod exige aprobación de un revisor.
  - [ ] Procedimiento documentado en `docs/runbooks/deploy.md`.
- **Tests:** ejecución en seco del workflow contra dev.
- **Tamaño:** M

### F0-T14 · Observabilidad base
- **Depende de:** F0-T06, F0-T11
- **Qué:**
  - Logger JSON (pino) con `request_id`, `organization_id` y `user_id` cuando existan.
  - Sentry (`@sentry/nextjs`) en dev y prod.
  - `GET /api/health`, que verifica la conexión a la base.
- **Criterios de aceptación:**
  - [ ] Cada request loguea método, ruta, estado, duración y `request_id` (también devuelto en el header `x-request-id`).
  - [ ] Un error forzado en dev aparece en Sentry con `request_id`.
  - [ ] Nunca se loguean tokens, contraseñas ni el cuerpo de los uploads.
- **Tests:** unit test del redactor de campos sensibles; integración de `/api/health`.
- **Tamaño:** M

### F0-T15 · Plantillas y protección de rama
- **Depende de:** F0-T12
- **Qué:** plantilla de PR (checklist de la Definition of Done), plantilla de issue "Tarea atómica", `CODEOWNERS` y protección de `main` (PR obligatorio, 1 aprobación, checks verdes).
- **Criterios de aceptación:**
  - [ ] No se puede hacer push directo a `main`.
  - [ ] La plantilla de PR incluye el ID de la tarea (`F#-T##`).
- **Tests:** n/a
- **Tamaño:** S

### F0-T16 · Sistema de diseño base
- **Depende de:** F0-T06
- **Qué:**
  - Tokens de diseño con estética "Banca Privada" (fondos blancos, grises suaves, una sola tipografía legible, espaciado amplio).
  - Modo claro/oscuro.
  - Primitivos: botón, input, select, textarea, card, badge de estado, tabla, modal, toast, skeleton.
- **Criterios de aceptación:**
  - [ ] Contraste AA en ambos modos.
  - [ ] Componentes usables con pulgar (target táctil ≥ 44 px).
  - [ ] Página `/dev/ui` (solo fuera de prod) que muestra todos los primitivos.
- **Tests:** test de accesibilidad automatizado (axe) sobre `/dev/ui`.
- **Tamaño:** L
