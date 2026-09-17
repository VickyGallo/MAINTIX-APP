# Fase 8 — Escala SaaS (post-MVP)

> **Estado:** Visión · **Depende de:** Fase 7 en producción + métricas de uso
> **Sin tareas atómicas a propósito:** cada iniciativa se detalla en su propia spec cuando haya evidencia de que se necesita (YAGNI).

## Objetivo

Convertir Maintix de "la herramienta de TWS" en un **SaaS para empresas de Facility Management**, sin reescribir el núcleo. Las decisiones de F0–F7 (multi-empresa, workflow configurable, API First) existen para que esta fase sea sobre todo producto y comercialización.

## Criterios para iniciar la fase

Se inicia cuando se cumplan **al menos 2** de estas condiciones:

1. TWS usa Maintix como herramienta principal durante ≥ 3 meses (Excel abandonado).
2. ≥ 80 % de las aprobaciones de presupuesto se hacen en la app (no registradas por el FM).
3. Existe al menos una segunda empresa de FM interesada (carta de intención o piloto).
4. El costo de operación por organización está medido y es menor al precio objetivo.

## Iniciativas (priorizadas)

| # | Iniciativa | Valor | Prerrequisito técnico ya resuelto | Complejidad |
|---|---|---|---|---|
| 1 | **Alta de organizaciones self-service** | Vender sin intervención manual | Multi-empresa, cargas iniciales por organización (estados, rubros) | Media |
| 2 | **Planes y cobro** | Ingresos recurrentes | `organizations.status` | Media — evaluar Mercado Pago (ARS) y Stripe (USD) |
| 3 | **Límites y medición por plan** | Margen controlado | Storage por ruta de organización, `activity_log` | Baja |
| 4 | **UI de configuración de workflow** | Adaptarse a procesos de cada empresa | [ADR-004](../adr/ADR-004-workflow-configurable.md) | Media |
| 5 | **Múltiples aprobadores / aprobación por monto / finanzas** | Clientes corporativos | Workflow configurable + guards | Media |
| 6 | **Portal de proveedores** | Menos coordinación manual; fotos cargadas por quien ejecuta | Rol `PROVIDER` reservado | Media |
| 7 | **WhatsApp Business (notificaciones con plantillas)** | Canal preferido en LATAM | Distribución de eventos a destinatarios (F6) | Media — costo por conversación |
| 8 | **Control de contratos** | Auditar facturación contra el alcance pactado (presentación) | Planes preventivos + pagos | Media |
| 9 | **IA: clasificación de solicitudes** | Menos triage del FM | Historial de tickets clasificados | Baja/Media |
| 10 | **OCR de facturas** | Menos carga manual de pagos | `invoices` + Storage | Media |
| 11 | **App nativa (Expo / React Native)** | Offline real, cámara avanzada | `/api/v1` + OpenAPI + Bearer tokens | Alta — solo si la UAT/uso muestra que la PWA no alcanza |
| 12 | **Firma digital de reportes y aprobaciones** | Validez formal | Reportes inmutables publicados | Media |
| 13 | **Integración con ERPs** | Clientes corporativos | API First | Alta |
| 14 | **IoT / mantenimiento predictivo** | Diferencial frente a Fracttal | Activos + preventivos | Alta |

## Umbrales de escalado técnico

La arquitectura del MVP (monolito modular + Supabase) aguanta mucho más que el volumen actual. Estos umbrales indican **cuándo** cambiar algo, con evidencia:

| Señal | Umbral | Acción |
|---|---|---|
| Uso de CPU/RAM de la base | > 70 % sostenido 7 días | Subir el compute de Supabase (cambio de plan, sin código) |
| Tamaño de la base | > 70 % de 8 GB | Revisar `activity_log` (particionar por mes o archivar > 12 meses) |
| Storage / egress | > 70 % de lo incluido | Revisar políticas de retención de video y resolución de originales |
| Backlog de jobs | > 15 min sostenido | Cola dedicada (por ejemplo, Vercel Queues) o worker separado |
| Renderizado de PDF | > 60 s p95 o timeouts | Extraer `reporting` a un servicio dedicado |
| Latencia de API | p95 > 500 ms sostenido | Perfilar; réplicas de lectura para dashboards |
| Organizaciones activas | > 50 | Revisar costo de RLS, índices por `organization_id`, límites por plan |
| Cliente enterprise con requisitos de aislamiento físico | Pedido contractual | Evaluar proyecto Supabase dedicado para ese cliente (mismo código) |

## Riesgos de la fase

| Riesgo | Mitigación |
|---|---|
| Construir features SaaS antes de validar la demanda | Criterios para iniciar la fase (arriba) |
| Personalizaciones por cliente que fragmentan el producto | Solo configuración (workflow, rubros, plantillas); nunca forks de código |
| Costos de WhatsApp o IA sin control | Medición por organización (iniciativa 3) antes de habilitarlos |
