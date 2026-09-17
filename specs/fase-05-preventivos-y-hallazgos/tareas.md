# Fase 5 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.
> **Regla transversal:** cada tabla nueva agrega su caso en la suite de aislamiento (F1-T16) dentro de la misma tarea (excepto `jobs`, que no es accesible por usuarios).

---

### F5-T01 · Tabla `jobs` y `enqueue` transaccional
- **Depende de:** F1-T06
- **Qué:** crear la tabla `jobs` (sin políticas para `authenticated`/`anon`), `jobs.enqueue(tx, …)` con `idempotency_key` opcional y el adaptador de `DomainEvents` (F3-T05) que persiste los eventos como jobs.
- **Criterios de aceptación:**
  - [ ] Encolar dentro de una transacción que hace rollback no deja el job.
  - [ ] La misma `idempotency_key` no crea 2 jobs.
  - [ ] Un usuario autenticado no puede leer `jobs`.
- **Tests:** integración.
- **Tamaño:** M

### F5-T02 · Runner de jobs
- **Depende de:** F5-T01
- **Qué:** `POST /api/internal/jobs/run` protegido con `CRON_SECRET` (comparación en tiempo constante). Toma lotes con `FOR UPDATE SKIP LOCKED`, usa un registro tipado de handlers (`type` → handler con schema zod del payload), reintenta con backoff, marca `DEAD` y respeta el presupuesto de 50 s.
- **Criterios de aceptación:**
  - [ ] Dos runners concurrentes nunca procesan el mismo job.
  - [ ] Un payload inválido → `DEAD` inmediato (sin reintentos) + Sentry.
  - [ ] Los logs incluyen `job_id`, `type`, `attempt` y duración.
- **Tests:** integración: concurrencia, reintentos, DEAD y secreto inválido (401).
- **Tamaño:** L

### F5-T03 · Programación en Vercel Cron
- **Depende de:** F5-T02, F0-T13
- **Qué:**
  - Configurar los crons (runner cada 5 min; programadores diario y horario que encolan `schedule-preventives`, `open-preventive-tickets` y las purgas).
  - Documentar en `docs/runbooks/jobs.md` cómo reprocesar un job `DEAD`.
  - Verificar con context7 la configuración vigente de crons en Vercel.
- **Criterios de aceptación:**
  - [ ] Los crons figuran en el deploy de dev.
  - [ ] Existe un script `pnpm jobs:retry <id>` (solo con acceso admin) documentado.
- **Tests:** ejecución manual verificada en dev.
- **Tamaño:** S

### F5-T04 · Jobs de purga
- **Depende de:** F5-T02, F1-T12, F3-T11
- **Qué:** handlers `purge-idempotency-keys` (más de 48 h) y `purge-pending-files` (`PENDING` de más de 24 h → `REJECTED` + borrar el objeto en Storage). También borra en Storage los adjuntos con soft delete de más de 30 días.
- **Criterios de aceptación:**
  - [ ] Nunca borra archivos `READY` referenciados.
  - [ ] Es idempotente.
- **Tests:** integración con Storage local.
- **Tamaño:** M

### F5-T05 · Tablas `preventive_plans` y `preventive_occurrences` + RLS
- **Depende de:** F2-T07, F3-T03
- **Qué:** crear las tablas, las restricciones (`scheduled_months` válidos, `due_day` 1–28, `UNIQUE(plan_id, period)`), los índices y las políticas de la spec. Agregar la FK `tickets.preventive_occurrence_id → preventive_occurrences.id` (pendiente desde F3).
- **Criterios de aceptación:**
  - [ ] `scheduled_months = {}` o con valor 13 → rechazado por la base.
  - [ ] La FK de `tickets.preventive_occurrence_id` existe.
  - [ ] `CLIENT` ve planes y ocurrencias solo de sus propiedades.
- **Tests:** integración + aislamiento.
- **Tamaño:** M

### F5-T06 · Dominio: calendario de preventivos
- **Depende de:** —
- **Qué:** funciones puras `monthsForShortcut(shortcut, startMonth)`, `occurrencesInHorizon(plan, today, horizonDays, timezone)` y `shouldOpenTicket(occurrence, today, leadDays)`.
- **Criterios de aceptación:**
  - [ ] Cubre los casos del Excel (grupo electrógeno irregular, A/A estacional).
  - [ ] Cubre cruce de año (diciembre → enero).
  - [ ] Cubre zonas horarias (Buenos Aires, Montevideo, Miami) con un `today` cercano a medianoche.
- **Tests:** unit con tabla de casos (≥ 20).
- **Tamaño:** M

### F5-T07 · Job `schedule-preventives`
- **Depende de:** F5-T05, F5-T06, F5-T02
- **Qué:** handler que recorre planes activos por organización y crea ocurrencias en el horizonte de 60 días (`INSERT … ON CONFLICT DO NOTHING`).
- **Criterios de aceptación:**
  - [ ] Ejecutarlo 3 veces → sin duplicados.
  - [ ] Procesa por organización en lotes (no carga todos los planes en memoria).
- **Tests:** integración.
- **Tamaño:** M

### F5-T08 · Job `open-preventive-tickets`
- **Depende de:** F5-T07, F3-T05
- **Qué:** handler que abre el ticket preventivo según la regla 3 (reutiliza `createTicket` en modo sistema, `actor_type = SYSTEM`) y actualiza la ocurrencia a `TICKET_OPEN`, en una transacción por ocurrencia.
- **Criterios de aceptación:**
  - [ ] Si falla la creación del ticket, la ocurrencia sigue `SCHEDULED` y se reintenta.
  - [ ] `budget_policy = CONTRACT` → ticket con `budget_exemption = CONTRACT`.
  - [ ] La auditoría registra `actor_type = SYSTEM`.
- **Tests:** integración.
- **Tamaño:** M

### F5-T09 · Sincronizar ocurrencia con el ticket preventivo
- **Depende de:** F5-T08, F3-T07
- **Qué:** al pasar el ticket a `FINALIZADO` → ocurrencia `DONE`; a `CANCELADO` → `SKIPPED` con motivo; al reabrir → vuelve a `TICKET_OPEN`. Se implementa en el caso de uso de transición, dentro de la misma transacción.
- **Criterios de aceptación:**
  - [ ] Los 3 caminos están cubiertos.
- **Tests:** integración.
- **Tamaño:** S

### F5-T10 · Casos de uso y API del Plan Maestro
- **Depende de:** F5-T07
- **Qué:**
  - `createPlan`, `updatePlan` (aplica la regla 6: regenerar `SCHEDULED` futuras) y `deactivatePlan` (regla 7).
  - `GET/POST/PATCH /preventive-plans`, `GET /preventive-occurrences?from&to&property&status&overdue`.
- **Criterios de aceptación:**
  - [ ] Cambiar meses no altera ocurrencias abiertas ni cerradas.
  - [ ] `overdue=true` devuelve vencidas no finalizadas.
- **Tests:** integración de las reglas 6 y 7.
- **Tamaño:** L

### F5-T11 · UI FM: Plan Maestro (grilla anual)
- **Depende de:** F5-T10, F1-T17
- **Qué:** grilla estilo Excel: filas = planes (sistema, propiedad, proveedor, equipos, alcance), columnas = meses; clic para marcar o desmarcar meses; atajos de frecuencia; filtro por propiedad; alta y edición en panel lateral.
- **Criterios de aceptación:**
  - [ ] Cargar los 21 sistemas del Excel es posible en < 15 min (medido en UAT, F7).
  - [ ] En mobile se muestra como lista por plan (sin grilla).
- **Tests:** E2E: crear plan bimestral → editar a personalizado.
- **Tamaño:** L

### F5-T12 · UI FM: agenda de preventivos
- **Depende de:** F5-T10
- **Qué:** vista de próximos 30/60 días y vencidos, agrupada por propiedad, con acceso al ticket abierto o a la ocurrencia programada.
- **Criterios de aceptación:**
  - [ ] Los vencidos aparecen primero, resaltados.
- **Tests:** E2E básico.
- **Tamaño:** M

### F5-T13 · Tablas `findings` y `finding_attachments` + RLS
- **Depende de:** F3-T10
- **Qué:** crear las tablas, índices y políticas. Agregar la FK `tickets.origin_finding_id → findings.id` (pendiente desde F3).
- **Criterios de aceptación:**
  - [ ] `CLIENT` ve hallazgos solo de sus propiedades.
  - [ ] La FK de `tickets.origin_finding_id` existe.
- **Tests:** integración + aislamiento.
- **Tamaño:** S

### F5-T14 · Caso de uso `registerFinding` + API
- **Depende de:** F5-T13, F3-T05, F3-T11
- **Qué:** registrar un hallazgo con fotos (reutiliza el flujo de subida firmada) y la creación automática del correctivo (regla 8) en la misma transacción. Endpoints `POST /tickets/{id}/findings` y `GET /findings?property&from&to`.
- **Criterios de aceptación:**
  - [ ] Si falla la creación del correctivo, no queda un hallazgo huérfano.
  - [ ] El correctivo referencia el hallazgo y el hallazgo referencia el correctivo.
- **Tests:** unit + integración.
- **Tamaño:** M

### F5-T15 · UI FM: registrar hallazgo en campo (mobile)
- **Depende de:** F5-T14, F3-T18, F3-T14
- **Qué:** botón "Registrar hallazgo" en el detalle del ticket: descripción con voz, severidad, fotos e interruptor "Generar correctivo" (encendido por defecto si la severidad es ≥ `HIGH`). Al guardar, muestra el link al correctivo creado.
- **Criterios de aceptación:**
  - [ ] El flujo completo se hace con una mano en el celular (≤ 2 pantallas).
- **Tests:** E2E mobile.
- **Tamaño:** M

### F5-T16 · Test de integración de punta a punta
- **Depende de:** F5-T09, F5-T14
- **Qué:** plan mensual → `schedule-preventives` → `open-preventive-tickets` → el FM finaliza con hallazgo `HIGH` → se crea el correctivo → la ocurrencia queda `DONE` → re-ejecutar los jobs no duplica nada.
- **Criterios de aceptación:**
  - [ ] Corre en CI con reloj controlado (fecha simulada).
- **Tests:** el test.
- **Tamaño:** M
