# Fase 6 — Dashboards, reportes y notificaciones

> **Estado:** Propuesta · **Depende de:** Fases 4 y 5 · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Hacer visible el valor del servicio:
- **dashboards** para el FM (operación) y el propietario (tranquilidad);
- **reportes PDF**: informe mensual y **Dossier de Mejora** con "antes y después";
- **notificaciones** por email, push e in-app, para que nadie tenga que preguntar por WhatsApp.

## Resultado de negocio

- Resuelve "dificultad para demostrar al propietario el valor del servicio" (Documento 01).
- El propietario sabe cuándo actuar: aprobar un presupuesto, ver un trabajo terminado.
- El FM empieza el día con un resumen de lo urgente, sin revisar planillas.
- El Dossier de Mejora (funcionalidad premium de la presentación) queda disponible para obras de magnitud.

## Alcance

1. Notificaciones:
   - tablas;
   - distribución de eventos a destinatarios;
   - preferencias;
   - canales email, Web Push e in-app.
2. Recordatorios de aprobación y resumen diario del FM.
3. Dashboard FM (web) y Dashboard Cliente (mobile, estética "Banca Privada").
4. Motor de PDF en segundo plano.
5. Informe mensual por propiedad y Dossier de Mejora por ticket `IMPROVEMENT`.
6. Publicación de reportes al propietario y descarga.

## Fuera de alcance

- WhatsApp Business (F8).
- Dashboard financiero avanzado (proyecciones, presupuesto anual) (F8).
- Firma digital de reportes (F8).
- Publicación automática al cliente: el informe mensual **se genera** solo, pero siempre lo publica el FM.

## Modelo de datos

```
notifications            (…base, user_id, event_type, title, body, link_path, entity_type?, entity_id?, read_at?)
                         INDEX (organization_id, user_id, read_at, created_at DESC)
notification_preferences (…base, user_id, event_type, channel[EMAIL|PUSH|IN_APP], enabled)
                         UNIQUE (organization_id, user_id, event_type, channel)
push_subscriptions       (…base, user_id, endpoint UNIQUE, p256dh, auth, user_agent?, last_used_at?)
reports                  (…base, type[MONTHLY|IMPROVEMENT_DOSSIER], property_id, ticket_id?,
                          period_start?, period_end?, status[QUEUED|RENDERING|READY|FAILED],
                          file_id?, error?, published_to_client_at?, requested_by)
```

## Catálogo de eventos

| Evento | Destinatarios | Canales por defecto | Contenido |
|---|---|---|---|
| `ticket.created` (origen cliente) | FM de la organización | email, push, in-app | "Nueva solicitud en {propiedad}: {título}" |
| `ticket.client_state_changed` | usuarios CLIENT de la propiedad | push, in-app (+ email si pasa a Finalizado) | "{título}: ahora {estado cliente}" |
| `budget.submitted` | CLIENT de la propiedad | email, push, in-app | "Requiere tu aprobación: {título} — {moneda} {monto}" |
| `budget.reminder` | CLIENT | email, push | Enviado a las 48 h sin decisión; máximo 3 (cada 48 h) |
| `budget.decided` | FM | email, push, in-app | "{cliente} aprobó / rechazó {PR-…}" |
| `finding.created` | FM (excepto el autor), CLIENT | FM: in-app · CLIENT: push, in-app | "Hallazgo en {propiedad}: {descripción corta}" |
| `report.published` | CLIENT | email, in-app | "Tu informe {tipo} de {propiedad} está disponible" |
| `fm.daily_digest` | FM | email (07:00 hora de la organización) | Aprobaciones pendientes, preventivos vencidos y de los próximos 7 días, regularizaciones > 72 h, tickets sin proveedor, **trabajos postergados sin movimiento hace más de 14 días** |
| `report.scheduled` | FM | in-app (+ email) | Informe mensual generado automáticamente el día 1 de cada mes para cada propiedad activa; el FM revisa y publica |

Reglas de envío:
- Un evento sin destinatarios no genera jobs.
- Entrega idempotente por (evento, usuario, canal).
- Web Push en iOS requiere la PWA instalada en la pantalla de inicio (iOS 16.4 o superior). La UI lo explica al activar notificaciones.

## Dashboards

### FM (web, también usable en mobile)

| Indicador | Definición |
|---|---|
| Tickets abiertos | Tickets en estados no terminales, por estado y por propiedad |
| Sin proveedor | Abiertos con `provider_id` nulo y sin exención `NO_COST` |
| Urgencias por regularizar | `requires_regularization = true`, con antigüedad |
| Esperando aprobación | Presupuestos enviados y `RECEIVED`, con antigüedad promedio |
| Preventivos | Vencidos · próximos 7 días · cumplimiento del mes (`DONE` / vencen en el mes) |
| Gasto del mes | Por moneda, comparado con el mes anterior |
| Tiempo de resolución | Mediana de `completed_at − created_at` en los últimos 90 días, por tipo |
| Actividad reciente | Últimos 20 registros de `activity_log` |

### Propietario (mobile first)

| Bloque | Definición |
|---|---|
| Estado general por propiedad | **Rojo:** ticket `HIGH` abierto o hallazgo `CRITICAL` con correctivo abierto · **Amarillo:** acción requerida o preventivo vencido · **Verde:** resto |
| Acción requerida | Presupuestos para aprobar (acceso directo) |
| Trabajos en curso | Tickets en `COORDINADO` |
| Próximos mantenimientos | Ocurrencias de los próximos 30 días |
| Gasto acumulado | Mes actual y año en curso, por moneda |
| Últimos trabajos | Tickets finalizados con foto "después" |
| Reportes | Publicados, más recientes primero |

Estética: fondos blancos, grises suaves, tipografía sobria, sin tablas densas en mobile, cifras grandes y legibles, modo oscuro.

## Reportes PDF

- **Motor:** renderizado server-side sin navegador headless (recomendado: `@react-pdf/renderer`; verificar compatibilidad en la tarea) dentro del job `render-report`.
- El PDF se guarda en `org-files` (`org/{org}/reports/{report_id}.pdf`) y se descarga con URL firmada.
- Máximo 24 fotos por reporte, a 1200 px, para mantener el PDF por debajo de 15 MB.

### Informe mensual (por propiedad y mes)

1. Portada: propiedad, período, marca de la organización.
2. Resumen: trabajos finalizados, en curso, preventivos realizados/vencidos, hallazgos.
3. Trabajos finalizados: título, rubro, proveedor, fecha y miniaturas antes/después.
4. Preventivos del mes y próximos 30 días.
5. Hallazgos y correctivos generados.
6. Gasto del mes por moneda (según `work_month`) y detalle por ticket.

### Dossier de Mejora (por ticket `IMPROVEMENT`)

1. Portada con foto "después" destacada.
2. Alcance y motivo.
3. Comparativa de presupuestos (proveedor, monto, moneda, elegido).
4. Tiempos: solicitud → aprobación → coordinación → finalización (días).
5. Costo real vs. aprobado (base + adicionales) por moneda.
6. Galería "Antes y Después" (pares por fase).
7. Proveedor y responsables.

### Reglas

1. Solo el FM genera reportes. Un reporte `READY` no es visible para el cliente hasta que el FM lo **publica** (`published_to_client_at`).
2. Los reportes solo incluyen adjuntos `visible_to_client = true` y nunca notas internas ni contactos de proveedores.
3. Regenerar crea un reporte nuevo; los publicados no se sobrescriben (trazabilidad).

## Seguridad y permisos

| Tabla | FM | CLIENT |
|---|---|---|
| `notifications` | solo las propias | solo las propias |
| `notification_preferences`, `push_subscriptions` | solo las propias | solo las propias |
| `reports` | CRUD en la organización | `SELECT` si `published_to_client_at` no es nulo y `can_access_property` |

## Criterios de aceptación de la fase

- [ ] Cuando el FM envía un presupuesto, el propietario recibe email + push (Android e iOS con PWA instalada) en < 5 min.
- [ ] Desactivar un canal en preferencias corta ese canal para ese evento.
- [ ] El dashboard del propietario carga en < 2 s en 4G y no expone datos internos (test de contrato).
- [ ] El informe mensual de prueba (propiedad con 10 tickets, 20 fotos, 2 monedas) se genera en < 60 s y pesa < 15 MB.
- [ ] El propietario no puede descargar un reporte no publicado (403).

## Supuestos a validar con el FM

- La regla del semáforo de "Estado general" (rojo/amarillo/verde).
- Frecuencia de recordatorios de aprobación: a las 48 h, máximo 3.
- Horario del resumen diario del FM: 07:00.
