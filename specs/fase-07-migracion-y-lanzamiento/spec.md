# Fase 7 — Migración del Excel y lanzamiento

> **Estado:** Propuesta · **Depende de:** Fases 1 a 6 · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Poner Maintix en producción con los datos reales de `TICKETS.xlsx`, **limpios y conciliados**, con seguridad revisada, backups probados, rendimiento medido y un período de operación en paralelo con el FM antes de dejar el Excel.

## Resultado de negocio

- El FM y el propietario arrancan con su historial (mayo 2026 en adelante), sin volver a cargar nada.
- Los errores del Excel se corrigen **con decisión del FM**, no en silencio: duplicados, referencias corridas, montos inconsistentes.
- El riesgo del lanzamiento queda acotado: restauración probada, rollback documentado y monitoreo activo.

## Alcance

1. Importador del Excel:
   - lectura;
   - normalización;
   - mapeo al dominio;
   - reporte de conflictos en seco;
   - archivo de resolución;
   - carga idempotente;
   - conciliación.
2. Revisión de seguridad: chequeo automático de RLS, headers, rate limiting y MFA para FM/ORG_ADMIN.
3. Privacidad y legales: política de privacidad, términos, aviso sobre dictado por voz y retención de datos.
4. Backups: dump semanal externo cifrado, simulacro de restauración y decisión sobre PITR.
5. Rendimiento con dataset sintético ×100 y medición del costo de RLS.
6. PWA instalable con página sin conexión.
7. Alertas y monitoreo.
8. UAT en paralelo con el FM.
9. Runbook de lanzamiento y rollback; salida a producción y acompañamiento posterior.

## Fuera de alcance

- Migrar el repo legacy `tws-facility-app` (depende de F0-T05; si hay datos ahí, se agrega una tarea).
- Modo offline completo con cola de sincronización (F8, si la UAT lo justifica).

## Reglas de importación

**Fuente:** `TICKETS.xlsx`, hojas `TICKETS`, `CONTROL DE GASTOS` y `MAESTRO PREVENTIVOS`. Las hojas `TD TKS` y `TD GASTOS` son tablas dinámicas y se usan **solo para conciliar**. La `Hoja2` (planificación) se usa solo para validar la vista semanal.

> ⚠️ El Excel contiene datos personales y financieros de clientes: **nunca se commitea** (se agrega `*.xlsx` a `.gitignore`). El importador recibe la ruta por parámetro.

### Normalización (diccionario versionado `scripts/import/import-map.yaml`)

| Campo | Ejemplos del Excel | Resultado |
|---|---|---|
| Sitio | `GB`, `Grand bourg` / `Nordelta`, `ND` | propiedad `GB` / `ND` |
| Rubro | `GAS`, `Gas` | Gas |
| Estado | `pendiente`, `Pendiente`, `En ejecucion ` | `PENDIENTE`, `EN_EJECUCION` |
| Prioridad | `Alta `, `Media`, `Baja` | `HIGH`, `MEDIUM`, `LOW` |
| Proveedor | `Sina asignar` | sin proveedor (`NULL`) |
| Proveedor | `Horario Cetkovich`, `Horacio`, `Horacio Cetkovich ` | Horacio Cetkovich |
| Proveedor | `Exepresion Verde`, `Expresion Verde` | Expresion Verde |
| Proveedor | `Hunter Douglas (Paola)`, `Hunter Douglas` | Hunter Douglas (contacto: Paola Rosenfeld) |
| Proveedor | `D-Cano construcciones`, `D-Cano Construcciones` | D-Cano Construcciones |
| Proveedor | `Heber` (tickets) / `Herber` (plan maestro) | **conflicto → lo resuelve el FM** |

### Mapeo al dominio

| Situación en el Excel | Resultado en Maintix |
|---|---|
| Fila de `TICKETS` | Ticket con número nuevo `TK-2026-####` en el orden original; `legacy_ref = "XLS:TICKETS:R{fila}:N{nro}"`; `completed_at` = Fecha cierre |
| `Costo > 0` y `Autorizado = Autorizado` | Presupuesto `BASE` `APPROVED`, `decision_channel = EMAIL`, nota "Importado del Excel" |
| `Costo > 0` y `Autorizado = Pendiente` | Presupuesto `BASE` `RECEIVED` (enviado si el estado es `Pendiente aprobacion`) |
| `Autorizado = Rechazado` | Presupuesto `REJECTED` con Observaciones como motivo |
| `Costo = 0`, Finalizado y Autorizado | Exención `NO_COST` con motivo "Importado: sin costo" (ej.: Administración, Malba, Aldana) |
| `Finalizado` sin autorización y "debe enviar presupuesto y factura" | `is_emergency = true`, `requires_regularization = true` (ej.: termotanques) |
| Fila de `CONTROL DE GASTOS` | Factura (proveedor + N° factura) + pago (Concepto → `ADVANCE`/`BALANCE`/`FULL`/`ADDITIONAL`; `work_month` = Mes de obra; `sent_at` = Fecha enviado) |
| Fila de `MAESTRO PREVENTIVOS` con sitio | Plan con `system_name`, propiedad, proveedor, meses según frecuencia u observaciones; sin meses definidos → plan **inactivo** para completar en UAT |

### Conflictos conocidos (deben aparecer en el reporte en seco)

| # | Conflicto | Resolución propuesta (la decide el FM) |
|---|---|---|
| 1 | Facturas 26 y 27 de Horacio Cetkovich cargadas dos veces (ARS 254.000) | Importar una sola vez |
| 2 | En `CONTROL DE GASTOS` el N° de ticket no coincide con `TICKETS` (ej.: pintura de Otazo figura #6, en TICKETS es #8; "3-4" para cortinas, que son #5 y #6; válvula de descarga figura #18, es #19) | Mapa manual `legacy_ticket_ref` → ticket |
| 3 | Ticket #29: presupuesto ARS 7.920.000 en TICKETS vs. 9.583.200 en gastos | Elegir el monto aprobado; la diferencia se importa como adicional o como corrección |
| 4 | Fechas de cierre anteriores a la fecha coordinada (tickets #10 y #40) | Confirmar la fecha de cierre |
| 5 | Pago "Adicional" de Melior (ARS 90.750) sin presupuesto adicional | Crear presupuesto `ADDITIONAL` `APPROVED` legacy |
| 6 | "Heber" vs. "Herber" | Confirmar si es el mismo proveedor |
| 7 | Grand Bourg no figura en los 6 sitios de la presentación; Malba figura como sitio y como proveedor | Confirmar el listado de propiedades |

## Seguridad (checklist de salida)

- [ ] CI falla si una tabla de `app` no tiene RLS habilitado o no tiene políticas (consulta sobre `pg_class.relrowsecurity` y `pg_policies`).
- [ ] Búsqueda automática de `adminDb` fuera de rutas permitidas = 0.
- [ ] Headers: CSP estricta, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (cámara y micrófono solo `self`).
- [ ] Rate limiting en endpoints de escritura y de emisión de URLs firmadas.
- [ ] MFA TOTP obligatorio para `ORG_ADMIN` y `FACILITY_MANAGER`.
- [ ] Fotos sin EXIF (muestreo de 20 archivos de prod).
- [ ] Secretos rotados antes del lanzamiento; ninguno en el repo ni en logs.
- [ ] Revisión de las respuestas de API como `CLIENT` (contratos) y pentest básico con OWASP ZAP sobre dev.

## Backups y continuidad

| Medida | Detalle |
|---|---|
| Backups diarios Supabase Pro | Incluidos, retención de 7 días |
| Dump semanal externo | `pg_dump` cifrado (clave fuera de GitHub) a almacenamiento de otro proveedor; retención de 12 semanas |
| Simulacro de restauración | Restaurar el último dump en un proyecto temporal y verificar conteos; **obligatorio antes del lanzamiento** y trimestral después |
| PITR (USD 100/mes) | Se decide con el negocio según la pérdida tolerable: sin PITR, hasta 24 h de datos |
| Objetivos | RPO ≤ 24 h (sin PITR) · RTO ≤ 4 h |

## Rendimiento (objetivos con dataset ×100)

Dataset: 5.500 tickets, 11.000 presupuestos, 8.000 pagos, 55.000 adjuntos (metadatos), 3 organizaciones, 20 propiedades.

| Operación | Objetivo p95 |
|---|---|
| Lecturas API (listados, detalle) | < 500 ms |
| Dashboards | < 800 ms |
| Overhead de la transacción RLS por request | < 30 ms |

## Criterios de aceptación de la fase

- [ ] Reporte en seco revisado y archivo de resolución firmado por el FM.
- [ ] Conciliación: conteos por sitio, estado y tipo iguales a `TD TKS`; gasto por proveedor igual a `TD GASTOS` menos los duplicados resueltos, con cada diferencia explicada.
- [ ] Importador re-ejecutado sobre la misma base → 0 cambios.
- [ ] Checklist de seguridad completo.
- [ ] Simulacro de restauración exitoso y documentado.
- [ ] Objetivos de rendimiento cumplidos o desvíos aceptados por escrito.
- [ ] UAT: ≥ 1 semana de operación en paralelo sin bloqueantes abiertos.
- [ ] Lanzamiento: usuarios invitados, Excel pasado a solo lectura y 2 semanas de acompañamiento posterior (hypercare).

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| El FM no tiene tiempo para resolver conflictos | Sesión única de 1 h con el reporte priorizado; valores por defecto propuestos para cada conflicto. |
| Resistencia a dejar el Excel | Operación en paralelo + export CSV de gastos equivalente a la hoja actual (F4-T16). |
| Revisión legal demora el lanzamiento | Iniciar F7-T10 en paralelo con F5/F6. |
