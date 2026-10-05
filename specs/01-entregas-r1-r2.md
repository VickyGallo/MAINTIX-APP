# Entregas R1 y R2

> **Origen:** `Reporte_Arquitectura_Facility_Management_VERSION_REFORMULADA.docx` (octubre 2026), etapas 1 y 2: validar primero con uso interno y después abrir a clientes piloto.
> Las fases y las tareas no cambian: esta tabla solo define **en qué entrega** sale cada tarea.

## Resumen

| Entrega | Para quién | Qué valida | Tareas | Esfuerzo máx. |
|---|---|---|---|---|
| **R1 — Uso interno** | Nicolás (FM) y el equipo gestor | Que el sistema reemplaza al Excel en la operación diaria | 126 | ≤ 71,2 días-persona |
| **R2 — Clientes piloto** | 1 o 2 propietarios | Que el acceso del cliente aporta valor (solicitar, aprobar, ver avances y reportes) | 17 | ≤ 11,8 días-persona |
| **Total** | | | **143** | **≤ 83,0 días-persona** |

**R1 se lleva la mayor parte del esfuerzo** porque casi todo el sistema es operación del FM: tickets, estados, presupuestos, pagos, preventivos, migración y seguridad. Lo que se gana es salir a producción **sin** la parte del cliente (pantallas, notificaciones push, reportes, legales), validar con el FM y decidir con datos reales cómo abrir a los clientes.

## Tareas de R2

Toda tarea que **no** figura en esta lista pertenece a R1.

| Tarea | Por qué es R2 |
|---|---|
| F2-T15 · UI Cliente: "Mis propiedades" | Pantalla del cliente |
| F3-T06 · Casos de uso del cliente: solicitar y cancelar | Solo tiene sentido con clientes con acceso |
| F3-T15 · UI Cliente: nueva solicitud | Pantalla del cliente |
| F3-T16 · UI Cliente: mis solicitudes | Pantalla del cliente |
| F4-T05 · Decisión del cliente (aprobar/rechazar) | En R1 el FM registra las decisiones que recibe por mail o WhatsApp (F4-T06) |
| F4-T17 · UI Cliente: "Requiere tu aprobación" | Pantalla del cliente |
| F6-T05 · Canal Web Push | Pensado para el propietario; en R1 alcanzan in-app y email |
| F6-T11 · API del dashboard del propietario | Vista del cliente |
| F6-T12 · UI del dashboard del propietario | Vista del cliente |
| F6-T13 · Motor de reportes PDF | Los reportes se entregan al cliente |
| F6-T14 · Plantilla: informe mensual | Idem |
| F6-T15 · Plantilla: Dossier de Mejora | Idem |
| F6-T16 · UI de reportes | Idem |
| F6-T17 · E2E de notificaciones y reportes | Prueba el circuito con el cliente |
| F6-T18 · Generación periódica del informe mensual | Depende de los reportes |
| F7-T10 · Privacidad y legales | Obligatorio cuando entran usuarios externos |
| F7-T18 · Apertura a clientes piloto | Es la salida de R2 |

## Ajustes en R1 por no tener clientes

- **F3-T21 (E2E del flujo principal):** en R1 el ticket lo crea el FM, no el cliente. El paso "el cliente ve Coordinado" se verifica en R2 con F6-T17.
- **F4-T12 (API de presupuestos):** los endpoints de decisión del cliente se construyen en R1 (bajo costo), pero no tienen pantalla hasta R2.
- **F6-T08:** los recordatorios de aprobación al cliente quedan apagados hasta R2; el resumen diario del FM funciona desde R1.
- **F7-T17:** la salida a producción de R1 invita solo al equipo del FM.

## Orden sugerido

```
R1:  F0 → F1 → F2 → F3 → F4 ─┬─► F6 (parte FM) → F7 (migración, seguridad, UAT interna, salida)
                             └─► F5 ──┘
R2:  tareas R2 de F2/F3/F4/F6 → F7-T10 (legales) → F7-T18 (apertura a pilotos)
```
