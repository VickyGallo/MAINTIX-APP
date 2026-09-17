# Fase 2 — Catálogos

> **Estado:** Propuesta · **Depende de:** Fase 1 · **Tareas:** [tareas.md](tareas.md)

## Objetivo

Modelar los datos maestros sobre los que opera todo el sistema: propietarios (clientes), propiedades, ambientes, activos, rubros y proveedores. Todo normalizado para eliminar los problemas de calidad del Excel.

## Resultado de negocio

- Se terminan los duplicados y las variantes de escritura: "Horacio" / "Horacio Cetkovich", "GAS" / "Gas", "Sina asignar".
- El propietario ve solo sus propiedades desde el celular.
- Soporta propiedades en distintos países (Argentina, Uruguay, EE. UU.) con su zona horaria y moneda.

## Problemas del Excel que resuelve

| Problema en `TICKETS.xlsx` | Solución |
|---|---|
| "Sina asignar" cargado como proveedor | "Sin proveedor" = `provider_id NULL` |
| Mismo proveedor escrito de 3 formas | `providers.normalized_name` único + aviso de posible duplicado por similitud |
| Rubros "GAS" y "Gas" | Catálogo `categories` con selección, sin texto libre |
| Sitios como texto ("GB", "Grand bourg") | `properties` con `code` corto único |
| Ubicación como texto libre | `locations` por propiedad, creadas desde el ticket si no existen |

## Alcance

1. `categories` (rubros) con la carga inicial de los 25 rubros del Excel.
2. `clients` (propietarios) y `client_access` (usuarios `CLIENT` ↔ cliente).
3. `properties` con zona horaria y moneda por defecto.
4. `locations` (ambientes) por propiedad.
5. `assets` (activos/equipos) por propiedad.
6. `providers`, `provider_contacts`, `provider_categories`.
7. API v1 y UI de alta, baja y modificación (ABM) para FM; "Mis propiedades" para el cliente.

## Fuera de alcance

- Documentos de activos (manuales, garantías, planos): el modelo `files` existe desde F3, pero la UI de repositorio documental queda para después del MVP.
- Portal y usuarios de proveedores (F8).

## Modelo de datos

```
categories         (…base, name, normalized_name, is_active, sort_order)
                   UNIQUE (organization_id, normalized_name) WHERE deleted_at IS NULL
clients            (…base, type[PERSON|COMPANY], display_name, legal_name, tax_id, email, phone, notes)
client_access      (…base, client_id, user_id)  UNIQUE (client_id, user_id) WHERE deleted_at IS NULL
                   INDEX (user_id, client_id)
properties         (…base, client_id, code, name,
                    type[HOUSE|APARTMENT|OFFICE|FARM|INDUSTRIAL|RETAIL|GATED_COMMUNITY|HOTEL|MUSEUM|OTHER],
                    address, city, country_code (ISO 3166-1), timezone (IANA), default_currency (ISO 4217), is_active)
                   UNIQUE (organization_id, code) WHERE deleted_at IS NULL
locations          (…base, property_id, name, normalized_name)  UNIQUE (property_id, normalized_name)
assets             (…base, property_id, location_id?, category_id?, name, brand, model, serial_number,
                    installed_on, warranty_until, notes, is_active)
providers          (…base, display_name, normalized_name, legal_name, tax_id, email, phone, notes, is_active)
                   UNIQUE (organization_id, normalized_name) WHERE deleted_at IS NULL
provider_contacts  (…base, provider_id, name, role, phone, email, is_primary)
provider_categories(organization_id, provider_id, category_id)  PK (provider_id, category_id)
```

**Normalización de nombres:** `normalized_name = lower(unaccent(trim(regexp_replace(name, '\s+', ' ', 'g'))))`.

### Rubros iniciales (del Excel)

Eléctrico · Plomería · Gas · Aire acondicionado (HVAC) · Albañilería / Civil · Alfombras · Pintura · Carpintería · Herrería · Pisos y revestimientos · Techos e impermeabilización · Jardinería · Piscina · Control de plagas · Seguridad electrónica · Redes / WiFi · Portones automáticos · Electromecánica · Electrodomésticos · Mobiliario · Vidriería · Limpieza · Aberturas y control solar · Residuos · Mudanza / Movimiento

## Reglas de negocio

1. Toda propiedad pertenece a un cliente, y todo activo y ambiente pertenece a una propiedad (docs 03).
2. La **propiedad es el agregado principal**: borrarla (soft delete) solo se permite si no tiene tickets abiertos.
3. Un proveedor con tickets no se borra: se desactiva (`is_active = false`).
4. Al crear un proveedor, si hay otro con similitud de nombre ≥ 0,6 (`pg_trgm`), la API devuelve una advertencia y la UI pide confirmación.
5. Los importes de una propiedad usan su `default_currency` por defecto, pero cada importe guarda su propia moneda (F4).
6. Las fechas se muestran en la `timezone` de la propiedad.

## Seguridad y permisos

Nueva función `app_private.can_access_property(property_id)`. Devuelve `true` si el usuario:
- es `ORG_ADMIN`/`FACILITY_MANAGER` de la organización de la propiedad, o
- es `CLIENT` con `client_access` al cliente dueño de la propiedad.

| Tabla | FM / ORG_ADMIN | CLIENT |
|---|---|---|
| `categories` | CRUD | leer |
| `clients` | CRUD | leer solo los suyos |
| `client_access` | CRUD | leer los propios |
| `properties`, `locations`, `assets` | CRUD | leer si `can_access_property` |
| `providers` | CRUD | leer solo proveedores asignados a tickets de sus propiedades *(la política se agrega en F3-T03)* |
| `provider_contacts` | CRUD | **sin acceso** (datos internos del FM) |

## Criterios de aceptación de la fase

- [ ] Un `CLIENT` con acceso al cliente A no ve propiedades, ambientes ni activos del cliente B de la misma organización.
- [ ] No se pueden crear dos proveedores con el mismo nombre normalizado.
- [ ] Crear "Horacio Cetkovich" existiendo "Horario Cetkovich" muestra la advertencia de posible duplicado.
- [ ] El propietario ve "Mis propiedades" en el celular en menos de 2 s con 4G.
- [ ] Suite de aislamiento aplicada a todas las tablas nuevas.

## Supuestos a validar con el FM

- **Sitios reales:** la presentación lista Nordelta, CABA, Malba, Escobar, Punta del Este y Miami, pero el Excel usa Grand Bourg y Nordelta. Se asume que Malba es **proveedor/colaborador** (curaduría y montaje de obras) y no una propiedad. El listado final se carga en F7.
- **Clientes:** los docs mencionan dos propietarios (Eduardo y Elina Costantini). Hay que confirmar a quién pertenece cada propiedad.
