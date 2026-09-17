# Fase 1 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.

---

### F1-T01 · Esquemas `app`/`app_private` y columnas base
- **Depende de:** F0-T10
- **Qué:** crear los esquemas `app` y `app_private`, el helper Drizzle `baseColumns()` (id, organization_id, created_at, updated_at, created_by, deleted_at) y la función/trigger `set_updated_at`.
- **Criterios de aceptación:**
  - [ ] `baseColumns()` es reutilizable desde cualquier archivo de `src/db/schema`.
  - [ ] Actualizar una fila modifica `updated_at` automáticamente.
- **Tests:** integración: insert + update verifica `updated_at`.
- **Tamaño:** S

### F1-T02 · Blindar la Data API y los privilegios por defecto
- **Depende de:** F1-T01, F0-T11
- **Qué:**
  - Excluir `app` y `app_private` de los esquemas expuestos por la Data API en los 3 entornos.
  - Revocar privilegios de `anon` sobre `app`.
  - Otorgar a `authenticated` solo `USAGE` y los permisos de tabla que requieren las políticas.
  - Documentar la configuración en `docs/runbooks/supabase.md`.
- **Criterios de aceptación:**
  - [ ] `GET /rest/v1/<tabla_app>` con JWT válido devuelve error (esquema no expuesto) en dev y prod.
  - [ ] `anon` no puede leer ninguna tabla de `app` conectándose directo.
- **Tests:** integración: consulta con rol `anon` falla.
- **Tamaño:** S

### F1-T03 · Tablas `organizations`, `memberships`, `platform_admins`
- **Depende de:** F1-T01
- **Qué:** crear las tablas, enums, índices y restricciones únicas según la spec y generar la migración.
- **Criterios de aceptación:**
  - [ ] No se puede crear una membresía duplicada (organización, usuario) activa.
  - [ ] Existe el índice `(user_id, organization_id)`.
  - [ ] RLS habilitado en las 3 tablas (sin políticas todavía: acceso denegado por defecto).
- **Tests:** integración: la restricción de duplicado falla como se espera.
- **Tamaño:** M

### F1-T04 · Funciones helper de RLS
- **Depende de:** F1-T03
- **Qué:** implementar `app_private.is_member`, `has_role` e `is_platform_admin` (`SECURITY DEFINER`, `search_path = ''`, `(select auth.uid())`) y revocar `EXECUTE` a `public`/`anon`.
- **Criterios de aceptación:**
  - [ ] Las funciones devuelven lo esperado para una membresía activa, invitada o revocada.
  - [ ] `anon` no puede ejecutarlas.
- **Tests:** integración con claims simulados (tabla de casos).
- **Tamaño:** M

### F1-T05 · Políticas RLS de identidad
- **Depende de:** F1-T04
- **Qué:** declarar en Drizzle (`pgPolicy`) las políticas de `organizations`, `memberships` y `platform_admins` según la matriz de la spec.
- **Criterios de aceptación:**
  - [ ] `CLIENT` solo lee su propia membresía.
  - [ ] `FACILITY_MANAGER` puede insertar membresías solo con rol `CLIENT`.
  - [ ] Nadie lee membresías de otra organización.
- **Tests:** integración por rol (matriz completa).
- **Tamaño:** M

### F1-T06 · Acceso a datos `db.rls(ctx)` y restricción de `adminDb`
- **Depende de:** F1-T04, F0-T07
- **Qué:**
  - Implementar `db.rls(ctx, fn)` siguiendo el patrón de Drizzle con Supabase: transacción con `set_config('request.jwt.claims', …, true)`, `request.jwt.claim.sub` y `set local role authenticated`.
  - Tipar `RequestContext`.
  - Exportar `adminDb` desde una ruta que el lint solo permite en jobs, importador y scripts.
  - Verificar la API vigente con context7.
- **Criterios de aceptación:**
  - [ ] Dentro de `db.rls`, `auth.uid()` devuelve el usuario del contexto.
  - [ ] Al terminar la transacción, la conexión vuelve al rol original (no se filtran claims entre requests).
  - [ ] Importar `adminDb` desde `src/app/**` falla en lint.
- **Tests:** integración: 2 requests secuenciales con usuarios distintos en la misma conexión del pool no comparten claims.
- **Tamaño:** L

### F1-T07 · Autenticación en Next.js
- **Depende de:** F0-T06, F0-T11
- **Qué:**
  - Integrar `@supabase/ssr`: cliente de servidor y `proxy.ts` que refresca la sesión llamando a `auth.getClaims()`.
  - Pantallas: login (email + contraseña), magic link, logout, "olvidé mi contraseña" y callback.
  - Registro público deshabilitado en Supabase.
  - Verificar con context7 la integración vigente de `@supabase/ssr` con la versión de Next.js en uso.
- **Criterios de aceptación:**
  - [ ] Las rutas protegidas redirigen a `/login` sin sesión válida.
  - [ ] La autorización nunca se basa en `getSession()` (búsqueda en código = 0 usos para autorización).
  - [ ] El registro público devuelve error aunque se llame a la API de Auth directamente.
- **Tests:** E2E: login → ruta protegida → logout → redirección.
- **Tamaño:** L

### F1-T08 · Contexto de request y organización activa
- **Depende de:** F1-T06, F1-T07
- **Qué:** resolver `RequestContext { userId, organizationId, roles, requestId }` a partir de los claims verificados y del header `X-Organization-Id` (o cookie en web), validando la membresía `ACTIVE` en cada request.
- **Criterios de aceptación:**
  - [ ] Organización ajena → 403 problem+json.
  - [ ] Usuario con una sola membresía → se infiere sin header.
  - [ ] Membresía revocada → 403 en la request siguiente.
- **Tests:** unit del resolvedor; integración de los 3 casos.
- **Tamaño:** M

### F1-T09 · Selector de organización activa (UI)
- **Depende de:** F1-T08, F0-T16
- **Qué:** selector en el perfil y en el header para usuarios con más de una membresía; persistir la elección en cookie.
- **Criterios de aceptación:**
  - [ ] Cambiar de organización recarga los datos del contexto nuevo.
  - [ ] Con una sola membresía, el selector no aparece.
- **Tests:** E2E con usuario de 2 organizaciones.
- **Tamaño:** S

### F1-T10 · Invitaciones por email
- **Depende de:** F1-T05, F1-T08
- **Qué:**
  - Caso de uso `inviteMember(email, role)`: crea la membresía `INVITED` y envía la invitación con Supabase Auth (acción de servidor con clave secreta, solo desde este caso de uso).
  - Al aceptar: membresía → `ACTIVE`.
  - Reenviar y revocar invitación.
- **Criterios de aceptación:**
  - [ ] Se respetan las reglas de quién invita a quién (regla 2 de la spec).
  - [ ] Invitar a un email ya miembro devuelve 409.
  - [ ] Todo queda en `activity_log`.
- **Tests:** unit de reglas; integración del flujo INVITED → ACTIVE.
- **Tamaño:** L

### F1-T11 · Wrapper de route handlers y errores
- **Depende de:** F1-T08, F0-T14
- **Qué:** `defineRoute({ auth, roles, input: zodSchemas, handler })`: resuelve el contexto, valida la entrada, ejecuta dentro de `db.rls`, mapea errores de dominio a problem+json y propaga `request_id`.
- **Criterios de aceptación:**
  - [ ] Los errores de validación devuelven 422 con `errors[]` por campo.
  - [ ] Un error no controlado devuelve 500 genérico (sin stack) y se reporta a Sentry.
  - [ ] Rol no permitido → 403.
- **Tests:** unit del mapeo de errores; integración con una ruta de ejemplo.
- **Tamaño:** L

### F1-T12 · Paginación por cursor e idempotencia
- **Depende de:** F1-T11
- **Qué:** helper de paginación (`limit` ≤ 100, cursor opaco) y tabla `idempotency_keys` con middleware para POST: misma clave + mismo body → misma respuesta; misma clave + otro body → 422.
- **Criterios de aceptación:**
  - [ ] Reintentar un POST con la misma `Idempotency-Key` no crea duplicados.
  - [ ] Las claves de más de 48 h se purgan (job en F5; mientras tanto, query documentada).
- **Tests:** integración de ambos casos de idempotencia y de paginación.
- **Tamaño:** M

### F1-T13 · OpenAPI de `/api/v1`
- **Depende de:** F1-T11
- **Qué:** generar OpenAPI 3.1 desde los schemas zod registrados en `defineRoute` y publicarlo en `/api/v1/openapi.json` (en prod solo autenticado).
- **Criterios de aceptación:**
  - [ ] Cada ruta definida con `defineRoute` aparece en el documento.
  - [ ] CI falla si el OpenAPI generado no es válido.
- **Tests:** validación del documento generado.
- **Tamaño:** M

### F1-T14 · `activity_log` y servicio de auditoría
- **Depende de:** F1-T06
- **Qué:** tabla `activity_log` con políticas (insert por miembros; select `ORG_ADMIN`/`FACILITY_MANAGER`; sin update/delete para nadie) y servicio `audit.record(tx, { entity, action, changes })` que calcula el diff antes/después.
- **Criterios de aceptación:**
  - [ ] `UPDATE` y `DELETE` sobre `activity_log` fallan para cualquier rol de aplicación.
  - [ ] El diff solo incluye campos cambiados y excluye campos sensibles.
- **Tests:** unit del diff; integración de inmutabilidad.
- **Tamaño:** M

### F1-T15 · Numeración por organización
- **Depende de:** F1-T03
- **Qué:** tabla `org_counters` y función `app_private.next_number(org, key)` con `INSERT … ON CONFLICT DO UPDATE … RETURNING`. Formateador de dominio `formatNumber("TK", year, n)` → `TK-2026-0042`.
- **Criterios de aceptación:**
  - [ ] 100 llamadas concurrentes devuelven 100 valores únicos y correlativos.
  - [ ] Al cambiar de año, la secuencia reinicia en 1.
- **Tests:** integración concurrente; unit del formateador.
- **Tamaño:** S

### F1-T16 · Suite reutilizable de aislamiento multi-empresa
- **Depende de:** F1-T05, F1-T06
- **Qué:**
  - Fixture con 2 organizaciones × (`ORG_ADMIN`, `FACILITY_MANAGER`, `CLIENT`) y helper `describeTenantIsolation({ table, seed, expectations })`.
  - Pruebas de SELECT, INSERT, UPDATE y DELETE cross-org, tanto con `db.rls` como con conexión directa usando el rol `authenticated`.
- **Criterios de aceptación:**
  - [ ] Aplicada a las tablas de F1.
  - [ ] Documentada en `tests/integration/README.md` como obligatoria para tablas nuevas.
- **Tests:** la suite misma.
- **Tamaño:** L

### F1-T17 · Estructura de navegación según rol
- **Depende de:** F1-T07, F0-T16
- **Qué:**
  - Layout responsive: sidebar en web y bottom navigation en mobile.
  - Menú según rol (doc 05): FM/ORG_ADMIN → Dashboard, Clientes, Propiedades, Tickets, Preventivos, Proveedores, Gastos, Reportes, Configuración. CLIENT → Inicio, Mis propiedades, Solicitudes, Reportes, Perfil.
  - Pantalla "Sin acceso".
- **Criterios de aceptación:**
  - [ ] `CLIENT` no ve ítems de FM ni puede navegar a esas rutas (403 en servidor, no solo en UI).
  - [ ] Máximo 3 niveles de navegación.
- **Tests:** E2E por rol.
- **Tamaño:** M

### F1-T18 · Seed de desarrollo
- **Depende de:** F1-T10
- **Qué:** script `pnpm db:seed` que crea la organización "TWS (dev)", una segunda organización de prueba y usuarios `admin@`, `fm@` y `cliente@` con contraseñas locales.
- **Criterios de aceptación:**
  - [ ] Idempotente (se puede correr dos veces).
  - [ ] No puede ejecutarse contra prod (verifica el entorno).
- **Tests:** integración: correr dos veces sin errores.
- **Tamaño:** S
