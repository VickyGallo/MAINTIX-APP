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

| Comando          | Qué hace                                  |
| ---------------- | ----------------------------------------- |
| `pnpm install`   | Instala dependencias                      |
| `pnpm dev`       | Levanta la app en `http://localhost:3000` |
| `pnpm build`     | Build de producción                       |
| `pnpm typecheck` | Chequeo de tipos                          |
| `pnpm lint`      | ESLint + reglas de capas                  |

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
