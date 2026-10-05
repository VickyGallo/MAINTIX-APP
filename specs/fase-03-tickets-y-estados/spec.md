# Fase 3 — Tickets, estados y evidencias

> **Estado:** Propuesta · **Depende de:** Fase 2 · **Tareas:** [tareas.md](tareas.md)
> **ADR relacionados:** [ADR-004](../adr/ADR-004-workflow-configurable.md)

## Objetivo

Reemplazar la hoja `TICKETS` y la planilla semanal (`Hoja2`) por un flujo trazable:
- el propietario pide desde el celular (texto o voz + fotos);
- el FM clasifica, coordina y avanza el ticket con estados configurables;
- todo queda con evidencia fotográfica "antes / durante / después" y con historial.

## Resultado de negocio

- Se elimina WhatsApp como canal de gestión técnica (objetivo de la presentación).
- El propietario ve 4 estados simples. El FM opera con los 12 estados reales.
- Números de ticket estables (`TK-2026-0042`) que ya no se corren al insertar filas.
- La evidencia visual queda asociada a cada trabajo: es la base del dossier y de los reportes (F6).

## Alcance

1. `workflow_states` y `workflow_transitions` con la carga inicial del Excel.
2. Máquina de estados de dominio con guards.
3. `tickets`, `ticket_internal_notes`, `ticket_state_history`.
4. Casos de uso:
   - creación por el FM y por el cliente;
   - clasificación;
   - transición, postergación/reanudación, urgencia;
   - cancelación por el cliente.
5. `files` y `ticket_attachments`, con subida directa a Storage mediante URL firmada.
6. Compresión de fotos en el cliente, miniaturas y eliminación de metadatos (EXIF/GPS).
7. Dictado por voz.
8. Pantallas:
   - FM: bandeja, detalle, galería y planificación semanal;
   - Cliente: nueva solicitud, mis solicitudes.

## Fuera de alcance

- Presupuestos, aprobación y pagos (F4). En esta fase el guard `HAS_RECEIVED_BUDGET` siempre devuelve `false`.
- Notificaciones (F6): esta fase solo emite eventos de dominio.
- Adjuntos de audio: el dictado se convierte a texto; el audio no se guarda.
- UI para configurar estados (F8).

## Modelo de datos

```
workflow_states      (…base, key, label, client_state[PENDIENTE|PRESUPUESTO_EN_REVISION|COORDINADO|FINALIZADO|CANCELADO],
                      is_initial, is_terminal, sort_order, color)
                     UNIQUE (organization_id, key)
workflow_transitions (…base, from_state_id, to_state_id, allowed_roles text[], guard_keys text[],
                      requires_reason bool, is_system_only bool)
                     UNIQUE (organization_id, from_state_id, to_state_id)
tickets              (…base, number, property_id, location_id?, asset_id?, category_id?,
                      kind[CORRECTIVE|PREVENTIVE|IMPROVEMENT], priority[HIGH|MEDIUM|LOW],
                      title (≤120), description, state_id, postponed_from_state_id?,
                      origin[CLIENT|FM|PREVENTIVE|FINDING], requested_by_user_id,
                      provider_id?, provider_contact_id?, scheduled_start_date?, scheduled_end_date?,
                      is_emergency bool, emergency_reason?, requires_regularization bool,
                      budget_exemption[NONE|NO_COST|CONTRACT], budget_exemption_reason?,
                      completed_at?, closed_at?, preventive_occurrence_id?, origin_finding_id?,
                      legacy_ref?)
                     UNIQUE (organization_id, number)
                     INDEX (organization_id, state_id), (organization_id, property_id, created_at DESC),
                           (organization_id, provider_id), (organization_id, scheduled_start_date)
approvals            (…base, subject_type[EMERGENCY_WORK|BUDGET_VERSION], subject_id,
                      decision[APPROVED|REJECTED], amount?, currency?,
                      decided_by_user_id, decided_at,
                      channel[APP|EMAIL|WHATSAPP|PHONE|IN_PERSON], note?, evidence_file_id?,
                      registered_by_user_id?, reason?)
                     INDEX (organization_id, subject_type, subject_id)
ticket_internal_notes(…base, ticket_id, body)
ticket_state_history (…base, ticket_id, from_state_id?, to_state_id, reason?, actor_user_id?, actor_type[USER|SYSTEM])
files                (…base, bucket, object_path, mime_type, size_bytes, width?, height?, checksum_sha256?,
                      status[PENDING|READY|REJECTED], variant[ORIGINAL|THUMBNAIL], parent_file_id?, uploaded_by)
                     UNIQUE (bucket, object_path)
ticket_attachments   (…base, ticket_id, file_id, phase[BEFORE|DURING|AFTER|FINDING|OTHER], caption?, visible_to_client bool default true)
```

`preventive_occurrence_id` y `origin_finding_id` se crean en F3 **sin foreign key**, porque las tablas destino nacen en F5. Las FK se agregan en F5-T05 y F5-T13.

Tipos de ticket: `CORRECTIVE`, `PREVENTIVE` e `IMPROVEMENT` son los 3 que usa la operación real. Los tipos de los docs 03 se absorben así:
- "Emergencia" → `is_emergency`;
- "Remodelación" → `IMPROVEMENT`;
- "Inspección" → estado `RELEVADO` o preventivo.

## Estados iniciales (carga desde el Excel)

| # | `key` | Etiqueta FM | `client_state` (lo que ve el propietario) |
|---|---|---|---|
| 1 | `PENDIENTE` *(inicial)* | Pendiente | Pendiente |
| 2 | `RELEVO_COORDINADO` | Relevo coordinado | Pendiente |
| 3 | `RELEVADO` | Relevado | Pendiente |
| 4 | `PRESUPUESTO_SOLICITADO` | Presupuesto solicitado | Presupuesto en revisión |
| 5 | `PRESUPUESTO_RECIBIDO` | Presupuesto recibido | Presupuesto en revisión |
| 6 | `PENDIENTE_APROBACION` | Pendiente aprobación | Presupuesto en revisión + **Acción requerida** |
| 7 | `APROBADO` | Aprobado | Coordinado |
| 8 | `TRABAJO_COORDINADO` | Trabajo coordinado | Coordinado |
| 9 | `EN_EJECUCION` | En ejecución | Coordinado |
| 10 | `FINALIZADO` | Finalizado | Finalizado |
| 11 | `CERRADO` *(terminal)* | Cerrado | Finalizado |
| 12 | `POSTERGADO` | Postergado | Pendiente |
| 13 | `CANCELADO` *(terminal)* | Cancelado | Cancelado *(solo en historial)* |

## Transiciones iniciales

"Roles FM" = `ORG_ADMIN` + `FACILITY_MANAGER`.

| # | Desde | Hacia | Roles | Guards | Motivo |
|---|---|---|---|---|---|
| 1 | PENDIENTE | RELEVO_COORDINADO | FM | — | — |
| 2 | PENDIENTE, RELEVO_COORDINADO | RELEVADO | FM | — | — |
| 3 | PENDIENTE, RELEVADO | PRESUPUESTO_SOLICITADO | FM | — | — |
| 4 | PRESUPUESTO_SOLICITADO | PRESUPUESTO_RECIBIDO | FM | `HAS_RECEIVED_BUDGET` | — |
| 5 | PRESUPUESTO_RECIBIDO | PRESUPUESTO_SOLICITADO | FM | — | sí |
| 6 | PRESUPUESTO_RECIBIDO | PENDIENTE_APROBACION | FM | `HAS_RECEIVED_BUDGET` | — |
| 7 | PENDIENTE_APROBACION | APROBADO | sistema | `SYSTEM_ONLY` | — |
| 8 | PENDIENTE_APROBACION | PRESUPUESTO_RECIBIDO | sistema | `SYSTEM_ONLY` | — |
| 9 | APROBADO | TRABAJO_COORDINADO | FM | `PROVIDER_ASSIGNED`, `SCHEDULED_DATE_SET` | — |
| 10 | PENDIENTE, RELEVO_COORDINADO, RELEVADO | TRABAJO_COORDINADO | FM | `PROVIDER_ASSIGNED`, `SCHEDULED_DATE_SET`, `BUDGET_EXEMPT_OR_EMERGENCY` | — |
| 11 | PENDIENTE, RELEVO_COORDINADO, RELEVADO | EN_EJECUCION | FM | `PROVIDER_ASSIGNED`, `IS_EMERGENCY` | — |
| 12 | TRABAJO_COORDINADO | EN_EJECUCION | FM | — | — |
| 13 | TRABAJO_COORDINADO, EN_EJECUCION | FINALIZADO | FM | `PROVIDER_ASSIGNED` | — |
| 14 | FINALIZADO | EN_EJECUCION | FM | — | sí (reapertura) |
| 15 | FINALIZADO | CERRADO | FM | `NO_PENDING_REGULARIZATION` | — |
| 16 | todo no terminal excepto POSTERGADO | POSTERGADO | FM | — | sí |
| 17 | todo no terminal | CANCELADO | FM | — | sí |
| 18 | PENDIENTE | CANCELADO | CLIENT | `OWN_CLIENT_REQUEST` | sí |

**Reanudar** un ticket postergado no es una fila de la tabla: el caso de uso `resumeTicket` lo devuelve a `postponed_from_state_id`.

### Guards (código)

| Clave | Pasa si… |
|---|---|
| `PROVIDER_ASSIGNED` | `provider_id` no es nulo, o `budget_exemption = NO_COST` (trabajo interno, por ejemplo "Administración") |
| `SCHEDULED_DATE_SET` | `scheduled_start_date` no es nulo |
| `HAS_RECEIVED_BUDGET` | existe ≥ 1 presupuesto `RECEIVED` *(F3: puerto que devuelve `false`; implementación real en F4-T02)* |
| `BUDGET_EXEMPT_OR_EMERGENCY` | `budget_exemption ≠ NONE`, o urgencia autorizada (ver `IS_EMERGENCY`) |
| `IS_EMERGENCY` | `is_emergency = true` **y** existe una aprobación `EMERGENCY_WORK` para el ticket |
| `NO_PENDING_REGULARIZATION` | `requires_regularization = false` |
| `OWN_CLIENT_REQUEST` | `origin = CLIENT` y `requested_by_user_id` = actor |
| `SYSTEM_ONLY` | el actor es un caso de uso de sistema (nunca una request de usuario) |

## Reglas de negocio

1. **Número:** `TK-{año}-{correlativo}` por organización (F1-T15). Se asigna al crear y nunca cambia.
2. **Solicitud del cliente:** solo pide propiedad, descripción (texto o voz) y fotos, más la marca opcional "Urgente".
   - Valores por defecto: `kind = CORRECTIVE`, `priority = MEDIUM` (o `HIGH` si marcó urgente), `origin = CLIENT`, `title` = primeros 80 caracteres de la descripción.
   - El FM reclasifica después.
3. **Urgencia:** solo el FM la marca (`markEmergency`), y debe registrar **quién autorizó avanzar**, por qué canal y con qué motivo. Eso crea una aprobación `EMERGENCY_WORK`. Sin ese registro, el ticket no avanza por la vía de urgencia. Ejemplos del Excel: pérdida de gas, instalación de termotanques.
   `approvals` es append-only y lo comparten F3 (urgencias) y F4 (versiones de presupuesto).
4. **Regularización:** si un ticket entra a `TRABAJO_COORDINADO` o `EN_EJECUCION` por urgencia, sin presupuesto aprobado y sin exención, queda `requires_regularization = true`.
   - Se limpia al aprobarse un presupuesto (F4) o al registrar una exención con motivo.
   - No se puede `CERRAR` con regularización pendiente.
5. **Timestamps:** entrar a `FINALIZADO` fija `completed_at`; entrar a `CERRADO` fija `closed_at`; reabrir limpia `completed_at`.
6. **Postergar** guarda `postponed_from_state_id`. **Reanudar** vuelve a ese estado y lo limpia.
7. **Historial:** cada cambio de estado escribe `ticket_state_history` + `activity_log` en la misma transacción.
8. **Borrado:** los tickets no se borran; se cancelan.
9. **Propiedad con tickets abiertos:** no se puede borrar (completa la regla de F2).
10. **Evidencias:**
    - Cada adjunto tiene fase `BEFORE`, `DURING`, `AFTER`, `FINDING` u `OTHER`. `FINDING` se usa en las fotos de hallazgos (F5).
    - Todo adjunto registra quién lo subió y cuándo (columnas base) y admite una descripción opcional.
    - Por defecto es `visible_to_client = true`. El FM puede ocultarlo (por ejemplo, fotos de sala de máquinas con datos sensibles).
11. **Fotos:**
    - Formatos aceptados: `image/jpeg`, `image/png` y `image/webp`.
    - Se re-codifican en el navegador a un lado mayor de 2048 px, con calidad ≈ 0,8. Esto elimina EXIF y GPS: **la ubicación de propiedades de alto valor no debe quedar en los archivos**.
    - Se genera una miniatura de 400 px.
    - Límite antes de comprimir: 15 MB. PDF ≤ 20 MB. Video `mp4`/`quicktime` ≤ 50 MB, sin transcodificar.
12. **Dictado por voz:** si el navegador soporta Web Speech API se usa con `lang = es-AR`. Si no, se invita a usar el micrófono del teclado del sistema. El texto dictado siempre es editable antes de enviar.

## Qué ve cada rol (DTOs)

| Campo | FM | CLIENT |
|---|---|---|
| Número, propiedad, ambiente, rubro, tipo, título, descripción | ✅ | ✅ |
| Estado interno (`key`, etiqueta) | ✅ | ❌ (solo `client_state` + etiqueta cliente) |
| Acción requerida | ✅ | ✅ |
| Prioridad, urgencia | ✅ | solo la marca "Urgente" |
| Proveedor (nombre) | ✅ | ✅ |
| Contacto del proveedor | ✅ | ❌ |
| Fechas coordinadas, finalización | ✅ | ✅ |
| Notas internas | ✅ | ❌ |
| Historial | completo | cambios de `client_state` (se fusionan los internos consecutivos) |
| Adjuntos | todos | solo `visible_to_client` |
| Regularización, exención | ✅ | ❌ |

## Seguridad y permisos

- `tickets`:
  - FM: CRUD en su organización.
  - CLIENT: `SELECT` si `can_access_property`; `INSERT` solo con `origin = CLIENT` y `requested_by_user_id = auth.uid()`.
  - `UPDATE`: solo FM. Los cambios de estado del cliente pasan por casos de uso que validan dominio + RLS.
- `ticket_internal_notes`: solo FM (RLS). Es una tabla separada para que la RLS proteja lo interno, no solo el DTO.
- `providers` (completa F2): CLIENT puede leer proveedores asignados a tickets de sus propiedades.
- **Storage:**
  - Bucket privado `org-files`, rutas `org/{organization_id}/tickets/{ticket_id}/{file_id}.{ext}`.
  - `storage.objects` **sin políticas para `anon`/`authenticated`** (deniega todo).
  - Subidas y descargas solo con URLs firmadas que emite la API después de verificar el acceso al ticket con `db.rls`.
  - URL de descarga: 10 min. URL de subida: 2 h (límite de Supabase).

## Criterios de aceptación de la fase

- [ ] La máquina de estados tiene 100 % de cobertura de ramas en tests unitarios (18 transiciones + guards).
- [ ] El cliente crea una solicitud con 3 fotos desde un celular (Playwright mobile) en ≤ 3 pantallas.
- [ ] Las fotos subidas no tienen EXIF (verificado con test) y pesan ≤ 1 MB cada una en el caso típico.
- [ ] El FM lleva un ticket de `PENDIENTE` a `TRABAJO_COORDINADO` por la ruta de urgencia, y el ticket queda con regularización pendiente y no se puede cerrar.
- [ ] El cliente ve "Coordinado", no "Trabajo coordinado", y no recibe notas internas ni contactos en la API.
- [ ] Un `CLIENT` no obtiene URL firmada de un adjunto de otra propiedad (403).
- [ ] La planificación semanal muestra lo mismo que la `Hoja2` del Excel para la semana del 11/05/2026 (verificable tras F7).

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Web Speech API envía el audio a servidores del proveedor del navegador | Se informa en la política de privacidad (F7-T10); el dictado es opcional. |
| Fotos pesadas en 4G | Compresión en cliente, subida directa a Storage, reintento por archivo. |
| Estados configurables → UI compleja | La UI solo muestra acciones válidas calculadas por el servidor (`GET /tickets/{id}/available-transitions`). |
