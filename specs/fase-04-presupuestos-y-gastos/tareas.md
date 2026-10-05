# Fase 4 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.
> **Regla transversal:** cada tabla nueva agrega su caso en la suite de aislamiento (F1-T16) dentro de la misma tarea.

---

### F4-T01 · Tablas `budgets`, `budget_versions`, `budget_items` y `budget_files` + RLS
- **Depende de:** F3-T03, F3-T10, F3-T22
- **Qué:** crear las tablas, enums e índices y las políticas de la spec. Habilitar el tipo `BUDGET_VERSION` en `approvals` (creada en F3-T22). El `UPDATE` de CLIENT queda restringido a presupuestos enviados y accesibles.
- **Criterios de aceptación:**
  - [ ] `CLIENT` no ve presupuestos con `submitted_at` nulo.
  - [ ] Una versión con aprobación no se puede editar ni borrar (política + restricción de dominio).
  - [ ] `version_no` es único y correlativo por presupuesto.
- **Tests:** integración por rol + aislamiento.
- **Tamaño:** L

### F4-T02 · Dominio de presupuestos + guard `HAS_RECEIVED_BUDGET`
- **Depende de:** F4-T01, F3-T02
- **Qué:**
  - Módulo puro `finance/domain/budget`: transiciones de estado, versionado (regla 2.b), validaciones de moneda y monto, suma de ítems = importe de la versión, selección única, reglas de adicionales (7) e inmutabilidad de versiones aprobadas (8).
  - Implementación real de `BudgetReadPort` para el guard de F3.
- **Criterios de aceptación:**
  - [ ] 100 % de cobertura de ramas del dominio.
  - [ ] La transición #6 de F3 queda habilitada con un presupuesto `RECEIVED`.
- **Tests:** unit con tabla de casos; integración del guard.
- **Tamaño:** L

### F4-T03 · Casos de uso: solicitar y registrar recibido
- **Depende de:** F4-T02, F3-T07
- **Qué:** `requestBudget(ticketId, providerId, scope)`, `recordBudgetVersion(budgetId, { amount, currency, validUntil?, items?, fileIds? })` (crea la versión 1 o la corrección `n+1`) y las transiciones automáticas del ticket (reglas 1, 2 y 2.b), con auditoría y eventos.
- **Criterios de aceptación:**
  - [ ] La transición automática solo ocurre desde los estados indicados; en otros estados el ticket no cambia.
  - [ ] Moneda por defecto = `properties.default_currency`.
  - [ ] Una corrección crea la versión `n+1`, limpia `submitted_at` y conserva la versión anterior intacta.
  - [ ] Si se cargan ítems, su suma debe coincidir con el importe de la versión → si no, 422.
- **Tests:** unit + integración.
- **Tamaño:** M

### F4-T04 · Caso de uso: enviar a aprobación
- **Depende de:** F4-T03
- **Qué:** `submitBudgets(ticketId, budgetIds[])`: valida `RECEIVED`, fija `submitted_at`, transiciona el ticket si son `BASE` y emite el evento `budget.submitted`.
- **Criterios de aceptación:**
  - [ ] No se pueden mezclar `BASE` y `ADDITIONAL` en el mismo envío.
  - [ ] Reenviar uno ya enviado es idempotente.
- **Tests:** unit + integración.
- **Tamaño:** S

### F4-T05 · Caso de uso: decisión del cliente (aprobar/rechazar)
- **Depende de:** F4-T04
- **Qué:** `decideBudget(budgetVersionId, decision, reason?)` como `CLIENT`: crea el registro en `approvals` (canal `APP`) y aplica los efectos de las reglas 4 y 5 en una sola transacción (presupuestos hermanos, transición de sistema, regularización), con auditoría y evento `budget.decided`.
- **Criterios de aceptación:**
  - [ ] Decidir sobre una versión que no es la enviada → 409.
  - [ ] Queda una fila en `approvals` con monto, moneda, autor y fecha.
  - [ ] Dos decisiones concurrentes sobre presupuestos del mismo ticket → queda uno aprobado, sin estados inconsistentes (bloqueo por ticket).
  - [ ] Rechazar sin motivo → 422.
- **Tests:** unit + integración, incluido el caso concurrente.
- **Tamaño:** L

### F4-T06 · Caso de uso: decisión registrada por el FM
- **Depende de:** F4-T05
- **Qué:** `registerBudgetDecision(budgetVersionId, decision, channel, decidedBy, evidence)` (regla 6) reutilizando la lógica de F4-T05.
- **Criterios de aceptación:**
  - [ ] Sin archivo ni nota de ≥ 20 caracteres → 422.
  - [ ] `channel = APP` rechazado para el FM.
  - [ ] La aprobación guarda `registered_by_user_id` (el FM) y `decided_by_user_id` (quien aprobó).
- **Tests:** unit + integración.
- **Tamaño:** S

### F4-T07 · Presupuestos adicionales
- **Depende de:** F4-T05
- **Qué:** habilitar `type = ADDITIONAL` en solicitar, recibir, enviar y decidir, con las restricciones de estado del ticket (regla 7) y sin cambiar el estado del ticket.
- **Criterios de aceptación:**
  - [ ] Crear un adicional con el ticket en `PENDIENTE` → 409.
  - [ ] Aprobar un adicional no cambia el estado del ticket, pero limpia la "Acción requerida".
- **Tests:** integración.
- **Tamaño:** M

### F4-T08 · Regularización de urgencias
- **Depende de:** F4-T05, F3-T07
- **Qué:** limpiar `requires_regularization` al aprobar un `BASE` o registrar una exención, y crear el endpoint `GET /tickets?requires_regularization=true` con antigüedad.
- **Criterios de aceptación:**
  - [ ] Un ticket de urgencia se puede `CERRAR` después de la aprobación.
  - [ ] La lista está ordenada por antigüedad de la urgencia.
- **Tests:** integración del flujo completo.
- **Tamaño:** S

### F4-T09 · Tablas `invoices` y `payments` + RLS
- **Depende de:** F4-T01, F2-T01
- **Qué:** crear las tablas, índices y restricción única de factura por proveedor (usando `normalize_name`) y las políticas.
- **Criterios de aceptación:**
  - [ ] "0026" y "26" del mismo proveedor se consideran la misma factura (normalización de ceros a la izquierda).
  - [ ] `CLIENT` lee pagos solo de tickets accesibles.
- **Tests:** integración + aislamiento.
- **Tamaño:** M

### F4-T10 · Casos de uso: facturas y pagos
- **Depende de:** F4-T09, F4-T07
- **Qué:** `recordInvoice(...)` y `recordPayment(...)` con las reglas 9 a 13: moneda consistente, referencia a presupuesto según concepto, bloqueo y advertencia de duplicados, advertencia de sobrepago con confirmación.
- **Criterios de aceptación:**
  - [ ] Se reproducen como tests los casos reales del Excel: duplicado de facturas 26/27 (bloqueado), sobrepago del ticket #29 (advertencia), anticipo + saldo sobre la misma factura 30680 (permitido).
- **Tests:** unit del dominio + integración.
- **Tamaño:** L

### F4-T11 · Vistas financieras
- **Depende de:** F4-T10
- **Qué:** crear `ticket_financials_v`, `property_spend_monthly_v` y `provider_spend_v` con `security_invoker = true`, con índices de soporte.
- **Criterios de aceptación:**
  - [ ] Consultadas como `CLIENT`, solo devuelven filas accesibles (test directo con rol `authenticated`).
  - [ ] Nunca suman monedas distintas en una fila.
- **Tests:** integración por rol con datos en 2 monedas.
- **Tamaño:** M

### F4-T12 · API v1: presupuestos y decisiones
- **Depende de:** F4-T08
- **Qué:**
  - `GET/POST /tickets/{id}/budgets`, `POST /budgets/{id}/versions` (recibido o corrección, con ítems), `GET /budgets/{id}/versions`, `POST /tickets/{id}/budgets/submit`.
  - `POST /budget-versions/{id}/decision` (CLIENT), `POST /budget-versions/{id}/registered-decision` (FM).
  - `GET /tickets/{id}/approvals` (historial de decisiones, incluidas las urgencias).
  - `GET /approvals/pending` (CLIENT: su bandeja; FM: pendientes con antigüedad).
- **Criterios de aceptación:**
  - [ ] Test de contrato del DTO de cliente (sin datos internos).
  - [ ] `Idempotency-Key` en las decisiones.
- **Tests:** integración por rol.
- **Tamaño:** M

### F4-T13 · API v1: facturas, pagos y gastos
- **Depende de:** F4-T11
- **Qué:**
  - `GET/POST /invoices`, `GET/POST /tickets/{id}/payments`.
  - `GET /spend?property=&month=&provider=&currency=` (desde las vistas).
  - `GET /spend/export.csv` (FM).
- **Criterios de aceptación:**
  - [ ] Advertencias en `warnings[]`; la confirmación se reenvía con `confirm=true`.
  - [ ] CSV con encabezados en español y montos con separador decimal configurable.
- **Tests:** integración.
- **Tamaño:** M

### F4-T14 · UI FM: pestaña Presupuestos del ticket
- **Depende de:** F4-T12, F3-T18
- **Qué:** lista y comparativa lado a lado de presupuestos (proveedor, última versión, monto, moneda, validez, PDF, ítems); acciones solicitar, registrar versión, enviar a aprobación y registrar decisión por otro canal; historial de versiones y de aprobaciones; adicionales en una sección aparte.
- **Criterios de aceptación:**
  - [ ] La comparativa resalta el menor monto por moneda.
  - [ ] "Enviar a aprobación" muestra una vista previa de lo que verá el cliente.
  - [ ] El historial muestra cada versión con su importe, fecha y decisión, sin perder las anteriores.
- **Tests:** E2E del flujo FM.
- **Tamaño:** L

### F4-T15 · UI FM: pestaña Pagos del ticket
- **Depende de:** F4-T13, F4-T14
- **Qué:** resumen financiero (aprobado, pagado, saldo por moneda), alta de factura y pago con manejo de advertencias y bloqueos.
- **Criterios de aceptación:**
  - [ ] El modal de duplicado muestra el pago existente.
  - [ ] Saldo en rojo si hay sobrepago.
- **Tests:** E2E: anticipo + saldo → saldo 0.
- **Tamaño:** M

### F4-T16 · UI FM: control de gastos
- **Depende de:** F4-T13, F1-T17
- **Qué:** pantalla que reemplaza la hoja `CONTROL DE GASTOS`: tabla de pagos con filtros (propiedad, mes de obra, proveedor, concepto, moneda), totales por moneda, ranking de proveedores y export CSV.
- **Criterios de aceptación:**
  - [ ] Los totales coinciden con `property_spend_monthly_v`.
  - [ ] Filtros compartibles por URL.
- **Tests:** E2E básico + test de consistencia de totales.
- **Tamaño:** M

### F4-T17 · UI Cliente: "Requiere tu aprobación"
- **Depende de:** F4-T12, F3-T16
- **Qué:** bandeja mobile con presupuestos enviados; detalle con alcance, monto, moneda, proveedor, PDF y fotos del relevamiento; botones Aprobar/Rechazar (con motivo) y confirmación final.
- **Criterios de aceptación:**
  - [ ] Aprobar requiere una confirmación explícita ("Aprobar ARS 1.280.000").
  - [ ] Después de decidir, el ítem sale de la bandeja y el ticket se actualiza.
  - [ ] Cumple AA de accesibilidad.
- **Tests:** E2E mobile como `CLIENT`.
- **Tamaño:** M

### F4-T18 · E2E del flujo financiero completo
- **Depende de:** F4-T15, F4-T17
- **Qué:** el FM solicita 2 presupuestos → registra ambos → los envía → el cliente aprueba uno → el FM coordina y registra anticipo 50 % + saldo 50 % → saldo 0 → finaliza → cierra.
- **Criterios de aceptación:**
  - [ ] Corre en CI en < 3 min.
- **Tests:** el E2E.
- **Tamaño:** M
