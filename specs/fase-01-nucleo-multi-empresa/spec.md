# Fase 1 — Núcleo multi-empresa y seguridad

> **Estado:** Propuesta · **Depende de:** Fase 0 · **Tareas:** [tareas.md](tareas.md)
> **ADR relacionados:** [ADR-002](../adr/ADR-002-drizzle.md), [ADR-003](../adr/ADR-003-multi-tenant.md)

## Objetivo

Construir la base sobre la que se apoyan todos los módulos:
- identidad, organizaciones y membresías;
- aislamiento por organización en dos capas (código + RLS);
- auditoría;
- numeración legible;
- convenciones de API;
- estructura de navegación de la app.

## Resultado de negocio

- Cualquier dato cargado desde la Fase 2 queda aislado por organización y auditado desde el primer registro.
- El FM puede invitar propietarios por email; no hay registro público.
- Pasar a SaaS (F8) no requiere tocar el modelo de seguridad.

## Alcance

1. Esquemas `app` (negocio) y `app_private` (funciones helper), sin exposición en la Data API.
2. `organizations`, `memberships`, `platform_admins`.
3. Funciones helper de RLS y políticas de las tablas de identidad.
4. Acceso a datos con `db.rls(ctx)` y restricción de `adminDb`.
5. Login (email + contraseña y magic link), logout, recuperación de contraseña y refresco de sesión en `proxy.ts`.
6. Contexto de request, selector de organización activa e invitaciones.
7. Convenciones de `/api/v1`: wrapper, errores, paginación, idempotencia y OpenAPI.
8. `activity_log` append-only.
9. Numeración por organización (`org_counters`).
10. Suite reutilizable de tests de aislamiento.
11. Estructura de navegación: bottom nav en mobile, sidebar en web, según rol.
12. Seed de desarrollo.

## Fuera de alcance

- Registro self-service de organizaciones (F8).
- MFA (F7-T09).
- UI de configuración de roles avanzados (F8).

## Modelo de datos

### Columnas base (toda tabla de negocio)

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `organization_id` | `uuid` | FK → `organizations.id`, `NOT NULL` (excepto en `organizations`) |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | trigger `set_updated_at` |
| `created_by` | `uuid` | FK → `auth.users.id`, nullable para procesos de sistema |
| `deleted_at` | `timestamptz` | soft delete; los repositorios filtran `deleted_at IS NULL` |

### Tablas

```
organizations      (id, name, slug UNIQUE, timezone, default_currency, status[ACTIVE|SUSPENDED], ...base)
memberships        (id, organization_id, user_id → auth.users, role[ORG_ADMIN|FACILITY_MANAGER|CLIENT|PROVIDER],
                    status[INVITED|ACTIVE|REVOKED], invited_by, invited_at, accepted_at, ...base)
                    UNIQUE (organization_id, user_id) WHERE deleted_at IS NULL
                    INDEX  (user_id, organization_id)
platform_admins    (user_id PK → auth.users, created_at)
activity_log       (id, organization_id, actor_user_id, actor_type[USER|SYSTEM], entity_type, entity_id,
                    action, changes jsonb, request_id, created_at)
                    INDEX (organization_id, entity_type, entity_id, created_at DESC)
org_counters       (organization_id, counter_key, year, value)  PK (organization_id, counter_key, year)
idempotency_keys   (organization_id, user_id, key, request_hash, response_status, response_body jsonb, created_at)
                    PK (organization_id, user_id, key); se purgan a las 48 h
```

### Funciones helper (`app_private`, `SECURITY DEFINER`, `search_path = ''`)

| Función | Devuelve `true` si… |
|---|---|
| `is_member(org uuid)` | el usuario tiene una membresía `ACTIVE` en `org` |
| `has_role(org uuid, roles text[])` | la membresía `ACTIVE` tiene alguno de los roles |
| `is_platform_admin()` | el usuario está en `platform_admins` |
| `can_access_property(property uuid)` | *(se crea en F2)* |

Todas usan `(select auth.uid())`.

## Reglas de negocio

1. Un usuario sin membresías `ACTIVE` puede iniciar sesión, pero ve la pantalla "Sin acceso" y no accede a datos.
2. Solo `ORG_ADMIN` y `FACILITY_MANAGER` invitan. Solo `ORG_ADMIN` invita a otro `ORG_ADMIN` o `FACILITY_MANAGER`.
3. Revocar una membresía corta el acceso en la request siguiente (la membresía se valida en cada request, no queda cacheada en el JWT).
4. `activity_log` es append-only: nadie, ni siquiera `ORG_ADMIN`, puede modificar ni borrar registros.
5. Toda mutación de datos de negocio registra la actividad en la **misma transacción** que la mutación.
6. Los números legibles (`TK-2026-0042`) son únicos por organización, correlativos por año y nunca se reutilizan, aunque el registro se borre.

## Convenciones de API (`/api/v1`)

| Tema | Convención |
|---|---|
| Autenticación | Cookie de sesión de Supabase (web) o `Authorization: Bearer` (futura app nativa) |
| Organización activa | Header `X-Organization-Id`; si falta y hay una sola membresía, se infiere |
| Validación | zod en body, query y params; los errores devuelven 422 con detalle por campo |
| Errores | `application/problem+json` (RFC 9457): `type`, `title`, `status`, `detail`, `request_id`, `errors[]` |
| Paginación | por cursor: `?limit=` (máx. 100) y `?cursor=`; respuesta `{ data, next_cursor }` |
| Idempotencia | Header `Idempotency-Key` obligatorio en POST de creación desde mobile; repetir la clave devuelve la misma respuesta |
| Fechas | ISO 8601 con zona horaria; los importes se envían como string decimal, más `currency` ISO 4217 |
| Versionado | Breaking change → `/api/v2`; `v1` se mantiene 6 meses |

## Seguridad y permisos

| Tabla | `ORG_ADMIN` | `FACILITY_MANAGER` | `CLIENT` | `PLATFORM_ADMIN` |
|---|---|---|---|---|
| `organizations` | leer/editar la suya | leer la suya | leer la suya | leer todas |
| `memberships` | CRUD en su organización | leer; invitar `CLIENT` | leer la propia | leer todas |
| `activity_log` | leer | leer | — | leer todas |
| `org_counters` | solo vía función | solo vía función | solo vía función | — |

## Criterios de aceptación de la fase

- [ ] Suite de aislamiento en verde: con 2 organizaciones y 3 roles, ninguna consulta devuelve filas de otra organización, tanto por la API como con acceso directo a Postgres usando el rol `authenticated` y claims ajenos.
- [ ] Llamar a la Data API (`/rest/v1/...`) con un JWT válido no expone tablas del esquema `app`.
- [ ] Invitar → aceptar → iniciar sesión → ver la estructura de navegación según rol funciona de punta a punta.
- [ ] Toda mutación de prueba deja un registro en `activity_log` con `request_id`.
- [ ] 100 creaciones concurrentes generan 100 números distintos y correlativos.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Overhead de latencia por transacción RLS | Medir en F7-T12; si p95 > 500 ms, agrupar consultas por request en una sola transacción. |
| Política RLS mal escrita (demasiado permisiva) | Suite de aislamiento obligatoria por tabla + revisión de políticas en cada PR. |
| Recursión de políticas (`memberships` consultando `memberships`) | Funciones helper `SECURITY DEFINER` en `app_private`. |
