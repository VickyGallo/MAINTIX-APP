# Módulo plantilla

Copiar esta carpeta para crear un módulo nuevo (`identity`, `catalog`, `tickets`, `finance`, `maintenance`, `reporting`, `notifications`, `jobs`, `audit`, `importer`).

| Capa              | Contiene                                                  | Puede importar                                                      |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `domain/`         | Entidades, value objects y reglas puras                   | Nada externo al módulo (ni Next, ni Drizzle, ni Supabase, ni React) |
| `application/`    | Casos de uso y puertos (interfaces)                       | `domain`                                                            |
| `infrastructure/` | Repositorios Drizzle y adaptadores (Storage, Auth, Email) | `application`, `domain`, `@/shared`                                 |
| `api/`            | Schemas zod, DTOs y handlers de `/api/v1`                 | `application`, `domain`, `@/shared`                                 |

`src/app/**` solo importa `api` y `@/ui`. Las reglas se verifican con `pnpm lint` (ver `eslint.config.mjs`).
