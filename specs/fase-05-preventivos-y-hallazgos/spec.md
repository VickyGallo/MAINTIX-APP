# Fase 5 — Preventivos, hallazgos y tareas en segundo plano

> **Estado:** Propuesta · **Depende de:** Fase 3 (Fase 4 recomendada) · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Convertir la hoja `MAESTRO PREVENTIVOS` (hoy casi vacía) en un **Plan Maestro operativo**:
- el sistema genera y abre los preventivos a tiempo;
- el FM los ejecuta con evidencia;
- cuando detecta una falla, un **hallazgo** crea el correctivo automáticamente (el "Motor de Hallazgos" de la presentación).

Esta fase incorpora además la infraestructura de tareas en segundo plano que usan F5, F6 y F7.

## Resultado de negocio

- Pasa de 3 preventivos sobre 55 tickets (mayo 2026) a un plan que no depende de la memoria del FM.
- Se reducen las urgencias (pérdidas de gas, termotanques) detectándolas en preventivos.
- El propietario ve "próximos mantenimientos": evidencia de cuidado proactivo, el principio central del producto.

## Alcance

1. `jobs` (outbox + cola en Postgres) y runner disparado por Vercel Cron.
2. `preventive_plans` con meses programados (admite frecuencias irregulares y estacionales).
3. `preventive_occurrences` generadas automáticamente con horizonte de 60 días.
4. Apertura automática del ticket preventivo `lead_days` antes del vencimiento.
5. `findings` (hallazgos) → ticket correctivo automático.
6. Cierre de ocurrencia al finalizar o cancelar el ticket preventivo.
7. Pantallas FM: grilla anual del Plan Maestro, agenda de preventivos, registro de hallazgo en campo.
8. Jobs de mantenimiento: purga de `idempotency_keys` (F1) y de archivos `PENDING` (F3).

## Fuera de alcance

- Checklists por preventivo (V2 en docs 04).
- Preventivos por uso u horas de funcionamiento, e IoT (F8).
- Notificaciones: los eventos se emiten acá; el envío se hace en F6.

## Modelo de datos

```
jobs                   (id, organization_id?, type, payload jsonb, status[QUEUED|RUNNING|DONE|FAILED|DEAD],
                        run_at, attempts, max_attempts default 5, last_error?, idempotency_key UNIQUE?,
                        locked_at?, locked_by?, created_at, updated_at)
                       INDEX (status, run_at)
preventive_plans       (…base, property_id, asset_id?, category_id?, system_name, provider_id?,
                        scheduled_months smallint[] CHECK (valores 1..12, no vacío),
                        due_day smallint default 1 CHECK (1..28), lead_days smallint default 7,
                        budget_policy[REQUIRED|CONTRACT], equipment_count?, scope?, notes?, is_active,
                        legacy_ref?)
preventive_occurrences (…base, plan_id, period date (primer día del mes), due_date,
                        status[SCHEDULED|TICKET_OPEN|DONE|SKIPPED], ticket_id?, skipped_reason?)
                       UNIQUE (plan_id, period)
                       INDEX (organization_id, status, due_date)
findings               (…base, property_id, asset_id?, source_ticket_id, description,
                        severity[LOW|MEDIUM|HIGH|CRITICAL], requires_corrective bool, generated_ticket_id?)
finding_attachments    (…base, finding_id, file_id)
```

`jobs` no se expone a usuarios: sin políticas para `authenticated`, se accede solo con `adminDb` desde `src/modules/jobs`.

## Frecuencias

La fuente de verdad son los **meses programados**. La UI ofrece atajos que completan esos meses:

| Atajo | Meses resultantes (ejemplo con inicio en enero) |
|---|---|
| Mensual | 1–12 |
| Bimestral | 1, 3, 5, 7, 9, 11 |
| Trimestral | 1, 4, 7, 10 |
| Semestral | 1, 7 |
| Anual | 1 |
| Personalizado | selección libre |

Casos reales del Excel que el modelo debe soportar:
- **Grupo electrógeno (Nordelta, Sumar):** "Bimestral", pero con meses mayo, junio, agosto, octubre y diciembre → personalizado.
- **A/A (Nordelta, Dasma):** "Bimestral en invierno y mensual en verano" → personalizado (por ejemplo, 1, 2, 3, 5, 7, 9, 11, 12).

## Reglas de negocio

1. **Generación** (job diario `schedule-preventives`, 06:00 hora de Buenos Aires): por cada plan activo, crea ocurrencias `SCHEDULED` para los meses programados dentro de los próximos 60 días. `due_date` = `due_day` del mes en la zona horaria de la propiedad.
2. **Idempotencia:** `UNIQUE (plan_id, period)`. Correr el job N veces no duplica ocurrencias.
3. **Apertura** (job `open-preventive-tickets`, cada hora): si `due_date - lead_days ≤ hoy` y la ocurrencia está `SCHEDULED`, crea un ticket con:
   - `kind = PREVENTIVE`, `origin = PREVENTIVE`, proveedor del plan y título "Preventivo: {system_name}";
   - `budget_exemption = CONTRACT` si `budget_policy = CONTRACT`.

   La ocurrencia pasa a `TICKET_OPEN`.
4. **Cierre de ocurrencia:** ticket preventivo → `FINALIZADO` → ocurrencia `DONE`. Ticket → `CANCELADO` → ocurrencia `SKIPPED` con el motivo de la cancelación.
5. **Vencidos:** ocurrencias con `due_date < hoy` y ticket no finalizado se muestran como "vencidas" (cálculo, no estado).
6. **Plan editado:** cambiar los meses no toca ocurrencias `TICKET_OPEN`/`DONE`/`SKIPPED`. Las `SCHEDULED` futuras que ya no correspondan se eliminan y se regeneran.
7. **Plan desactivado:** no genera más ocurrencias; las `SCHEDULED` se eliminan; las abiertas siguen su curso.
8. **Hallazgo:**
   - Se registra desde cualquier ticket (típicamente preventivo) con descripción, severidad y fotos.
   - Si `requires_corrective = true`, en la **misma transacción** se crea un ticket con `kind = CORRECTIVE`, `origin = FINDING`, `origin_finding_id`, misma propiedad, ambiente y activo, y prioridad `HIGH` si la severidad es `HIGH`/`CRITICAL` (si no, `MEDIUM`).
   - Evento `finding.created`.
9. **Visibilidad del propietario:** ve los hallazgos de sus propiedades y el correctivo generado (con fotos `visible_to_client`).

## Tareas en segundo plano (runner)

| Aspecto | Decisión |
|---|---|
| Disparo | Vercel Cron (plan Pro: frecuencia mínima de 1 minuto) → `POST /api/internal/jobs/run` con `Authorization: Bearer ${CRON_SECRET}` |
| Frecuencia | Runner cada 5 min; `schedule-preventives` diario; `open-preventive-tickets` cada hora; purgas diarias |
| Toma de trabajos | `SELECT … FOR UPDATE SKIP LOCKED LIMIT 20` con `run_at ≤ now()` |
| Reintentos | Backoff exponencial (1, 5, 25, 125 min); después de `max_attempts` → `DEAD` |
| Tiempo máximo | Presupuesto de 50 s por invocación; lo que no termina se retoma en la siguiente |
| Enqueue | `jobs.enqueue(tx, type, payload, { runAt, idempotencyKey })` en la misma transacción del caso de uso (outbox) |
| Alertas | `DEAD` > 0 → evento a Sentry con tipo y último error |
| Escala | Si el backlog supera 15 min de forma sostenida → evaluar una cola dedicada (F8) |

## Seguridad y permisos

| Tabla | FM | CLIENT |
|---|---|---|
| `preventive_plans` | CRUD | `SELECT` si `can_access_property` (sin `notes` en el DTO) |
| `preventive_occurrences` | `SELECT` / `UPDATE` vía casos de uso | `SELECT` si `can_access_property` |
| `findings`, `finding_attachments` | CRUD | `SELECT` si `can_access_property` |
| `jobs` | — | — |

El endpoint interno rechaza cualquier request sin `CRON_SECRET` válido (comparación en tiempo constante).

## Criterios de aceptación de la fase

- [ ] El plan "Grupo electrógeno — Nordelta — may, jun, ago, oct, dic" genera exactamente esas ocurrencias.
- [ ] Ejecutar `schedule-preventives` 3 veces seguidas no crea duplicados.
- [ ] Con `lead_days = 7`, el ticket preventivo se abre 7 días antes del vencimiento.
- [ ] Un hallazgo `HIGH` en un preventivo crea un correctivo `HIGH` vinculado, visible para el propietario.
- [ ] Un job que falla 5 veces queda `DEAD` y aparece en Sentry.
- [ ] `POST /api/internal/jobs/run` sin secreto → 401.

## Supuestos a validar con el FM

- El día de vencimiento por defecto es el 1 de cada mes, con aviso 7 días antes. Es configurable por plan.
- La mayoría de los preventivos con proveedor fijo (Herber, GreenKeaper, Sumar, Mansilla) están cubiertos por un abono (`CONTRACT`) y no requieren presupuesto por visita.
