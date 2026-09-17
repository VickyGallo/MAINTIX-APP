# Fase 6 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.
> **Regla transversal:** cada tabla nueva agrega su caso en la suite de aislamiento (F1-T16) dentro de la misma tarea.

---

### F6-T01 · Tablas de notificaciones + RLS
- **Depende de:** F5-T01
- **Qué:** crear `notifications`, `notification_preferences` y `push_subscriptions` con índices y políticas (cada usuario, solo lo propio).
- **Criterios de aceptación:**
  - [ ] Un usuario no lee ni marca notificaciones de otro, aun dentro de la misma organización.
- **Tests:** integración + aislamiento.
- **Tamaño:** M

### F6-T02 · Distribución de eventos a destinatarios
- **Depende de:** F6-T01, F5-T02
- **Qué:** handler de eventos de dominio que resuelve destinatarios según el catálogo de la spec, aplica preferencias (con valores por defecto si no hay fila), crea las `notifications` in-app y encola `deliver-email` y `deliver-push` con idempotencia (evento, usuario, canal).
- **Criterios de aceptación:**
  - [ ] `ticket.client_state_changed` solo se emite si cambió el `client_state` (no por cambios internos).
  - [ ] Reprocesar el mismo evento no duplica notificaciones.
- **Tests:** unit del resolvedor de destinatarios (tabla por evento); integración.
- **Tamaño:** L

### F6-T03 · Canal email
- **Depende de:** F6-T02
- **Qué:**
  - Adaptador `EmailPort` con proveedor transaccional (recomendado: Resend; confirmar precios y límites vigentes y registrarlo en ADR-001).
  - Dominio remitente con SPF, DKIM y DMARC.
  - Layout base de email en español (es-AR) y handler `deliver-email`.
  - Verificar el SDK vigente con context7.
- **Criterios de aceptación:**
  - [ ] En dev/local los emails van a un sandbox (nunca a destinatarios reales).
  - [ ] Los rebotes permanentes marcan al usuario para revisión (log + in-app para ORG_ADMIN).
- **Tests:** unit del adaptador con mock; envío real verificado en dev a una casilla de prueba.
- **Tamaño:** M
- **Bloqueante externo:** acceso al DNS del dominio.

### F6-T04 · Plantillas de email por evento
- **Depende de:** F6-T03
- **Qué:** una plantilla por evento del catálogo (texto claro, un solo botón a la acción, sin datos internos).
- **Criterios de aceptación:**
  - [ ] Vista previa de todas las plantillas en `/dev/emails` (fuera de prod).
  - [ ] Se ven bien en modo oscuro de Gmail e iOS Mail.
- **Tests:** snapshot de render por plantilla.
- **Tamaño:** M

### F6-T05 · Canal Web Push
- **Depende de:** F6-T02
- **Qué:**
  - Claves VAPID por entorno y handler `push` en el service worker.
  - `POST/DELETE /push-subscriptions` y handler `deliver-push`, que borra la suscripción ante 404/410.
  - UI "Activar notificaciones" con explicación para iOS (instalar la PWA).
- **Criterios de aceptación:**
  - [ ] Push recibido en Android Chrome y en iOS Safari con la PWA instalada (prueba manual documentada).
  - [ ] Clic en la notificación abre `link_path`.
- **Tests:** unit del handler de entrega (mock de web-push); prueba manual en dispositivos.
- **Tamaño:** L

### F6-T06 · Bandeja in-app
- **Depende de:** F6-T01
- **Qué:** `GET /notifications` (paginado), `POST /notifications/{id}/read`, `POST /notifications/read-all`, y campana con contador en la estructura de navegación (FM y cliente).
- **Criterios de aceptación:**
  - [ ] El contador se actualiza al navegar (sin realtime en el MVP).
  - [ ] Clic en la notificación → navega y marca como leída.
- **Tests:** integración + E2E básico.
- **Tamaño:** M

### F6-T07 · Preferencias de notificación
- **Depende de:** F6-T02
- **Qué:** pantalla en el perfil con matriz evento × canal (solo los eventos que aplican al rol) y endpoints `GET/PUT /notification-preferences`.
- **Criterios de aceptación:**
  - [ ] Desactivar email de `budget.submitted` corta ese envío (test).
- **Tests:** integración + E2E.
- **Tamaño:** S

### F6-T08 · Recordatorios de aprobación y resumen diario del FM
- **Depende de:** F6-T03, F5-T03
- **Qué:** job horario `budget-reminders` (48 h, máximo 3) y job `fm-daily-digest` (07:00 en la zona horaria de la organización; no se envía si no hay contenido).
- **Criterios de aceptación:**
  - [ ] Un presupuesto decidido no recibe más recordatorios.
  - [ ] El resumen no se envía dos veces el mismo día.
- **Tests:** integración con reloj simulado.
- **Tamaño:** M

### F6-T09 · API del dashboard FM
- **Depende de:** F4-T11, F5-T10
- **Qué:** `GET /dashboard/fm?property=` con los indicadores de la spec, consultas agregadas con índices de soporte.
- **Criterios de aceptación:**
  - [ ] p95 < 800 ms con el dataset sintético ×100 (validado en F7-T12).
  - [ ] Los montos siempre se agrupan por moneda.
- **Tests:** integración con dataset que valida cada indicador contra un cálculo esperado.
- **Tamaño:** L

### F6-T10 · UI del dashboard FM
- **Depende de:** F6-T09, F0-T16
- **Qué:** tarjetas KPI, listas accionables (cada indicador lleva a la bandeja filtrada) y actividad reciente.
- **Criterios de aceptación:**
  - [ ] Cada tarjeta enlaza a la vista con el filtro equivalente (URL compartible).
  - [ ] Estados vacíos y de error.
- **Tests:** E2E: clic en "Sin proveedor" → bandeja filtrada.
- **Tamaño:** M

### F6-T11 · API del dashboard del propietario
- **Depende de:** F4-T11, F5-T10
- **Qué:** `GET /dashboard/client` con los bloques de la spec y la función de dominio `propertyHealth(...)` para el semáforo.
- **Criterios de aceptación:**
  - [ ] Test de contrato sin datos internos.
  - [ ] El semáforo cubre las 3 condiciones.
- **Tests:** unit de `propertyHealth`; integración como `CLIENT`.
- **Tamaño:** M

### F6-T12 · UI del dashboard del propietario
- **Depende de:** F6-T11, F4-T17
- **Qué:** inicio mobile: selector de propiedad (si hay más de una), semáforo, "Acción requerida" destacada, trabajos en curso, próximos mantenimientos, gasto acumulado, últimos trabajos con foto y reportes.
- **Criterios de aceptación:**
  - [ ] Lighthouse mobile: Performance ≥ 85 y Accesibilidad ≥ 95.
  - [ ] Carga en < 2 s con 4G simulado.
- **Tests:** E2E mobile + Lighthouse CI.
- **Tamaño:** L

### F6-T13 · Motor de reportes PDF
- **Depende de:** F5-T02, F3-T11
- **Qué:**
  - Tabla `reports` con RLS y `POST /reports` (FM) que encola `render-report`.
  - El handler renderiza con la librería elegida (verificar con context7 que funciona en Vercel Functions), obtiene imágenes vía `StoragePort`, sube el PDF y marca `READY` o `FAILED`.
  - Endpoint de estado y descarga firmada.
- **Criterios de aceptación:**
  - [ ] PDF de prueba con 24 fotos < 15 MB y < 60 s.
  - [ ] Un fallo deja `FAILED` con el error y se puede reintentar.
- **Tests:** integración con plantilla mínima.
- **Tamaño:** L

### F6-T14 · Plantilla: informe mensual
- **Depende de:** F6-T13
- **Qué:** implementar las secciones 1 a 6 del informe mensual, con el query de datos separado de la plantilla (función `buildMonthlyReportData`).
- **Criterios de aceptación:**
  - [ ] Excluye adjuntos no visibles para el cliente y datos internos.
  - [ ] Montos por moneda con formato es-AR.
- **Tests:** unit de `buildMonthlyReportData` con fixture; snapshot visual del PDF (primera página).
- **Tamaño:** L

### F6-T15 · Plantilla: Dossier de Mejora
- **Depende de:** F6-T13
- **Qué:** implementar las secciones 1 a 7 del dossier (`buildImprovementDossierData`). Solo para tickets `IMPROVEMENT`.
- **Criterios de aceptación:**
  - [ ] Un ticket que no es `IMPROVEMENT` → 422.
  - [ ] Los pares antes/después se agrupan por caption o por orden de carga.
- **Tests:** unit de datos + snapshot visual.
- **Tamaño:** L

### F6-T16 · UI de reportes (FM y cliente)
- **Depende de:** F6-T14, F6-T15
- **Qué:**
  - FM: generar (propiedad + mes, o desde el ticket de mejora), ver estado, previsualizar, publicar al cliente y listar historial.
  - Cliente: lista de publicados y descarga o compartir.
- **Criterios de aceptación:**
  - [ ] Publicar emite `report.published`.
  - [ ] El cliente no ve reportes sin publicar.
- **Tests:** E2E: generar → publicar → el cliente descarga.
- **Tamaño:** M

### F6-T17 · E2E de notificaciones y reportes
- **Depende de:** F6-T05, F6-T06, F6-T16
- **Qué:** el FM envía un presupuesto → el cliente recibe la notificación in-app y el email en sandbox → aprueba → el FM recibe `budget.decided` → el FM genera y publica el informe mensual → el cliente lo descarga.
- **Criterios de aceptación:**
  - [ ] Corre en CI con el runner de jobs invocado por el test.
- **Tests:** el E2E.
- **Tamaño:** M
