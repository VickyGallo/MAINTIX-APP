# Maintix

Plataforma de Facility Management para propiedades de alto valor: tickets, presupuestos, aprobaciones, pagos, mantenimiento preventivo, evidencia fotográfica y reportes.

- **Documentación oficial:** [`docs/`](docs/)
- **Plan de implementación (specs por fase):** [`specs/README.md`](specs/README.md)

## Stack

| Capa      | Tecnología                                         |
| --------- | -------------------------------------------------- |
| App / API | Next.js (App Router) + TypeScript estricto         |
| UI        | Tailwind CSS + sistema de diseño propio (`src/ui`) |
| Datos     | Supabase (Postgres, Auth, Storage) + Drizzle ORM   |
| Tests     | Vitest (unit + integración) y Playwright (E2E)     |

## Requisitos

- Node.js ≥ 22
- pnpm 10 (`corepack enable`)
- Docker Desktop en ejecución (para Supabase local)

## Comandos

| Comando                 | Qué hace                                                     |
| ----------------------- | ------------------------------------------------------------ |
| `pnpm install`          | Instala dependencias                                         |
| `pnpm dev`              | Levanta la app en `http://localhost:3000`                    |
| `pnpm build`            | Build de producción                                          |
| `pnpm typecheck`        | Chequeo de tipos                                             |
| `pnpm lint`             | ESLint + reglas de capas                                     |
| `pnpm format`           | Formatea con Prettier (`format:check` para verificar)        |
| `pnpm test:unit`        | Tests unitarios (Vitest)                                     |
| `pnpm test:integration` | Tests de integración (requieren Supabase local)              |
| `pnpm test:e2e`         | Tests E2E (Playwright, desktop + mobile)                     |
| `pnpm db:start`         | Levanta Supabase local (Postgres, Auth, Storage, Studio)     |
| `pnpm db:status`        | Muestra URLs y claves locales                                |
| `pnpm db:reset`         | Recrea la base local aplicando migraciones y `seed.sql`      |
| `pnpm db:generate`      | Genera una migración SQL desde `src/db/schema` (drizzle-kit) |
| `pnpm db:stop`          | Detiene Supabase local                                       |

## Primer arranque

```bash
pnpm install
cp .env.example .env.local      # completar la clave con `pnpm db:status`
pnpm db:start                   # requiere Docker Desktop en ejecución
pnpm db:reset
pnpm dev
```

Con la app levantada, `http://localhost:3000/dev/ui` muestra el sistema de diseño (no disponible en producción).

## Migraciones

1. Editar las tablas en `src/db/schema/`.
2. `pnpm db:generate` crea el SQL en `supabase/migrations/`.
3. `pnpm db:reset` lo aplica en local. En los entornos remotos se aplica con el flujo de despliegue (F0-T13).

Las migraciones las aplica **solo** la CLI de Supabase: no usar `drizzle-kit push` ni `drizzle-kit migrate`.

## Estructura

```
src/
├─ app/                ← rutas Next.js (UI + /api/v1): capa delgada
├─ modules/<modulo>/   ← domain · application · infrastructure · api
├─ db/schema/          ← tablas y políticas RLS (Drizzle)
├─ shared/             ← db, env, logger, errores, contexto de request
└─ ui/                 ← sistema de diseño
tests/                 ← unit · integration · e2e
supabase/              ← config y migraciones
specs/                 ← plan por fases
docs/                  ← documentación oficial
```

Ver [`src/modules/_template/README.md`](src/modules/_template/README.md) para las reglas entre capas.
