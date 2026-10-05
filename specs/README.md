# Specs — Maintix

> **Estado:** Propuesta (2026-09-17). Mientras los ADR no estén aceptados (F0-T01), `/docs` sigue siendo la fuente oficial. Al aceptarse, `/docs` se actualiza (F0-T03, F0-T04) y estas specs pasan a ser el plan de implementación vigente.

## Índice

| Documento | Contenido |
|---|---|
| [00-propuesta-escalabilidad.md](00-propuesta-escalabilidad.md) | Resumen ejecutivo, mejoras, costos, plan, KPIs, supuestos y bloqueantes |
| [01-entregas-r1-r2.md](01-entregas-r1-r2.md) | Qué tareas entran en la entrega interna (R1) y cuáles en la de clientes piloto (R2) |
| [adr/ADR-001-supabase.md](adr/ADR-001-supabase.md) | Supabase como plataforma de datos |
| [adr/ADR-002-drizzle.md](adr/ADR-002-drizzle.md) | Drizzle en lugar de Prisma |
| [adr/ADR-003-multi-tenant.md](adr/ADR-003-multi-tenant.md) | Multi-empresa desde el día 1 |
| [adr/ADR-004-workflow-configurable.md](adr/ADR-004-workflow-configurable.md) | Estados de ticket como datos |

| Fase | Spec | Tareas | Cantidad | Esfuerzo máx. |
|---|---|---|---|---|
| F0 Fundaciones | [spec](fase-00-fundaciones/spec.md) | [tareas](fase-00-fundaciones/tareas.md) | 18 | 7,8 días |
| F1 Núcleo multi-empresa y seguridad | [spec](fase-01-nucleo-multi-empresa/spec.md) | [tareas](fase-01-nucleo-multi-empresa/tareas.md) | 18 | 10,2 días |
| F2 Catálogos | [spec](fase-02-catalogos/spec.md) | [tareas](fase-02-catalogos/tareas.md) | 15 | 6,5 días |
| F3 Tickets, estados y evidencias | [spec](fase-03-tickets-y-estados/spec.md) | [tareas](fase-03-tickets-y-estados/tareas.md) | 22 | 14,0 días |
| F4 Presupuestos, aprobación y gastos | [spec](fase-04-presupuestos-y-gastos/spec.md) | [tareas](fase-04-presupuestos-y-gastos/tareas.md) | 18 | 10,8 días |
| F5 Preventivos, hallazgos y jobs | [spec](fase-05-preventivos-y-hallazgos/spec.md) | [tareas](fase-05-preventivos-y-hallazgos/tareas.md) | 16 | 8,8 días |
| F6 Dashboards, reportes y notificaciones | [spec](fase-06-dashboards-reportes-notificaciones/spec.md) | [tareas](fase-06-dashboards-reportes-notificaciones/tareas.md) | 18 | 12,2 días |
| F7 Migración y lanzamiento | [spec](fase-07-migracion-y-lanzamiento/spec.md) | [tareas](fase-07-migracion-y-lanzamiento/tareas.md) | 18 | 12,8 días |
| F8 Escala SaaS (post-MVP) | [spec](fase-08-escala-saas/spec.md) | — | — | — |
| **Total MVP** | | | **143** | **≤ 83 días-persona** |

## Cómo trabajar con estas specs

1. **Orden:** respetar el campo **Depende de** de cada tarea. Las tareas sin dependencias entre sí se pueden hacer en paralelo.
2. **Una tarea = una rama = un PR.**
   - Rama: `feature/<scope>` según CONTRIBUTING (por ejemplo, `feature/tickets`), con el ID de la tarea en el título del PR.
   - Commits: `tipo(scope): descripción`. Ejemplo: `feat(tickets): F3-T07 transition ticket use case`.
3. **Antes de usar una API o SDK externo:** verificar la documentación vigente con context7 (Next.js, Supabase, Drizzle, librerías de email, PDF y push).
4. **Si una tarea no entra en 1 día:** dividirla y actualizar `tareas.md` en el mismo PR.
5. **Si una regla de negocio es ambigua:** frenar y preguntar al responsable de producto. No se inventa.

## Formato de tarea

```markdown
### F#-T## · Título
- **Depende de:** IDs o —
- **Qué:** resultado único y verificable
- **Criterios de aceptación:**
  - [ ] condición observable
- **Tests:** qué tests prueban la tarea
- **Tamaño:** S | M | L
- **Bloqueante externo:** (opcional) qué se necesita de afuera
```

| Tamaño | Tope |
|---|---|
| **S** | ≤ 2 h |
| **M** | ≤ 4 h |
| **L** | ≤ 1 día |

No existen tareas de más de 1 día: si aparece una, se divide.

## Definition of Done (todas las tareas)

- [ ] Compila; `typecheck`, `lint` y tests en verde en CI.
- [ ] Criterios de aceptación de la tarea verificados.
- [ ] **Tabla nueva:** RLS habilitado + políticas + caso agregado a la suite de aislamiento (F1-T16).
- [ ] **Mutación de datos de negocio:** registra `activity_log` en la misma transacción.
- [ ] **Endpoint nuevo:** schema zod, error problem+json, aparece en OpenAPI y tiene test por rol.
- [ ] **Respuesta visible para `CLIENT`:** test de contrato que asegura que no hay datos internos.
- [ ] Sin `adminDb` en código de request.
- [ ] Migración generada con `drizzle-kit` y aplicada en local sin errores.
- [ ] Documentación actualizada si cambia un contrato, una regla o un flujo (`/docs`).
- [ ] PR revisado y aprobado; tamaño razonable (orientativo: ≤ 400 líneas netas sin contar migraciones y fixtures).
