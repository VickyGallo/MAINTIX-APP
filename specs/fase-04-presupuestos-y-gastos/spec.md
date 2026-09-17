# Fase 4 — Presupuestos, aprobación y gastos

> **Estado:** Propuesta · **Depende de:** Fase 3 · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Reemplazar la columna "Autorizado" del Excel, la aprobación por mail y la hoja `CONTROL DE GASTOS` por un circuito auditado:
- presupuestos comparables;
- **aprobación del propietario desde la app** (decisión de negocio del 2026-09-17);
- facturas y pagos (anticipo, saldo, pago total, adicional);
- gasto acumulado confiable por propiedad, mes, proveedor y moneda.

## Resultado de negocio

- El propietario aprueba desde el celular: menos demora entre presupuesto y coordinación.
- Toda aprobación tiene autor, canal, fecha y evidencia.
- El gasto informado al propietario es correcto: se bloquean duplicados como el de las facturas 26/27 de Horacio Cetkovich (+ARS 254.000 en mayo).
- Se ve la diferencia entre presupuesto y pagos, como en el ticket #29 (ARS 7,92 M presupuestado vs. 9,58 M pagado).
- Soporta varias monedas (ARS, USD, UYU) sin mezclarlas.

## Alcance

1. `budgets` (base y adicionales) con archivos PDF.
2. Casos de uso:
   - solicitar;
   - registrar recibido;
   - enviar a aprobación;
   - decisión del cliente;
   - decisión registrada por el FM;
   - adicionales.
3. Integración con el workflow (F3): transiciones automáticas y guard `HAS_RECEIVED_BUDGET` real.
4. Regularización de urgencias.
5. `invoices` y `payments` con control de duplicados.
6. Vistas financieras (`security_invoker`).
7. API y pantallas:
   - FM: presupuestos y pagos por ticket, control de gastos;
   - Cliente: bandeja "Requiere tu aprobación".

## Fuera de alcance

- Varios aprobadores o aprobación por monto (F8).
- Conversión entre monedas y tipo de cambio (F8, si hace falta).
- OCR de facturas (F8).
- Pagos online o integración con bancos.

## Modelo de datos

```
budgets        (…base, number, ticket_id, provider_id, type[BASE|ADDITIONAL],
                status[REQUESTED|RECEIVED|APPROVED|REJECTED],
                scope, amount numeric(14,2)?, currency char(3)?, valid_until?,
                requested_at, received_at?, submitted_at?, decided_at?,
                decided_by_user_id?, decision_channel[APP|EMAIL|WHATSAPP|PHONE|IN_PERSON]?,
                decision_note?, decision_evidence_file_id?, rejection_reason?, auto_rejected bool,
                legacy_ref?)
               UNIQUE (organization_id, number)
               INDEX (organization_id, ticket_id), (organization_id, status, submitted_at)
budget_files   (…base, budget_id, file_id)
invoices       (…base, provider_id, ticket_id?, number, normalized_number, issue_date?,
                amount numeric(14,2), currency char(3), file_id?, legacy_ref?)
               UNIQUE (organization_id, provider_id, normalized_number) WHERE deleted_at IS NULL
payments       (…base, ticket_id, provider_id, budget_id?, invoice_id?,
                concept[ADVANCE|BALANCE|FULL|ADDITIONAL], amount numeric(14,2), currency char(3),
                work_month date, sent_at date, paid_at date?, notes?,
                duplicate_override_reason?, legacy_ref?)
               INDEX (organization_id, ticket_id), (organization_id, work_month), (organization_id, provider_id, work_month)
```

**Importes:** `numeric(14,2)`, nunca `float`. En la API viajan como string decimal. Cada importe lleva su `currency` (ISO 4217).

### Vistas (con `security_invoker = true`, para que respeten la RLS de quien consulta)

| Vista | Columnas |
|---|---|
| `ticket_financials_v` | ticket_id, currency, approved_base, approved_additional, paid, balance |
| `property_spend_monthly_v` | property_id, work_month, currency, paid, payments_count |
| `provider_spend_v` | provider_id, work_month, currency, paid |

## Ciclo de vida del presupuesto

```
REQUESTED ──(registrar monto)──► RECEIVED ──(enviar a aprobación: submitted_at)──► RECEIVED + visible al cliente
                                                   │
                                  ┌────────────────┴───────────────┐
                                  ▼                                ▼
                              APPROVED                          REJECTED
                  (cliente en app o FM con evidencia)   (motivo; o automático "No seleccionado")
```

## Reglas de negocio

1. **Solicitar presupuesto** (FM): crea `REQUESTED` con número `PR-{año}-{n}`. Si el ticket está en `PENDIENTE` o `RELEVADO`, transiciona a `PRESUPUESTO_SOLICITADO`.
2. **Registrar recibido** (FM): monto y moneda obligatorios (por defecto, la moneda de la propiedad) y PDF opcional. Si el ticket está en `PRESUPUESTO_SOLICITADO`, transiciona a `PRESUPUESTO_RECIBIDO`.
3. **Enviar a aprobación** (FM): elige uno o más presupuestos `RECEIVED` y fija `submitted_at`.
   - Si son `BASE`, el ticket pasa a `PENDIENTE_APROBACION`.
   - Desde ese momento el cliente los ve con "Acción requerida".
4. **Aprobar** (cliente en la app, `decision_channel = APP`):
   - el presupuesto pasa a `APPROVED`;
   - los demás `BASE` en `RECEIVED` del mismo ticket pasan a `REJECTED` con `auto_rejected = true` y motivo "No seleccionado";
   - el ticket pasa a `APROBADO` (transición de sistema #7);
   - `requires_regularization` pasa a `false`.
5. **Rechazar** (cliente): motivo obligatorio. Si no quedan presupuestos `BASE` enviados y pendientes, el ticket vuelve a `PRESUPUESTO_RECIBIDO` (transición de sistema #8) y el FM decide: pedir otro, postergar o cancelar.
6. **Decisión registrada por el FM:**
   - Canal `EMAIL`, `WHATSAPP`, `PHONE` o `IN_PERSON`.
   - Evidencia obligatoria: archivo adjunto o nota de ≥ 20 caracteres.
   - Mismos efectos que 4 y 5. La auditoría marca `registered_by = FM`.
7. **Adicionales** (`type = ADDITIONAL`):
   - Se crean con el ticket en `APROBADO`, `TRABAJO_COORDINADO`, `EN_EJECUCION` o `FINALIZADO`.
   - Siguen el mismo ciclo, pero **no cambian el estado del ticket**; el cliente ve "Acción requerida".
8. Un presupuesto `APPROVED` es **inmutable**: los cambios de alcance o monto se hacen con un adicional.
9. **Facturas:** número normalizado único por proveedor. Cargar un número existente → 409 con opción de usar la factura existente.
10. **Pagos:**
    - `ADVANCE`, `BALANCE` y `FULL` referencian el presupuesto `BASE` aprobado del ticket, salvo tickets con exención.
    - `ADDITIONAL` exige un presupuesto `ADDITIONAL` aprobado.
    - La moneda del pago = moneda del presupuesto = moneda de la factura.
    - `work_month` por defecto = mes de `sent_at`, editable ("Mes de obra" del Excel).
11. **Duplicados:**
    - Mismo `invoice_id` + `concept` + `amount` → **bloqueo (409)**, salvo `duplicate_override_reason`.
    - Mismo proveedor + monto con `sent_at` a ≤ 7 días y sin factura → advertencia con confirmación.
12. **Sobrepago:** si la suma de pagos supera lo aprobado (base + adicionales) en la misma moneda → advertencia con confirmación, y el ticket muestra "Pagos superan lo aprobado".
13. **Nunca se suman monedas distintas:** los totales siempre se agrupan por moneda.

## Seguridad y permisos

| Tabla / vista | FM | CLIENT |
|---|---|---|
| `budgets` | CRUD (sin `DELETE` de aprobados) | `SELECT` si `submitted_at` no es nulo y `can_access_property`; decide solo vía caso de uso |
| `budget_files` | CRUD | `SELECT` de presupuestos visibles |
| `invoices`, `payments` | CRUD | `SELECT` de tickets accesibles |
| Vistas financieras | `SELECT` | `SELECT` (filtradas por RLS gracias a `security_invoker`) |

La decisión del cliente se valida en dos capas:
1. Caso de uso: el actor es `CLIENT` con acceso a la propiedad y el presupuesto está enviado y `RECEIVED`.
2. RLS: `UPDATE` de `budgets` para `CLIENT` restringido por política a filas accesibles con `submitted_at` no nulo.

## Criterios de aceptación de la fase

- [ ] E2E: el FM carga 2 presupuestos → los envía → el cliente aprueba uno desde el celular → el otro queda "No seleccionado" → el ticket queda en `APROBADO`.
- [ ] El ticket de urgencia de F3 con regularización pendiente se puede cerrar después de aprobarse su presupuesto.
- [ ] Cargar dos veces la factura 26 de Horacio Cetkovich como "Pago total" por ARS 220.000 queda bloqueado.
- [ ] Un `CLIENT` no ve presupuestos no enviados ni datos de otra propiedad en las vistas financieras.
- [ ] Una propiedad en USD y otra en ARS muestran totales separados por moneda.

## Supuestos a validar con el FM

1. **"Fecha enviado"** del Excel = fecha en que la factura se envió al propietario o a la administración para su pago. `paid_at` es opcional.
2. **Adicionales** requieren aprobación del propietario igual que el presupuesto base. En el Excel, el adicional de Melior (ARS 90.750) no tenía presupuesto previo; en la migración se importa como `legacy`.
3. Los trabajos sin costo (Administración, Malba) usan la exención `NO_COST` y no tienen presupuesto.
