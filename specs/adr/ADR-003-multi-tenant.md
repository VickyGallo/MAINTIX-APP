# ADR-003 — Multi-empresa (multi-tenant) desde el día 1

- **Estado:** Propuesto (se acepta en F0-T01)
- **Fecha:** 2026-09-17
- **Modifica:** `docs/04_Data_Model` (`Company` pasaba a V2; el rol vivía en `User`)

## Contexto

- **Decisión de negocio (2026-09-17, ajustada 2026-10-05 por el reporte de arquitectura):** Maintix es primero una herramienta interna del servicio de Facility Management que opera Nicolás; después se abre a clientes con acceso controlado; un SaaS es solo una posibilidad futura (etapa 4). El modelo debe permitir llegar ahí **sin construir el SaaS ahora**. Al inicio opera una sola organización.
- Agregar el aislamiento por organización después obliga a migrar todos los datos, reescribir permisos y re-testear todo el sistema.
- Agregarlo hoy cuesta una columna, políticas RLS y una suite de tests.
- Una misma persona puede tener roles distintos en contextos distintos (por ejemplo, FM en una organización y propietario en otra).

## Decisión

**Modelo "pool":** una base, un esquema; cada tabla de negocio tiene `organization_id NOT NULL` y está protegida con RLS.

### Entidades de identidad

- `organizations`: empresa de FM (cliente de Maintix).
- `memberships (user_id, organization_id, role, status)`: el rol vive en la membresía, no en el usuario.
- `client_access (client_id, user_id)`: qué propietario ve qué cliente, y por lo tanto qué propiedades.
- `platform_admins (user_id)`: operadores de Maintix. Se usa solo para soporte y auditoría.

### Roles

| Rol | Alcance | Resumen |
|---|---|---|
| `ORG_ADMIN` | organización | Todo lo del FM + usuarios, configuración de estados y rubros |
| `FACILITY_MANAGER` | organización | Operación completa: tickets, presupuestos, pagos, preventivos, reportes |
| `CLIENT` | clientes asignados vía `client_access` | Ver sus propiedades, crear solicitudes, aprobar presupuestos, ver gastos y reportes publicados |
| `PROVIDER` | reservado | Sin acceso en el MVP (portal de proveedores en F8) |

### Reglas

1. Toda consulta de usuario corre con `db.rls(ctx)` ([ADR-002](ADR-002-drizzle.md)).
2. Organización activa: se envía en cada request y se valida contra `memberships`. Si el usuario tiene una sola membresía, se infiere.
3. Las funciones helper de RLS (`app_private.is_member`, `has_role`, `can_access_property`) son `SECURITY DEFINER`, con `search_path` fijo y `(select auth.uid())` para que Postgres las evalúe una sola vez por consulta.
4. **Índices:** todo índice de tabla de negocio empieza por `organization_id` cuando la consulta filtra por organización.
5. **Numeración legible por organización:** `TK-2026-0042`, `PR-2026-0007`. Nunca derivada de la posición de la fila.
6. **Storage:**
   - Bucket privado con rutas `org/{organization_id}/...`.
   - `storage.objects` **sin políticas** para `anon`/`authenticated`: se deniega todo acceso directo.
   - Subidas y descargas solo con URLs firmadas que emite la API después de verificar el acceso con `db.rls` (detalle en F3).
7. **Tests:** cada tabla nueva agrega su caso a la suite de aislamiento (F1-T16). Un PR sin ese test no se mergea.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Single-tenant ahora, migrar después | La migración más cara posible; reescribe permisos y datos. |
| Esquema por organización | Migraciones × N organizaciones; operación compleja; no aporta al volumen esperado. |
| Base por organización | Costo fijo por cliente (un proyecto Supabase cada uno); inviable para un SaaS chico. |

## Consecuencias

- ✅ Pasar a SaaS (F8) es un tema de onboarding y cobro, no de reescritura.
- ✅ El aislamiento se puede probar automáticamente.
- ⚠️ "Vecino ruidoso": una organización grande afecta a las demás → índices por `organization_id`, límites por plan (F8), métricas por organización.
- ⚠️ El rendimiento de RLS depende de índices en `memberships(user_id, organization_id)` y `client_access(user_id, client_id)`.
- ⚠️ Estimación: +3 a 4 días de trabajo en F1 respecto de un modelo single-tenant.
