# Propuesta de mejoras para escalabilidad — Maintix

> **Estado:** Propuesta para revisión · **Fecha:** 2026-09-17 · **Actualizada:** 2026-10-05 (alineada con el reporte de arquitectura)
> **Fuentes analizadas:** `Presentacion.pdf` (mayo 2026), `Documento 01.docx`, `docs/03–05` y `CONTRIBUTING`, `TICKETS.xlsx` (operación real de mayo 2026), `Reporte_Arquitectura_Facility_Management_VERSION_REFORMULADA.docx` (octubre 2026)

---

## 1. Resumen ejecutivo

**Propuesta:** construir Maintix como una **plataforma propia sobre Supabase (Postgres) y Next.js**, en lugar de AppSheet + Google Sheets. Primero es una **herramienta interna** del servicio de Facility Management que opera Nicolás (R1); después se abre a clientes piloto (R2). El modelo de datos queda preparado para varios clientes y, eventualmente, para un SaaS, pero **no se construye el SaaS ahora**.

| Dimensión | Impacto |
|---|---|
| **Costo** | ~USD 45/mes de infraestructura al inicio (Supabase Pro USD 25 + Vercel Pro USD 20 por seat). Opcional: PITR USD 100/mes. Crece con fotos (storage/egress), no con tickets. |
| **Tiempo** | 143 tareas atómicas en 8 fases: **≤ 83 días-persona** (suma de máximos). R1 (uso interno) ≤ 71 días; R2 (clientes piloto) ≤ 12 días. Con 1 desarrollador y 25 % de contingencia: **~18 semanas hasta R1** y **~21 hasta R2**; con 2, ~10–12 semanas hasta R1. Ver §7. |
| **Riesgo** | Bajo en tecnología (componentes maduros). Los riesgos principales son de negocio: reglas a validar con el FM (§9), tiempo del FM para la migración y la UAT, y revisión legal. |
| **ROI** | Pasar a SaaS no requiere reescribir. Se elimina el riesgo de fuga de datos entre clientes. Se mide con los KPIs de §8, con línea base tomada en la UAT. |

---

## 2. Situación actual

- La operación vive en `TICKETS.xlsx`: 55 tickets en mayo 2026 (Grand Bourg y Nordelta), ~ARS 34,9 M en pagos, un plan maestro de 21 sistemas casi vacío y una planificación semanal manual.
- **Problemas de escalabilidad detectados en el Excel:**
  1. El N° de ticket es `ROW()-27`: cambia al insertar filas, y `CONTROL DE GASTOS` ya referencia tickets equivocados.
  2. Sin catálogos: 3 variantes del mismo proveedor, "GAS"/"Gas", "Sina asignar" como proveedor.
  3. Gasto duplicado sin control: facturas 26/27 cargadas dos veces (+ARS 254.000).
  4. Montos inconsistentes entre hojas (ticket #29: 7,92 M vs. 9,58 M).
  5. Aprobaciones por mail, sin trazabilidad; trabajos ejecutados sin autorización y sin registro de regularización.
  6. Preventivos: solo 3 de 55 tickets; el plan maestro no dispara nada.
- **Contradicciones en la documentación:** stack (AppSheet vs. PostgreSQL/Prisma), estados (12 vs. 8), permisos del cliente, sitios.

---

## 3. Decisiones tomadas (2026-09-17)

| # | Decisión | Registro |
|---|---|---|
| 1 | SaaS a futuro: modelo multi-empresa desde el día 1, solo TWS al inicio | [ADR-003](adr/ADR-003-multi-tenant.md) |
| 2 | El propietario aprueba presupuestos en la app; el FM puede registrar aprobaciones recibidas por otro canal, con evidencia | [Fase 4](fase-04-presupuestos-y-gastos/spec.md) |
| 3 | PWA instalable (web) para celular y PC; app nativa solo si hace falta (F8) | [Fase 7](fase-07-migracion-y-lanzamiento/spec.md), [Fase 8](fase-08-escala-saas/spec.md) |
| 4 | Monolito modular (Next.js) + API REST propia `/api/v1` | [Fase 0](fase-00-fundaciones/spec.md) |
| 5 | Supabase (Postgres, Auth, Storage) como plataforma de datos | [ADR-001](adr/ADR-001-supabase.md) |
| 6 | Drizzle ORM en lugar de Prisma (RLS efectivo) | [ADR-002](adr/ADR-002-drizzle.md) |
| 7 | Workflow configurable: 12 estados del Excel → 4 visibles para el cliente | [ADR-004](adr/ADR-004-workflow-configurable.md) |

### Ajustes por el reporte de arquitectura (2026-10-05)

| # | Ajuste | Dónde |
|---|---|---|
| 8 | Dos entregas: **R1 uso interno** y **R2 clientes piloto** | [01-entregas-r1-r2.md](01-entregas-r1-r2.md) |
| 9 | El FM que opera el sistema es **Nicolás** | §9, UAT (F7-T15) |
| 10 | Presupuestos con **versiones** e **ítems**; cada versión conserva importe, fecha y detalle | [Fase 4](fase-04-presupuestos-y-gastos/spec.md) |
| 11 | **Aprobación** como registro propio (quién, cuándo, cuánto, canal), también para autorizar urgencias | [Fase 3](fase-03-tickets-y-estados/spec.md), [Fase 4](fase-04-presupuestos-y-gastos/spec.md) |
| 12 | Evidencia de tipo **hallazgo** | [Fase 3](fase-03-tickets-y-estados/spec.md) |
| 13 | Seguimiento de **trabajos postergados** y **informe mensual automático** | [Fase 6](fase-06-dashboards-reportes-notificaciones/spec.md) |
| 14 | **ERD** y **matriz de roles y permisos** antes de programar las tablas | [Fase 0](fase-00-fundaciones/spec.md) |

El reporte valida el resto de las decisiones: Next.js + PWA, Supabase con RLS, modelo preparado para varios clientes sin construir el SaaS, Ticket ≠ Presupuesto ≠ Factura ≠ Pago, 12 estados internos con 4 derivados para el cliente, preventivo → hallazgo → correctivo, urgencias como excepción formal, auditoría y la lista de lo que no se construye en el MVP.

---

## 4. Arquitectura objetivo

```
  PWA Next.js (FM web/mobile + Propietario mobile)
  App nativa (F8, opcional) ─┐
  Integraciones (F8) ────────┼──► /api/v1  (Route Handlers: auth, validación zod, problem+json)
                             │         │
                             │   ┌─────┴──────────────────────────────────────────┐
                             │   │ Módulos de dominio (Clean Architecture)        │
                             │   │ identity · catalog · tickets · finance ·       │
                             │   │ maintenance · reporting · notifications · audit│
                             │   └─────┬───────────────────────┬──────────────────┘
                             │         │ db.rls(ctx) (Drizzle) │ StoragePort / AuthPort / EmailPort
                             │         ▼                       ▼
                             │   Supabase Postgres        Supabase Storage (privado, URLs firmadas)
                             │   (RLS = 2da barrera)      Supabase Auth (MFA para FM)
                             │         ▲
                             └── Vercel Cron ──► runner de jobs (outbox en Postgres):
                                                 preventivos · PDFs · notificaciones · purgas
```

---

## 5. Mejoras de escalabilidad

| # | Problema actual / riesgo futuro | Mejora | Fase |
|---|---|---|---|
| 1 | Pasar a SaaS obligaría a reescribir datos y permisos | `organization_id` + RLS + membresías por rol | F1 |
| 2 | Aislamiento dependiente de que ninguna consulta olvide un filtro | Dos barreras: código + RLS (Drizzle con claims del usuario), suite automática de aislamiento | F1 |
| 3 | IDs que cambian con la posición de la fila | UUID + número legible por organización (`TK-2026-0042`) | F1 |
| 4 | Proveedores y rubros duplicados | Catálogos con nombre normalizado único + detección de similares | F2 |
| 5 | Estados fijos que no coinciden con la operación ni escalan a procesos corporativos | Workflow como datos + guards en código + mapeo a 4 estados de cliente | F3 |
| 6 | Costo de fotos (el verdadero costo variable) y privacidad de ubicación | Compresión en el cliente, eliminación de EXIF/GPS, subida directa a Storage, URLs firmadas cortas | F3 |
| 7 | Aprobación por mail sin trazabilidad | Aprobación en la app, decisiones con canal y evidencia, regularización de urgencias | F4 |
| 8 | Gasto duplicado y montos inconsistentes; monedas mezcladas (AR/UY/US) | Facturas únicas por proveedor, bloqueo de duplicados, importes con moneda, vistas por moneda | F4 |
| 9 | Preventivos dependientes de la memoria del FM | Plan maestro con meses programados + jobs idempotentes + hallazgos → correctivos | F5 |
| 10 | Procesos pesados (PDF, notificaciones) bloqueando requests | Outbox + runner con reintentos y DEAD letter; umbral para cola dedicada | F5 |
| 11 | Sin trazabilidad ni evidencia del valor del servicio | `activity_log` append-only desde F1; dashboards y PDFs (informe mensual, dossier) | F1, F6 |
| 12 | Operación sin red de seguridad | Backups externos + simulacro de restauración, alertas, MFA, revisión de seguridad | F7 |
| 13 | Crecer "a ciegas" | Umbrales de escalado técnico medibles | F8 |

---

## 6. Stack

| Capa | Tecnología | Motivo |
|---|---|---|
| App / API | Next.js (App Router) + TypeScript estricto en Vercel | Un solo código para PWA y API; previews por PR |
| Datos | Supabase Postgres + Drizzle ORM | Postgres estándar, RLS declarativo y versionado |
| Auth | Supabase Auth (`getClaims`, MFA TOTP) | Integrado con RLS; sin registro público |
| Archivos | Supabase Storage (bucket privado) | URLs firmadas; costo bajo por GB |
| Jobs | Tabla `jobs` + Vercel Cron | Sin Redis hasta que el volumen lo justifique |
| Email | Proveedor transaccional (recomendado: Resend, a confirmar en F6-T03) | Plantillas en React |
| PDF | Renderizado server-side (recomendado: `@react-pdf/renderer`, a confirmar en F6-T13) | Sin navegador headless |
| Calidad | Vitest, Playwright, ESLint con límites entre capas, GitHub Actions | Reglas de CONTRIBUTING automatizadas |
| Observabilidad | Logs JSON con `request_id`, Sentry, chequeo de disponibilidad | Diagnóstico desde el día 1 |

---

## 7. Plan por fases

| Fase | Tareas | Esfuerzo máx. (días-persona) | Depende de | Hito |
|---|---|---|---|---|
| [F0 Fundaciones](fase-00-fundaciones/spec.md) | 18 | 7,8 | — | Repo, CI/CD, entornos, docs, ERD y matriz de permisos |
| [F1 Núcleo multi-empresa](fase-01-nucleo-multi-empresa/spec.md) | 18 | 10,2 | F0 | Login, organizaciones, RLS, auditoría |
| [F2 Catálogos](fase-02-catalogos/spec.md) | 15 | 6,5 | F1 | Propiedades, proveedores, rubros |
| [F3 Tickets y estados](fase-03-tickets-y-estados/spec.md) | 22 | 14,0 | F2 | Workflow, fotos, urgencias autorizadas |
| [F4 Presupuestos y gastos](fase-04-presupuestos-y-gastos/spec.md) | 18 | 10,8 | F3 | Versiones, aprobaciones y pagos |
| [F5 Preventivos y hallazgos](fase-05-preventivos-y-hallazgos/spec.md) | 16 | 8,8 | F3 | Plan maestro automático |
| [F6 Dashboards, reportes, notificaciones](fase-06-dashboards-reportes-notificaciones/spec.md) | 18 | 12,2 | F4, F5 | Dashboard FM (R1); vista y reportes del cliente (R2) |
| [F7 Migración y lanzamiento](fase-07-migracion-y-lanzamiento/spec.md) | 18 | 12,8 | F1–F6 | **R1 en producción** y apertura a pilotos (R2) |
| [F8 Escala SaaS](fase-08-escala-saas/spec.md) | — | — | R2 + métricas | Evaluar producto independiente |
| **Total MVP** | **143** | **≤ 83,0** | | |

| Entrega | Tareas | Esfuerzo máx. | Calendario con 1 desarrollador (+25 %) | Con 2 desarrolladores |
|---|---|---|---|---|
| **R1 — Uso interno** | 126 | ≤ 71,2 días | ~18 semanas | ~10–12 semanas |
| **R2 — Clientes piloto** | 17 | ≤ 11,8 días | +~3 semanas | +~2 semanas |

Detalle de qué tarea va en cada entrega: [01-entregas-r1-r2.md](01-entregas-r1-r2.md).

**Cómo leer la estimación:**
- **Esfuerzo máximo:** suma del tope de cada tarea (S = 2 h, M = 4 h, L = 8 h). Es la cota superior del trabajo de desarrollo.
- **Contingencia de 25 %:** revisiones, retrabajo e imprevistos.
- **Con 2 desarrolladores:** backend/dominio y UI en paralelo desde F2; F4 y F5 en paralelo después de F3.
- **Tiempo calendario que no es desarrollo:** UAT interna (≥ 1 semana), acompañamiento posterior a R1 (2 semanas), piloto con clientes (3 semanas) y revisión legal (iniciarla durante R1, porque bloquea R2).
- **Nota de transparencia:** la primera estimación conversada fue ~12 semanas; al detallar las tareas resultó ~20. Con los cambios del reporte se suman 5 tareas (≈ +3 días). Separar R1 y R2 **no reduce el trabajo total**: permite salir antes con la operación interna (~12 días menos que el MVP completo) y decidir la apertura a clientes con datos reales.

**Camino crítico de R1:** F0 → F1 → F2 → F3 → F4 → F6 (parte FM) → F7. F5 corre en paralelo a F4.

---

## 8. KPIs de éxito del MVP

Objetivo del MVP según el Documento 01: validar que el FM obtiene suficiente valor como para adoptar la plataforma. La línea base se toma durante la UAT (F7-T15).

| KPI | Cómo se mide | Meta a 3 meses |
|---|---|---|
| Adopción del FM | Tickets creados en Maintix / tickets totales | 100 % (Excel en solo lectura) |
| Aprobación en la app | Decisiones con `channel = APP` / decisiones totales | ≥ 70 % |
| Tiempo presupuesto → decisión | Mediana de `decided_at − submitted_at` | Reducir vs. línea base |
| Cumplimiento preventivo | Ocurrencias `DONE` / vencidas en el mes | ≥ 90 % |
| Urgencias regularizadas | Tickets con `requires_regularization` > 7 días | 0 |
| Uso del propietario | Propietarios con ≥ 1 sesión por semana | ≥ 1 por propiedad activa |
| Calidad del gasto | Pagos duplicados bloqueados o corregidos | 0 duplicados en reportes |

---

## 9. Supuestos a validar con Nicolás (FM) (consolidado)

| # | Supuesto | Fase | Si resulta falso… |
|---|---|---|---|
| 1 | Mapeo de los 12 estados a 4 para el cliente (tabla en F3) y Cancelado visible solo en el historial | F3 | Cambia la carga inicial (configuración, sin código) |
| 2 | "Finalizado" = trabajo terminado; "Cerrado" = cierre administrativo (pagos y evidencia completos) | F3 | Ajuste de guards de cierre |
| 3 | Las urgencias se ejecutan sin presupuesto aprobado y se regularizan después | F3/F4 | Se elimina la ruta de urgencia (transiciones 10 y 11) |
| 4 | Los adicionales requieren aprobación del propietario | F4 | Se permite que el FM los apruebe (configuración de rol) |
| 5 | "Fecha enviado" = factura enviada al propietario o la administración para su pago | F4 | Renombrar campo y ajustar reportes |
| 6 | Malba es proveedor/colaborador, no propiedad; el listado real de propiedades incluye Grand Bourg | F2/F7 | Ajuste de datos de carga |
| 7 | Preventivos con proveedor fijo cubiertos por abono (sin presupuesto por visita) | F5 | `budget_policy = REQUIRED` por plan |
| 8 | Semáforo del propietario: rojo/amarillo/verde según la regla de F6 | F6 | Cambiar la función `propertyHealth` |
| 9 | El propietario ve montos, facturas y pagos (es quien paga) | F4/F6 | Ocultar sección financiera por configuración de organización |

---

## 10. Bloqueantes externos

| Bloqueante | Tarea | Responsable sugerido |
|---|---|---|
| Aprobación de gasto de infraestructura | F0-T11 | Titular de la cuenta / dirección |
| Acceso al repo legacy `tws-facility-app` | F0-T05 | Titular del repo legacy |
| Acceso al DNS del dominio para emails | F6-T03 | Responsable del dominio |
| Sesión de resolución de conflictos del Excel | F7-T05 | Nicolás |
| Revisión legal de privacidad y términos | F7-T10 | Asesoría legal |
| UAT interna con el FM | F7-T15 | Nicolás |
| Propietarios para el piloto | F7-T18 | Nicolás |

---

## 11. Próximos pasos

1. Revisar esta propuesta y los ADR (F0-T01).
2. Validar los supuestos de §9 con Nicolás (1 reunión de ~1 h).
3. Definir el equipo (1 o 2 desarrolladores) para fijar el calendario.
4. Fase 0: las tareas sin bloqueantes ya están en marcha (scaffold, calidad, testing, Supabase local, Drizzle, sistema de diseño).
