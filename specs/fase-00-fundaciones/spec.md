# Fase 0 — Fundaciones

> **Estado:** Propuesta · **Depende de:** aprobación de esta propuesta · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Dejar listos el repositorio, los entornos, la calidad automatizada y la documentación oficial, para que la Fase 1 arranque sin fricción y sin deuda técnica de base.

## Resultado de negocio

- Documentación oficial (`/docs`) coherente con las decisiones tomadas: una sola fuente de verdad, como exige CONTRIBUTING.
- Cada PR se valida automáticamente (tipos, lint, tests, build) antes de llegar a `main`.
- Costo mensual de infraestructura conocido y aprobado antes de contratar.

## Alcance

1. Aceptación formal de los ADR 001–004.
2. Documentación:
   - Convertir los `.md.docx` a `.md`.
   - Incorporar el Documento 01 al repo.
   - Actualizar los docs 03, 04 y 05 según los ADR.
3. Resolver el submódulo roto `legacy/tws-facility-app`.
4. Proyecto Next.js (App Router, TypeScript estricto) con estructura modular de Clean Architecture.
5. Tooling: ESLint, Prettier, límites de dependencias entre capas, Vitest, Playwright.
6. Supabase local + Drizzle configurado con migraciones en `supabase/migrations`.
7. Entornos cloud: Supabase dev/prod y Vercel, con variables de entorno por entorno.
8. CI (GitHub Actions) y CD (previews + migración de prod con aprobación manual).
9. Observabilidad base: logs estructurados, Sentry, `/api/health`.
10. Sistema de diseño base: tokens, modo claro/oscuro, componentes primitivos.
11. Plantillas de PR y de issue, y protección de la rama `main`.

## Fuera de alcance

- Tablas de negocio (desde F1).
- Pantallas funcionales (desde F1).

## Estructura del repositorio (objetivo)

```
MAINTIX-APP/
├─ docs/                     ← fuente oficial (Markdown)
├─ specs/                    ← esta propuesta
├─ legacy/                   ← resuelto en F0-T05
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/            ← generadas por drizzle-kit
│  └─ seed.sql
├─ src/
│  ├─ app/                   ← rutas Next.js (UI + /api/v1): capa delgada
│  ├─ modules/<modulo>/
│  │  ├─ domain/             ← entidades y reglas puras (sin dependencias externas)
│  │  ├─ application/        ← casos de uso + puertos (interfaces)
│  │  ├─ infrastructure/     ← repositorios Drizzle, adaptadores Storage/Auth/Email
│  │  └─ api/                ← schemas zod, DTOs, handlers
│  ├─ db/schema/             ← tablas + políticas RLS (Drizzle)
│  ├─ shared/                ← db, auth, contexto de request, logger, errores
│  └─ ui/                    ← sistema de diseño
├─ tests/
│  ├─ integration/
│  └─ e2e/
└─ drizzle.config.ts
```

**Módulos previstos:** `identity`, `catalog`, `tickets`, `finance`, `maintenance`, `reporting`, `notifications`, `jobs`, `audit`, `importer`.

**Regla de dependencias** (verificada por lint):
- `domain` no importa nada externo.
- `application` solo importa `domain`.
- `infrastructure` y `api` importan `application`.
- `app/` solo importa `api` y `ui`.

## Criterios de aceptación de la fase

- [ ] ADR 001–004 en estado **Aceptado**.
- [ ] `/docs` en Markdown, sin `.docx`, y consistente con los ADR (revisado por el responsable de producto).
- [ ] `pnpm dev` levanta la app contra Supabase local con un solo comando documentado.
- [ ] Un PR con error de tipos, de lint, de test o una importación que viola capas **falla** en CI.
- [ ] Merge a `main` genera deploy; la migración de prod requiere aprobación manual.
- [ ] `/api/health` responde 200 en dev y prod, y un error forzado aparece en Sentry.
- [ ] Costo mensual aprobado por el titular de la cuenta antes de contratar planes pagos.

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| No hay acceso al repo `tws-facility-app` | F0-T05 no bloquea al resto; se documenta y se sigue sin legacy. |
| Docker no disponible en la máquina de desarrollo (Supabase local) | Usar el proyecto `maintix-dev` para desarrollo; los tests de integración igual corren en CI. |
| Actualizar docs demora la fase | Las tareas de docs no bloquean el scaffold; corren en paralelo. |

## Supuestos a validar

- El equipo usa GitHub (el remoto actual es `github.com/VickyGallo/MAINTIX-APP`).
- Gestor de paquetes: `pnpm`.
