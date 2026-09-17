# Fase 2 — Tareas

> Formato y Definition of Done: ver [README](../README.md#formato-de-tarea).
> Tamaños: **S** ≤ 2 h · **M** ≤ 4 h · **L** ≤ 1 día.
> **Regla transversal:** cada tabla nueva agrega su caso en la suite de aislamiento (F1-T16) dentro de la misma tarea.

---

### F2-T01 · Extensiones y helper de normalización
- **Depende de:** F1-T01
- **Qué:** habilitar `unaccent` y `pg_trgm`, y crear la función inmutable `app_private.normalize_name(text)` más su equivalente en TypeScript del dominio (mismo resultado).
- **Criterios de aceptación:**
  - [ ] `normalize_name('  Plomería  ') = normalize_name('plomeria')`.
  - [ ] SQL y TypeScript devuelven lo mismo para una tabla de 20 casos.
- **Tests:** unit (TS) + integración (SQL) con la misma tabla de casos.
- **Tamaño:** S

### F2-T02 · Tabla `categories` + carga de los 25 rubros
- **Depende de:** F2-T01
- **Qué:** crear la tabla con políticas (FM CRUD, CLIENT lectura) y función `seed_categories(org)` que carga los rubros de la spec. Se invoca al crear una organización y en el seed de dev.
- **Criterios de aceptación:**
  - [ ] "GAS" y "Gas" no pueden coexistir.
  - [ ] Ejecutar la carga dos veces no duplica rubros.
- **Tests:** integración + aislamiento.
- **Tamaño:** S

### F2-T03 · Tablas `clients` y `client_access`
- **Depende de:** F1-T05
- **Qué:** crear las tablas con índices y políticas: FM CRUD; CLIENT lee el cliente vinculado y su propio `client_access`.
- **Criterios de aceptación:**
  - [ ] Un `CLIENT` sin `client_access` no ve ningún cliente.
  - [ ] Existe el índice `(user_id, client_id)`.
- **Tests:** integración por rol + aislamiento.
- **Tamaño:** M

### F2-T04 · Tabla `properties` y `can_access_property`
- **Depende de:** F2-T03
- **Qué:**
  - Crear la tabla (con `timezone` IANA validada y `default_currency` ISO 4217).
  - Crear la función `app_private.can_access_property` y las políticas.
  - Restricción: no se borra si hay tickets abiertos (la validación se completa en F3; aquí queda el puerto).
- **Criterios de aceptación:**
  - [ ] `CLIENT` del cliente A no ve propiedades del cliente B.
  - [ ] `code` único por organización.
  - [ ] Una zona horaria o moneda inválida es rechazada por la validación de dominio.
- **Tests:** unit de validaciones; integración por rol + aislamiento.
- **Tamaño:** M

### F2-T05 · Tabla `locations` (ambientes)
- **Depende de:** F2-T04
- **Qué:** crear la tabla con nombre normalizado único por propiedad y el caso de uso `findOrCreateLocation(propertyId, name)`.
- **Criterios de aceptación:**
  - [ ] "Living" y "living " resuelven al mismo ambiente.
  - [ ] Las políticas usan `can_access_property`.
- **Tests:** unit + integración + aislamiento.
- **Tamaño:** S

### F2-T06 · Tabla `assets` (activos)
- **Depende de:** F2-T05, F2-T02
- **Qué:** crear la tabla con FKs a propiedad, ambiente (opcional) y rubro (opcional), y políticas vía `can_access_property`.
- **Criterios de aceptación:**
  - [ ] Un activo no puede referenciar un ambiente de otra propiedad (validado en dominio y con FK compuesta o trigger).
- **Tests:** integración + aislamiento.
- **Tamaño:** S

### F2-T07 · Tablas de proveedores
- **Depende de:** F2-T02
- **Qué:** crear `providers`, `provider_contacts` y `provider_categories` con índice trigram sobre `normalized_name` y políticas (contactos solo FM).
- **Criterios de aceptación:**
  - [ ] Nombre normalizado único por organización.
  - [ ] `CLIENT` no lee `provider_contacts` en ningún caso.
  - [ ] Solo un contacto `is_primary` por proveedor.
- **Tests:** integración por rol + aislamiento.
- **Tamaño:** M

### F2-T08 · API v1: clientes y accesos
- **Depende de:** F2-T03, F1-T11, F1-T10
- **Qué:**
  - `GET/POST/PATCH/DELETE /api/v1/clients`.
  - `POST /api/v1/clients/{id}/access`: invita un usuario `CLIENT` (reutiliza `inviteMember`) y crea el `client_access`.
  - `DELETE /api/v1/clients/{id}/access/{userId}`.
- **Criterios de aceptación:**
  - [ ] Invitar a un propietario le da acceso solo a ese cliente.
  - [ ] Todas las mutaciones quedan en `activity_log`.
- **Tests:** integración de endpoints por rol.
- **Tamaño:** M

### F2-T09 · API v1: propiedades y ambientes
- **Depende de:** F2-T04, F2-T05, F1-T11
- **Qué:** CRUD de `/api/v1/properties` (filtros por cliente y activo) y `/api/v1/properties/{id}/locations`. `CLIENT` solo tiene `GET` sobre las suyas.
- **Criterios de aceptación:**
  - [ ] `GET /properties` como `CLIENT` devuelve solo las accesibles.
  - [ ] Paginación por cursor.
- **Tests:** integración por rol.
- **Tamaño:** M

### F2-T10 · API v1: activos
- **Depende de:** F2-T06, F1-T11
- **Qué:** CRUD de `/api/v1/properties/{id}/assets`.
- **Criterios de aceptación:**
  - [ ] Validación de ambiente perteneciente a la propiedad → 422.
- **Tests:** integración.
- **Tamaño:** S

### F2-T11 · API v1: proveedores con detección de duplicados
- **Depende de:** F2-T07, F1-T11
- **Qué:**
  - CRUD de `/api/v1/providers` y `/providers/{id}/contacts`, con búsqueda `?q=` (trigram).
  - `POST` devuelve `409` si el nombre normalizado ya existe y `200` + `warnings[possible_duplicates]` si la similitud es ≥ 0,6, salvo `?confirm=true`.
- **Criterios de aceptación:**
  - [ ] "Exepresion Verde" advierte si existe "Expresion Verde".
  - [ ] No se puede borrar un proveedor con tickets: se desactiva.
- **Tests:** integración de los 3 casos (nuevo, duplicado exacto, similar).
- **Tamaño:** M

### F2-T12 · UI FM: clientes y propiedades
- **Depende de:** F2-T08, F2-T09, F1-T17
- **Qué:** listado y formulario de clientes (con gestión de accesos e invitación de propietarios) y listado y formulario de propiedades (código, tipo, dirección, zona horaria, moneda).
- **Criterios de aceptación:**
  - [ ] Validaciones inline con los mismos schemas zod de la API.
  - [ ] Estados vacíos y de carga en todas las vistas.
- **Tests:** E2E: crear cliente → crear propiedad → invitar propietario.
- **Tamaño:** L

### F2-T13 · UI FM: ambientes y activos
- **Depende de:** F2-T09, F2-T10, F2-T12
- **Qué:** pestañas "Ambientes" y "Activos" dentro del detalle de la propiedad.
- **Criterios de aceptación:**
  - [ ] Alta rápida de ambiente desde un input (Enter).
  - [ ] El activo muestra la garantía vencida o por vencer (≤ 30 días).
- **Tests:** E2E básico.
- **Tamaño:** M

### F2-T14 · UI FM: proveedores
- **Depende de:** F2-T11, F1-T17
- **Qué:** listado con búsqueda y filtro por rubro, formulario con contactos y confirmación ante posibles duplicados.
- **Criterios de aceptación:**
  - [ ] El modal de duplicados muestra los candidatos y permite ir al existente o confirmar el alta.
- **Tests:** E2E del flujo de duplicado.
- **Tamaño:** M

### F2-T15 · UI Cliente: "Mis propiedades" (mobile)
- **Depende de:** F2-T09, F1-T17
- **Qué:** lista de tarjetas con nombre, ubicación y foto de portada (placeholder hasta F3). Con una sola propiedad, entra directo a su inicio.
- **Criterios de aceptación:**
  - [ ] Carga en menos de 2 s con throttling 4G (Lighthouse/Playwright).
  - [ ] Ningún dato interno del FM (contactos de proveedores, notas) en la respuesta de la API.
- **Tests:** E2E como `CLIENT`; test de contrato del DTO de cliente.
- **Tamaño:** S
