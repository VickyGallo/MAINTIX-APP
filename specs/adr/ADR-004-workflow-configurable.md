# ADR-004 — Workflow de tickets configurable (estados como datos)

- **Estado:** Propuesto (se acepta en F0-T01)
- **Fecha:** 2026-09-17
- **Modifica:** `docs/03_Domain_Model` y `docs/04_Data_Model` (8 estados fijos de Solicitud)

## Contexto

Hay tres fuentes con estados distintos:

| Fuente | Estados |
|---|---|
| Presentación | 12 estados técnicos internos → 4 visibles para el cliente |
| `TICKETS.xlsx` (operación real, mayo 2026) | 12: Pendiente, Relevo coordinado, Relevado, Presupuesto solicitado, Presupuesto recibido, Pendiente aprobación, Aprobado, Trabajo coordinado, En ejecución, Finalizado, Cerrado, Postergado. Columna aparte "Autorizado" (Pendiente/Autorizado/Rechazado) |
| Docs 03/04 | 8: Nueva, En revisión, Cotizando, Pendiente de aprobación, Aprobada, En ejecución, Finalizada, Cancelada |

Además, la escalabilidad a empresas grandes requiere pasos extra como "Aprobación de finanzas" o "Gestión de pagos", según la presentación.

## Decisión

1. Los **estados y las transiciones son datos por organización**:
   - `workflow_states`: `key`, etiqueta, `client_state`, inicial/terminal, orden.
   - `workflow_transitions`: `from`, `to`, roles permitidos, motivo obligatorio, `guard_keys`.
2. Las **condiciones (guards) son código**, identificadas por clave (`PROVIDER_ASSIGNED`, `SCHEDULED_DATE_SET`, `HAS_RECEIVED_BUDGET`, etc.). La configuración solo puede combinar guards existentes; no puede ejecutar lógica arbitraria.
3. Los reportes, dashboards y reglas usan `key` y `client_state`, **nunca la etiqueta**.
4. **Carga inicial:** los 12 estados del Excel + `CANCELADO`. Detalle y mapeo al cliente en [fase-03/spec.md](../fase-03-tickets-y-estados/spec.md).
5. **Estados visibles para el cliente:** `PENDIENTE`, `PRESUPUESTO_EN_REVISION`, `COORDINADO`, `FINALIZADO`, más `CANCELADO` (solo en el historial). La necesidad de que el propietario apruebe se muestra como **"Acción requerida"**, no como un estado aparte.
6. **Estados reservados:** `APROBADO` solo se alcanza mediante el caso de uso de aprobación de presupuesto (F4), no con una transición manual.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Enum fijo de 8 estados (docs) | No coincide con la operación real; cada cambio requiere migración y deploy. |
| Enum fijo de 12 estados (Excel) | Coincide hoy, pero no escala a organizaciones con procesos distintos. |
| Motor BPM genérico | Sobredimensionado; guards arbitrarios configurables son un riesgo de seguridad y de soporte. |

## Consecuencias

- ✅ Resuelve la contradicción 12 vs 8 respetando la operación real.
- ✅ Nuevos pasos (finanzas, pagos) se agregan por configuración.
- ⚠️ La UI debe mostrar las acciones disponibles según las transiciones válidas, no con botones fijos.
- ⚠️ Más casos de test: la máquina de estados debe tener cobertura completa (F3-T02).
- ⚠️ En el MVP, la edición de estados por `ORG_ADMIN` queda **fuera de la UI**: se configura por seed/migración. La UI de configuración se hace en F8.
