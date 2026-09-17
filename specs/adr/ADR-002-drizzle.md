# ADR-002 — Drizzle ORM en lugar de Prisma

- **Estado:** Propuesto (se acepta en F0-T01)
- **Fecha:** 2026-09-17
- **Modifica:** `docs/04_Data_Model` ("Prisma ORM como capa de persistencia")

## Contexto

- Maintix es multi-empresa ([ADR-003](ADR-003-multi-tenant.md)). El incidente más grave posible es que **una organización o un propietario vea datos de otro**.
- Queremos dos barreras independientes:
  1. **Código:** los casos de uso filtran por organización y propiedad.
  2. **Base de datos:** Row Level Security (RLS) de Postgres rechaza filas ajenas aunque el código se equivoque.
- Prisma se conecta con el rol `postgres`, que tiene `BYPASSRLS`: la segunda barrera no aplica. Para aplicarla hace falta una extensión de terceros, y las políticas se mantienen en SQL manual fuera del esquema de Prisma.
- Drizzle tiene soporte oficial para RLS con Supabase:
  - Políticas declaradas en el esquema (`pgPolicy`, `authenticatedRole`).
  - `drizzle-kit` las incluye en las migraciones.
  - Patrón documentado para ejecutar consultas con los claims del JWT del usuario dentro de una transacción.

## Decisión

1. **ORM:** Drizzle ORM + `drizzle-kit`.
2. **Migraciones:** `drizzle-kit generate` con `out: "./supabase/migrations"`, `migrations.prefix: "supabase"` y `entities.roles.provider: "supabase"`.
3. **Dos clientes de base de datos:**

| Cliente | Rol Postgres | Respeta RLS | Uso permitido |
|---|---|---|---|
| `db.rls(ctx, fn)` | `authenticated` + claims del usuario | Sí | **Toda** request de usuario (API y Server Components) |
| `adminDb` | `postgres` | No | Solo jobs de sistema, migraciones, seeds e importador. Prohibido en `src/app/**` y `src/modules/*/api/**` (regla de lint, F1-T06) |

4. **Políticas RLS** declaradas junto a cada tabla en `src/db/schema/**`. Ninguna tabla del esquema `app` puede existir sin RLS (chequeo en CI, F7-T08).
5. **Identidad:** se verifica en el servidor con `supabase.auth.getClaims()`. Nunca con `getSession()` para decisiones de autorización.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Prisma + `prisma-extension-supabase-rls` | Extensión de terceros (no oficial); políticas en SQL manual fuera del esquema. |
| Prisma sin RLS | Una sola barrera; un filtro olvidado equivale a una fuga de datos entre clientes. |
| Kysely / SQL puro | Tipado y migraciones más manuales; sin soporte declarativo de políticas. |

## Consecuencias

- ✅ Esquema, relaciones y políticas versionados juntos y revisables en el mismo PR.
- ✅ Defensa en profundidad real para el aislamiento multi-empresa.
- ⚠️ Cada request con RLS corre dentro de una transacción (`set_config` + `set local role`): pequeño overhead de latencia → se mide en F7-T12.
- ⚠️ Hay que actualizar `docs/04_Data_Model` (F0-T03).
- ⚠️ Cualquier uso de `adminDb` en código de request es un defecto de seguridad → regla de lint + revisión.

## Referencias

- https://orm.drizzle.team/docs/rls
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/server-side (getClaims vs getSession)
