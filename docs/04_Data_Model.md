# 04 - Data Model

**Proyecto:** Maintix Platform

**Versión:** 1.0

---

# Objetivo

Definir las entidades principales del sistema, sus responsabilidades, relaciones y estado de implementación.

Este documento representa el modelo lógico de datos y será la base para la creación del esquema Prisma y la base de datos PostgreSQL.

---

# Entidades MVP

## User

Representa un usuario autenticado del sistema.

Tipos

- ADMIN
- FACILITY_MANAGER
- CLIENT

Relaciones

- Puede pertenecer a un Cliente.
- Puede crear Solicitudes.
- Puede generar comentarios.
- Puede recibir notificaciones.

---

## Client

Representa una persona o empresa que contrata el servicio de Facility Management.

Ejemplos

- Eduardo Costantini
- Elina Costantini

Relaciones

- Tiene múltiples propiedades.
- Tiene múltiples usuarios asociados.
- Recibe reportes.

---

## Property

Representa una propiedad física administrada.

Ejemplos

- Nordelta
- Grand Bourg
- Punta del Este

Relaciones

- Pertenece a un Cliente.
- Contiene múltiples Activos.
- Contiene múltiples Solicitudes.
- Contiene múltiples Preventivos.
- Contiene Documentación.
- Contiene Reportes.

---

## Asset

Representa un elemento físico dentro de una propiedad.

Ejemplos

- Caldera
- Grupo electrógeno
- Aire acondicionado
- Piscina
- Portón automático
- Sistema de riego

Relaciones

- Pertenece a una Propiedad.
- Puede tener Preventivos.
- Puede tener Documentación.
- Puede tener Historial.

---

## Request

Representa una solicitud de trabajo.

Origen

- Cliente
- FM
- Preventivo

Estados

- Nueva
- En revisión
- Cotizando
- Pendiente de aprobación
- Aprobada
- En ejecución
- Finalizada
- Cancelada

Relaciones

- Pertenece a una Propiedad.
- Puede tener Presupuestos.
- Puede tener Evidencias.
- Puede asignarse a un Proveedor.

---

## Budget

Representa un presupuesto asociado a una solicitud.

Estados

- Solicitado
- Recibido
- Aprobado
- Rechazado

Relaciones

- Pertenece a una Solicitud.
- Puede contener archivos PDF.

---

## Provider

Proveedor o empresa que realiza trabajos.

Relaciones

- Atiende Solicitudes.
- Ejecuta Preventivos.

No posee acceso al sistema durante el MVP.

---

## Preventive Plan

Representa un plan de mantenimiento.

Ejemplos

- Caldera
- Piscina
- Jardín
- Grupo electrógeno

Relaciones

- Pertenece a un Activo o una Propiedad.
- Genera Solicitudes automáticamente.

---

## Evidence

Registro visual del trabajo realizado.

Tipos

- Imagen
- Video
- PDF
- Audio

Relaciones

- Pertenece a una Solicitud.

---

## Document

Repositorio documental.

Tipos

- Manual
- Garantía
- Plano
- Factura
- Contrato
- Certificado
- Informe

Relaciones

- Puede pertenecer a una Propiedad.
- Puede pertenecer a un Activo.
- Puede pertenecer a una Solicitud.

---

## Report

Documento generado por el sistema.

Tipos

- Ejecutivo
- Mensual
- Historial
- Costos
- KPIs

Formato

- PDF

---

## Notification

Notificaciones del sistema.

Canales

- Push
- Email

Eventos

- Nueva Solicitud
- Cambio de Estado
- Preventivo próximo
- Presupuesto recibido

---

# Entidades futuras (V2)

- Company
- Contact
- Checklist
- Comment
- Activity Log
- Tag
- Calendar
- Integration
- Automation
- AI Assistant

---

# Relaciones principales

```text
Client
↓
Property
↓
Asset
↓
Request
↓
Budget
↓
Provider
↓
Evidence
↓
Report
```

---

# Decisiones de arquitectura

- UUID como clave primaria.
- Soft Delete en todas las entidades principales.
- Auditoría automática (createdAt, updatedAt).
- Relaciones normalizadas.
- PostgreSQL como motor principal.
- Prisma ORM como capa de persistencia.
