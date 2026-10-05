# Fase 3 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.
> **Regla transversal:** cada tabla nueva agrega su caso en la suite de aislamiento (F1-T16) dentro de la misma tarea.

---

### F3-T01 · Tablas de workflow + carga inicial por organización
- **Depende de:** F1-T03
- **Qué:** crear `workflow_states` y `workflow_transitions` (RLS: FM lee; escritura solo vía seed/migración) y la función `seed_workflow(org)` con los 13 estados y las 18 transiciones de la spec, invocada al crear una organización.
- **Criterios de aceptación:**
  - [ ] La carga es idempotente.
  - [ ] Hay exactamente un estado `is_initial` por organización (restricción única parcial).
  - [ ] `CLIENT` puede leer `workflow_states` (necesario para etiquetas), no las transiciones.
- **Tests:** integración de la carga + aislamiento.
- **Tamaño:** M

### F3-T02 · Máquina de estados de dominio
- **Depende de:** —
- **Qué:**
  - Módulo puro `tickets/domain/workflow`: `availableTransitions(ticket, actor, config, guardContext)` y `assertTransition(...)`.
  - Guards como funciones registradas por clave.
  - Puerto `BudgetReadPort.hasReceivedBudget()` (stub que devuelve `false` hasta F4).
- **Criterios de aceptación:**
  - [ ] 100 % de cobertura de ramas.
  - [ ] Un guard desconocido en la configuración lanza error de configuración (no se ignora).
  - [ ] Las transiciones `SYSTEM_ONLY` nunca están disponibles para un actor usuario.
- **Tests:** unit con tabla de casos (18 transiciones × roles × guards).
- **Tamaño:** L

### F3-T03 · Tabla `tickets` + RLS
- **Depende de:** F3-T01, F2-T06, F2-T07
- **Qué:** crear la tabla, índices, enums y políticas según la spec, y completar la política de `providers` para `CLIENT` (proveedores asignados a tickets accesibles).
- **Criterios de aceptación:**
  - [ ] `CLIENT` no puede insertar con `origin ≠ CLIENT` ni con `requested_by_user_id` ajeno.
  - [ ] `CLIENT` no puede hacer `UPDATE` directo.
  - [ ] `CLIENT` ve el proveedor asignado a su ticket, pero no a otros proveedores.
- **Tests:** integración por rol + aislamiento.
- **Tamaño:** M

### F3-T04 · Tablas `ticket_internal_notes` y `ticket_state_history`
- **Depende de:** F3-T03
- **Qué:** crear ambas tablas; notas solo FM; historial legible por CLIENT si `can_access_property` (el DTO filtra).
- **Criterios de aceptación:**
  - [ ] `CLIENT` recibe 0 filas de `ticket_internal_notes` aun conectándose directo.
- **Tests:** integración + aislamiento.
- **Tamaño:** S

### F3-T05 · Caso de uso `createTicket` (FM)
- **Depende de:** F3-T02, F3-T04, F1-T15, F1-T14
- **Qué:** crear un ticket con número, estado inicial, clasificación opcional y alta implícita de ambiente (`findOrCreateLocation`). Escribe historial inicial + auditoría y emite el evento `ticket.created`.
- **Criterios de aceptación:**
  - [ ] Ambiente, activo, proveedor y rubro deben pertenecer a la misma organización y propiedad → si no, error de dominio.
  - [ ] Evento emitido en la misma transacción (registro en outbox en F5; en F3, interfaz `DomainEvents`).
- **Tests:** unit del caso de uso con repositorios en memoria; integración.
- **Tamaño:** M

### F3-T06 · Casos de uso del cliente: solicitar y cancelar
- **Depende de:** F3-T05
- **Qué:** `createClientRequest(propertyId, description, urgent, attachments[])` con los valores por defecto de la regla 2, y `cancelOwnRequest(ticketId, reason)` (solo en `PENDIENTE`).
- **Criterios de aceptación:**
  - [ ] El cliente no puede fijar tipo, proveedor, fechas ni estado.
  - [ ] Cancelar en otro estado → 409 con mensaje claro.
- **Tests:** unit + integración como `CLIENT`.
- **Tamaño:** M

### F3-T07 · Casos de uso de estado: transicionar, postergar/reanudar, urgencia
- **Depende de:** F3-T05, F3-T22
- **Qué:**
  - `transitionTicket(id, toKey, reason?)`: valida con dominio, maneja timestamps, `requires_regularization`, historial, auditoría y evento `ticket.state_changed`.
  - `resumeTicket(id)`.
  - `markEmergency(id, { reason, authorizedBy, channel, evidence })`, que crea la aprobación `EMERGENCY_WORK`, y `setBudgetExemption(id, type, reason)`.
  - `GET available-transitions` calculado en servidor.
- **Criterios de aceptación:**
  - [ ] Se cumplen las reglas 3 a 7 de la spec.
  - [ ] Dos transiciones concurrentes sobre el mismo ticket → una falla con 409 (bloqueo optimista por `updated_at` o `SELECT … FOR UPDATE`).
- **Tests:** unit + integración, incluido el caso concurrente.
- **Tamaño:** L

### F3-T08 · Caso de uso `updateTicket` (clasificación y coordinación)
- **Depende de:** F3-T05
- **Qué:** editar tipo, rubro, prioridad, título, descripción, ambiente, activo, proveedor/contacto y fechas coordinadas, con auditoría del diff.
- **Criterios de aceptación:**
  - [ ] `scheduled_end_date ≥ scheduled_start_date`.
  - [ ] El contacto debe pertenecer al proveedor elegido.
  - [ ] No se edita un ticket `CERRADO` ni `CANCELADO`.
- **Tests:** unit + integración.
- **Tamaño:** M

### F3-T09 · API v1 de tickets con DTOs por rol
- **Depende de:** F3-T06, F3-T07, F3-T08, F1-T12
- **Qué:**
  - `GET /tickets` (filtros: estado, `client_state`, propiedad, proveedor, tipo, prioridad, `sin_proveedor`, `requires_regularization`, texto).
  - `GET /tickets/{id}`, `POST /tickets` (FM), `POST /client-requests` (CLIENT, con `Idempotency-Key`), `PATCH /tickets/{id}`.
  - `POST /tickets/{id}/transitions`, `POST /tickets/{id}/resume`, `POST /tickets/{id}/emergency`, `GET /tickets/{id}/available-transitions`, `GET /tickets/{id}/history`.
  - Notas: `GET/POST /tickets/{id}/notes` (FM).
  - DTOs FM y cliente según la tabla de la spec.
- **Criterios de aceptación:**
  - [ ] Test de contrato: la respuesta a `CLIENT` no contiene claves prohibidas (`internal_*`, `provider_contact`, `state.key`, `requires_regularization`).
  - [ ] Historial del cliente con estados consecutivos fusionados.
- **Tests:** integración por rol + contrato.
- **Tamaño:** L

### F3-T10 · Tablas `files`, `ticket_attachments` y bucket privado
- **Depende de:** F3-T03
- **Qué:** crear las tablas, el bucket `org-files` privado (vía migración/config) y verificar que `storage.objects` no tiene políticas para `anon`/`authenticated`.
- **Criterios de aceptación:**
  - [ ] Un usuario autenticado no puede listar ni descargar objetos con su JWT directamente contra Storage.
  - [ ] `CLIENT` solo ve adjuntos `visible_to_client` de tickets accesibles (RLS).
- **Tests:** integración de Storage (denegado) + RLS + aislamiento.
- **Tamaño:** M

### F3-T11 · `StoragePort` y flujo de subida firmada
- **Depende de:** F3-T10, F3-T09
- **Qué:**
  - Adaptador Supabase Storage (clave secreta solo en `infrastructure`).
  - `POST /tickets/{id}/attachments/uploads`: valida acceso con `db.rls`, mime y tamaño, crea `files` en `PENDING` y devuelve una URL firmada (`createSignedUploadUrl`).
  - `POST /attachments/{fileId}/confirm`: verifica que el objeto existe y que tamaño y mime coinciden → `READY` + `ticket_attachments`.
  - Verificar la API vigente con context7.
- **Criterios de aceptación:**
  - [ ] Mime o tamaño fuera de límites → 422 antes de emitir la URL.
  - [ ] Confirmar un archivo que no se subió → 409.
  - [ ] Archivos `PENDING` de más de 24 h se marcan `REJECTED` y se borran (job en F5; query documentada).
- **Tests:** integración contra Supabase local.
- **Tamaño:** L

### F3-T12 · Compresión de fotos, miniaturas y eliminación de EXIF (cliente)
- **Depende de:** F0-T16
- **Qué:** utilidad de navegador `prepareImage(file)`: decodifica, redimensiona a 2048 px (lado mayor) y genera una miniatura de 400 px, re-codifica (JPEG/WebP, calidad 0,8) y calcula SHA-256. Probar en un iPhone real que la selección desde galería llega en un formato aceptado.
- **Criterios de aceptación:**
  - [ ] La salida no contiene metadatos EXIF (test con imagen que tiene GPS).
  - [ ] Una foto típica de 4 MB queda en ≤ 1 MB.
  - [ ] Si el navegador no puede decodificar la imagen, se informa al usuario (no se sube sin procesar).
- **Tests:** unit en navegador (Vitest browser mode o Playwright component) con imágenes fixture.
- **Tamaño:** M

### F3-T13 · Descarga firmada y gestión de adjuntos
- **Depende de:** F3-T11
- **Qué:**
  - `GET /tickets/{id}/attachments`: lista con URLs firmadas de 10 min (miniatura + original bajo demanda).
  - `PATCH /attachments/{id}` (fase, caption, visibilidad; FM).
  - `DELETE /attachments/{id}` (FM, soft delete + borrado del objeto por job).
- **Criterios de aceptación:**
  - [ ] Un `CLIENT` no obtiene URL de un adjunto oculto ni de otra propiedad (403).
  - [ ] Las URLs no se cachean en respuestas compartidas (`Cache-Control: private, no-store`).
- **Tests:** integración por rol.
- **Tamaño:** M

### F3-T14 · Componente de dictado por voz
- **Depende de:** F0-T16
- **Qué:** `<VoiceInput>` sobre `SpeechRecognition`/`webkitSpeechRecognition` (`es-AR`, resultados parciales, botón grabar/detener). Si no hay soporte: oculta el botón y muestra la ayuda "usá el micrófono de tu teclado".
- **Criterios de aceptación:**
  - [ ] Nunca bloquea la escritura manual; el texto dictado es editable.
  - [ ] Muestra permiso denegado con un mensaje claro.
- **Tests:** unit con mock de `SpeechRecognition`; prueba manual documentada en Android Chrome e iOS Safari.
- **Tamaño:** M

### F3-T15 · UI Cliente: nueva solicitud (mobile)
- **Depende de:** F3-T09, F3-T11, F3-T12, F3-T14
- **Qué:** flujo "botón de servicio" en ≤ 3 pantallas:
  1. Propiedad (se saltea si hay una sola).
  2. Descripción (texto/voz) + "Urgente".
  3. Fotos (cámara o galería, con progreso por archivo) → enviar → confirmación con número de ticket.

  Borrador guardado localmente si se pierde la conexión.
- **Criterios de aceptación:**
  - [ ] Reintento por foto fallida sin perder las ya subidas.
  - [ ] Doble tap en "Enviar" no crea 2 tickets (`Idempotency-Key`).
- **Tests:** E2E Playwright con viewport mobile.
- **Tamaño:** L

### F3-T16 · UI Cliente: mis solicitudes
- **Depende de:** F3-T09, F3-T13
- **Qué:** lista agrupada por los 4 estados de cliente, con badge "Acción requerida", y detalle con línea de tiempo simplificada, proveedor, fechas y galería "antes / después".
- **Criterios de aceptación:**
  - [ ] Ningún término interno visible (verificado con test de texto: sin "Relevado", "Trabajo coordinado", etc.).
  - [ ] Estados vacíos amigables.
- **Tests:** E2E como `CLIENT`.
- **Tamaño:** M

### F3-T17 · UI FM: bandeja de tickets
- **Depende de:** F3-T09
- **Qué:** tabla (web) y lista (mobile) con filtros de la API, contadores por estado, badges de urgencia, regularización pendiente y sin proveedor, filtros persistidos en la URL y búsqueda por número o texto.
- **Criterios de aceptación:**
  - [ ] Con 5.000 tickets sintéticos, la primera página carga en < 1 s (servidor local).
  - [ ] Filtros compartibles por URL.
- **Tests:** E2E de filtros.
- **Tamaño:** L

### F3-T18 · UI FM: detalle de ticket
- **Depende de:** F3-T17, F3-T13
- **Qué:** cabecera (número, estado, propiedad), clasificación editable, acciones de estado dinámicas (desde `available-transitions`, con modal de motivo cuando corresponde), urgencia/exención, notas internas, galería por fase con subida (reutiliza F3-T12) e historial.
- **Criterios de aceptación:**
  - [ ] Solo se muestran las acciones válidas.
  - [ ] Un error de guard muestra el motivo ("Asigná un proveedor antes de coordinar").
  - [ ] Usable desde el celular en campo (subir fotos "durante/después").
- **Tests:** E2E: clasificar → asignar proveedor y fecha → coordinar → finalizar con foto "después".
- **Tamaño:** L

### F3-T19 · UI FM: planificación semanal de obras
- **Depende de:** F3-T17
- **Qué:** vista semana (lunes a sábado) por propiedad con tickets que tienen `scheduled_start_date`/`end_date` en el rango, mostrando título + proveedor por día. Navegación entre semanas. Reemplaza la `Hoja2`.
- **Criterios de aceptación:**
  - [ ] Un ticket de varios días aparece en cada día del rango.
  - [ ] Clic en un ítem abre el detalle.
  - [ ] Fechas en la zona horaria de la propiedad.
- **Tests:** unit de la función de expansión por día; E2E básico.
- **Tamaño:** M

### F3-T20 · Regla: no borrar una propiedad con tickets abiertos
- **Depende de:** F3-T03, F2-T09
- **Qué:** implementar el puerto `OpenTicketsPort` usado en el borrado de propiedades (F2-T04).
- **Criterios de aceptación:**
  - [ ] `DELETE /properties/{id}` con tickets no terminales → 409 con la cantidad de tickets abiertos.
- **Tests:** integración.
- **Tamaño:** S

### F3-T21 · E2E del flujo principal de la fase
- **Depende de:** F3-T15, F3-T16, F3-T18
- **Qué:** el cliente crea una solicitud urgente con foto → el FM la clasifica, marca urgencia, asigna proveedor y fecha → `TRABAJO_COORDINADO` → el cliente ve "Coordinado" → el FM finaliza con foto "después" → intentar cerrar falla por regularización pendiente.
- **Criterios de aceptación:**
  - [ ] El test corre en CI contra Supabase local en < 3 min.
- **Tests:** el E2E.
- **Tamaño:** M

### F3-T22 · Tabla `approvals` y autorización de urgencias
- **Depende de:** F3-T03, F1-T14
- **Qué:** crear la tabla `approvals` (append-only, compartida con F4) con sus políticas: `INSERT` y `SELECT` por miembros según acceso; `UPDATE` y `DELETE` denegados a todos. Incluye el tipo `EMERGENCY_WORK` y deja preparado `BUDGET_VERSION` (lo usa F4).
- **Criterios de aceptación:**
  - [ ] `UPDATE`/`DELETE` fallan para cualquier rol de aplicación.
  - [ ] Una urgencia sin aprobación registrada no habilita las transiciones 10 y 11.
  - [ ] `CLIENT` no ve aprobaciones de otras propiedades.
- **Tests:** integración de inmutabilidad y del guard + aislamiento.
- **Tamaño:** M
