# Fase 7 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.

---

### F7-T01 · Lector del Excel a modelo intermedio
- **Depende de:** F0-T06
- **Qué:** `scripts/import/read-xlsx.ts` lee las hojas `TICKETS` (encabezado en fila 30), `CONTROL DE GASTOS` (encabezado en fila 9) y `MAESTRO PREVENTIVOS` (encabezado en fila 3) y las convierte en registros tipados validados con zod, conservando la fila de origen. Agregar `*.xlsx` a `.gitignore`.
- **Criterios de aceptación:**
  - [ ] Lee 55 tickets, 19 pagos y 21 sistemas del archivo de mayo 2026.
  - [ ] Ignora filas de listas de validación (filas 4–28 de TICKETS) y filas vacías con fórmulas.
  - [ ] Las fórmulas de costo (`=850240+233816`) se evalúan o se resuelven con su valor calculado.
- **Tests:** unit con un fixture **anonimizado** (nunca el archivo real).
- **Tamaño:** M

### F7-T02 · Diccionario de normalización
- **Depende de:** F7-T01, F2-T01
- **Qué:** crear `import-map.yaml` (sitios, rubros, estados, prioridades, alias de proveedores y contactos) y el normalizador que lo aplica. Lo que no está en el diccionario se reporta, no se adivina.
- **Criterios de aceptación:**
  - [ ] Todos los ejemplos de la tabla de normalización de la spec están cubiertos.
  - [ ] Un valor desconocido genera un conflicto de tipo `UNMAPPED_VALUE`.
- **Tests:** unit con tabla de casos.
- **Tamaño:** M

### F7-T03 · Mapeo al dominio
- **Depende de:** F7-T02
- **Qué:** convertir los registros normalizados en comandos de dominio según la tabla de mapeo de la spec: tickets, presupuestos, exenciones, urgencias, facturas, pagos y planes.
- **Criterios de aceptación:**
  - [ ] Cada fila de la tabla de mapeo tiene un test.
  - [ ] El orden de numeración nuevo respeta el orden original.
- **Tests:** unit.
- **Tamaño:** L

### F7-T04 · Reporte de conflictos en seco
- **Depende de:** F7-T03
- **Qué:** `pnpm import:dry-run --file <ruta>` genera `import-report.md` + `import-report.csv` con los conflictos detectados (duplicados de pago, referencias de ticket inconsistentes, montos distintos entre hojas, fechas incoherentes, valores sin mapear, proveedores similares), cada uno con la resolución propuesta. No escribe en la base.
- **Criterios de aceptación:**
  - [ ] Detecta los 7 conflictos conocidos de la spec.
  - [ ] No abre conexión de escritura a la base.
- **Tests:** unit con fixture que reproduce los 7 conflictos.
- **Tamaño:** M

### F7-T05 · Sesión de resolución con el FM
- **Depende de:** F7-T04
- **Qué:** revisar el reporte con el FM y registrar las decisiones en `import-resolutions.yaml`: mapa de referencias de ticket, duplicados a descartar, montos elegidos, proveedores unificados y listado final de propiedades y clientes.
- **Criterios de aceptación:**
  - [ ] Cada conflicto tiene una decisión explícita.
  - [ ] El archivo queda fuera del repo si contiene datos personales (se guarda junto al Excel).
- **Tests:** n/a
- **Tamaño:** S
- **Bloqueante externo:** disponibilidad del FM.

### F7-T06 · Importador idempotente
- **Depende de:** F7-T05, F4-T10, F5-T10
- **Qué:** `pnpm import:run --file --resolutions --org --env` aplica los comandos con `adminDb` en una transacción por entidad raíz, respeta `legacy_ref` (upsert) y registra la actividad con `actor_type = SYSTEM`. Solo se permite contra prod con `--confirm-prod`.
- **Criterios de aceptación:**
  - [ ] Re-ejecutar → 0 filas nuevas o modificadas.
  - [ ] Un fallo a mitad no deja entidades a medio importar (transacción por entidad raíz).
- **Tests:** integración contra Supabase local con fixture anonimizado.
- **Tamaño:** L

### F7-T07 · Conciliación posterior a la importación
- **Depende de:** F7-T06
- **Qué:** `pnpm import:reconcile` compara conteos por sitio, estado y tipo, y gasto por sitio y proveedor, contra `TD TKS` y `TD GASTOS`, y explica las diferencias con las resoluciones aplicadas.
- **Criterios de aceptación:**
  - [ ] Diferencias sin explicación = 0.
- **Tests:** unit del comparador.
- **Tamaño:** M

### F7-T08 · Revisión de seguridad automatizada
- **Depende de:** F6-T17
- **Qué:**
  - Test de CI "toda tabla de `app` tiene RLS y ≥ 1 política".
  - Chequeo de `adminDb` fuera de rutas permitidas.
  - Headers de seguridad (CSP, HSTS, etc.).
  - Rate limiting en escrituras y URLs firmadas (evaluar Vercel Firewall o un limitador propio; decisión registrada en ADR-001).
  - Pasada de OWASP ZAP sobre dev.
- **Criterios de aceptación:**
  - [ ] Checklist de seguridad de la spec en verde, excepto MFA (F7-T09) y legales (F7-T10).
  - [ ] Hallazgos altos de ZAP = 0.
- **Tests:** los tests de CI mencionados.
- **Tamaño:** L

### F7-T09 · MFA para FM y ORG_ADMIN
- **Depende de:** F1-T08
- **Qué:**
  - Enrolamiento TOTP (Supabase Auth MFA) y desafío en el login.
  - El contexto de request exige nivel `aal2` para los roles `ORG_ADMIN` y `FACILITY_MANAGER`.
  - Códigos de recuperación o procedimiento de recuperación documentado.
  - Verificar la API vigente con context7.
- **Criterios de aceptación:**
  - [ ] Un FM sin MFA es redirigido al enrolamiento y no accede a datos.
  - [ ] `CLIENT` no está obligado (opcional).
- **Tests:** integración del chequeo de `aal`; E2E del enrolamiento con TOTP simulado.
- **Tamaño:** L

### F7-T10 · Privacidad y legales
- **Depende de:** —
- **Qué:**
  - Borradores de política de privacidad y términos de uso (Ley 25.326 de Argentina; considerar Uruguay y EE. UU. por las propiedades en Punta del Este y Miami).
  - Aviso de que el dictado usa el reconocimiento de voz del navegador.
  - Política de retención (logs 30 días; datos de negocio mientras dure el contrato + exportación al baja).
  - Pantalla de aceptación en el primer login.
- **Criterios de aceptación:**
  - [ ] Textos revisados por asesoría legal (bloquea el lanzamiento).
  - [ ] La aceptación queda registrada con versión y fecha.
- **Tests:** E2E del primer login con aceptación.
- **Tamaño:** M
- **Bloqueante externo:** revisión legal.

### F7-T11 · Backups externos y simulacro de restauración
- **Depende de:** F0-T13
- **Qué:**
  - Workflow semanal de `pg_dump` cifrado (clave fuera de GitHub) a almacenamiento de otro proveedor, con retención de 12 semanas.
  - Simulacro de restauración en un proyecto temporal, con verificación de conteos.
  - Documento con la decisión sobre PITR.
- **Criterios de aceptación:**
  - [ ] Simulacro exitoso documentado en `docs/runbooks/restore.md` con tiempos reales (RTO medido).
  - [ ] Decisión PITR sí/no registrada con su costo.
- **Tests:** el simulacro.
- **Tamaño:** L

### F7-T12 · Rendimiento con dataset ×100
- **Depende de:** F6-T12
- **Qué:** generador de datos sintéticos (`pnpm seed:perf`), pruebas de carga sobre los endpoints principales (k6 o similar), `EXPLAIN ANALYZE` de las consultas lentas, índices faltantes y medición del overhead de la transacción RLS.
- **Criterios de aceptación:**
  - [ ] Se cumplen los objetivos p95 de la spec o hay desvíos aceptados por escrito.
  - [ ] Informe en `docs/perf/baseline.md`.
- **Tests:** script de carga reproducible.
- **Tamaño:** L

### F7-T13 · PWA instalable
- **Depende de:** F6-T05
- **Qué:** manifest (nombre, íconos, `theme_color`), service worker con caché del shell y página "Sin conexión", invitación a instalar (con instrucciones para iOS) y actualización de versión con aviso "Nueva versión disponible".
- **Criterios de aceptación:**
  - [ ] Instalable en Android e iOS.
  - [ ] Sin conexión muestra la página offline (no la pantalla de error del navegador).
  - [ ] El borrador de nueva solicitud (F3-T15) sobrevive a un cierre de la app.
- **Tests:** Lighthouse PWA checks + prueba manual en dispositivos.
- **Tamaño:** M

### F7-T14 · Alertas y monitoreo
- **Depende de:** F0-T14, F5-T02
- **Qué:**
  - Reglas de alerta en Sentry: errores nuevos, pico de 5xx, jobs `DEAD`.
  - Chequeo de disponibilidad externo sobre `/api/health` cada 5 min.
  - Alerta de uso de Supabase (DB > 70 % de 8 GB, storage > 70 GB).
  - Runbook de respuesta a incidentes.
- **Criterios de aceptación:**
  - [ ] Una caída simulada de `/api/health` alerta en < 10 min al responsable.
  - [ ] `docs/runbooks/incidents.md` con contactos y pasos.
- **Tests:** simulacro de alerta.
- **Tamaño:** M

### F7-T15 · UAT interna en paralelo con el FM (R1)
- **Depende de:** F7-T07, F7-T13
- **Qué:** guion de pruebas basado en los flujos reales de mayo 2026. Durante ≥ 1 semana el FM opera en Maintix y en el Excel en paralelo, con un tablero de observaciones clasificadas en bloqueante, mayor y menor. Sin acceso de clientes todavía.
- **Criterios de aceptación:**
  - [ ] Bloqueantes abiertos = 0 al final.
  - [ ] Las observaciones mayores tienen una tarea creada o una decisión de postergarlas.
- **Tests:** guion de UAT ejecutado y firmado.
- **Tamaño:** L
- **Bloqueante externo:** disponibilidad del FM y de al menos un propietario.

### F7-T16 · Runbook de lanzamiento y rollback
- **Depende de:** F7-T11, F7-T14
- **Qué:** `docs/runbooks/go-live.md` con pasos (congelar Excel, importación final, verificación, invitaciones), criterios de rollback (qué, quién decide, cómo volver al Excel sin perder lo cargado) y comunicación a usuarios.
- **Criterios de aceptación:**
  - [ ] Ensayo del runbook completo en dev.
- **Tests:** el ensayo.
- **Tamaño:** M

### F7-T17 · Salida a producción y acompañamiento
- **Depende de:** F7-T08, F7-T09, F7-T15, F7-T16
- **Qué:** ejecutar el runbook en prod, invitar a FM y propietarios, pasar el Excel a solo lectura y hacer revisión diaria de alertas y feedback durante 2 semanas.
- **Criterios de aceptación:**
  - [ ] Conciliación de prod igual a la de dev.
  - [ ] Todos los usuarios iniciales activaron su cuenta.
  - [ ] Informe de cierre del acompañamiento con métricas de uso y pendientes.
- **Tests:** conciliación en prod.
- **Tamaño:** L

### F7-T18 · Apertura a clientes piloto (R2)
- **Depende de:** F7-T17, F7-T10, F4-T17, F6-T12, F6-T16
- **Qué:** habilitar el acceso de propietarios a una o dos propiedades piloto: invitaciones, acompañamiento en el primer uso, activación de las notificaciones al cliente, publicación del primer informe mensual y recolección de feedback durante 3 semanas.
- **Criterios de aceptación:**
  - [ ] Los propietarios piloto aprobaron al menos un presupuesto desde la app.
  - [ ] Ninguna consulta de un piloto devolvió datos de otra propiedad (revisión de logs y auditoría).
  - [ ] Informe de feedback con decisión de abrir al resto de los clientes o ajustar antes.
- **Tests:** verificación de permisos en producción con una cuenta de prueba.
- **Tamaño:** M
- **Bloqueante externo:** disponibilidad de los propietarios piloto.
