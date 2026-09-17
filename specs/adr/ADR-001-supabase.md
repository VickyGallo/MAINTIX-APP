# ADR-001 — Supabase como plataforma de datos

- **Estado:** Propuesto (se acepta en F0-T01)
- **Fecha:** 2026-09-17
- **Reemplaza:** arquitectura AppSheet + Google Sheets de la presentación (mayo 2026)

## Contexto

- La presentación propone AppSheet + Google Sheets para arrancar con costo mínimo.
- Los docs del repo (`04_Data_Model`) ya definen PostgreSQL como motor.
- El producto apunta a ser **SaaS multi-empresa a futuro** (ver [ADR-003](ADR-003-multi-tenant.md)).
- Necesidades concretas del MVP:
  - Base relacional con integridad referencial (tickets ↔ presupuestos ↔ pagos).
  - Autenticación de FM y propietarios.
  - Almacenamiento privado de fotos (incluye obras de arte y el interior de propiedades de alto valor).
  - Aislamiento por organización.
  - Tareas programadas (preventivos).

## Decisión

Usar **Supabase** con un alcance acotado:

| Servicio Supabase | Uso | Notas |
|---|---|---|
| Postgres | Fuente única de verdad | Postgres estándar, sin extensiones propietarias en la lógica |
| Auth | Login, invitaciones, MFA | Encapsulado detrás de `AuthPort` |
| Storage | Fotos, PDFs, facturas | Buckets privados, encapsulado detrás de `StoragePort` |
| Data API (PostgREST) | **No se usa** | Esquemas de negocio no expuestos (F1-T02) |
| Edge Functions / Realtime | **No se usan en el MVP** | Se reevalúan en F8 |

La aplicación (Next.js) corre en **Vercel** y accede a Postgres vía Drizzle ([ADR-002](ADR-002-drizzle.md)).

### Entornos

| Entorno | Supabase | Vercel | Uso |
|---|---|---|---|
| local | `supabase start` (Docker) | `next dev` | desarrollo y tests de integración |
| dev | proyecto `maintix-dev` (Free) | previews | QA de PRs; se pausa tras 1 semana sin uso (aceptable) |
| prod | proyecto `maintix-prod` (**Pro**) | producción | nunca en plan Free: se pausa y no tiene backups |

## Costos (verificados 2026-09-17)

| Ítem | Plan | Costo | Incluye |
|---|---|---|---|
| Supabase prod | Pro | USD 25/mes | 8 GB DB, 100 GB storage, 250 GB egress, 100k MAU, backups diarios 7 días, USD 10 de compute |
| Supabase dev | Free | USD 0 | 500 MB DB, 1 GB storage; pausa por inactividad |
| Vercel | Pro | USD 20/mes por seat | 1M invocaciones, 1 TB transferencia; cron por minuto |
| PITR (opcional) | add-on | USD 100/mes | se decide en F7-T11 |

Excedentes Supabase Pro: DB USD 0,125/GB · Storage USD 0,0213/GB · Egress USD 0,09/GB.
El plan Hobby de Vercel **no admite uso comercial**.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| AppSheet + Google Sheets | Sin integridad referencial real ni aislamiento multi-empresa; dependencia de Google; migrar a SaaS implica reescribir todo. |
| Neon + Auth.js/Clerk + S3/R2 | Mismo Postgres, pero 3 proveedores que integrar y operar; más tiempo de F0/F1 sin beneficio para el volumen actual. |
| AWS (RDS + Cognito + S3) | Mayor costo fijo y operación; prematuro. |

## Consecuencias

- ✅ Postgres gestionado, login y almacenamiento listos: F0/F1 más cortos.
- ✅ Portabilidad: la lógica vive en TypeScript + Postgres estándar; salir de Supabase implica reemplazar Auth y Storage, no reescribir el dominio.
- ⚠️ Dependencia de Supabase Auth/Storage → mitigado con puertos (`AuthPort`, `StoragePort`).
- ⚠️ Backups de solo 7 días en Pro → dump semanal externo y simulacro de restauración (F7-T11).
- ⚠️ El costo que escala es **storage + egress de fotos**, no la base → compresión en cliente (F3-T12) y URLs firmadas de corta duración (F3-T13).

## Referencias

- https://supabase.com/pricing
- https://vercel.com/pricing
- https://vercel.com/docs/cron-jobs/usage-and-pricing
