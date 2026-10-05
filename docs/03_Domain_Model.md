# 03 - Domain Model

**Proyecto:** Maintix Platform

**Versión:** 1.0

---

# Objetivo

Definir el dominio funcional de Maintix, identificando las entidades principales del negocio, sus responsabilidades y relaciones.

Este documento representa el modelo conceptual del sistema y será la base para el diseño del modelo de datos, la API y la implementación del backend.

---

# Entidad: Cliente

Representa la persona, empresa o institución que contrata los servicios de Facility Management.

## Responsabilidades

- Administrar una o más propiedades.
- Crear solicitudes.
- Aprobar presupuestos.
- Consultar reportes.
- Visualizar documentación.
- Recibir notificaciones.

---

# Entidad: Propiedad

Es el activo principal administrado dentro de Maintix.

Una propiedad puede representar:

- Vivienda
- Departamento
- Oficina
- Campo
- Planta Industrial
- Local Comercial
- Barrio Privado
- Hotel

## Responsabilidades

- Centralizar toda la información operativa.
- Asociar solicitudes.
- Asociar preventivos.
- Asociar documentación.
- Asociar activos.
- Generar historial.

---

# Entidad: Solicitud

Representa cualquier trabajo solicitado sobre una propiedad.

## Origen

- Cliente
- Facility Manager
- Preventivo

## Tipos

- Correctivo
- Preventivo
- Emergencia
- Mejora
- Remodelación
- Inspección

## Estados

- Nueva
- En revisión
- Cotizando
- Pendiente de aprobación
- Aprobada
- En ejecución
- Finalizada
- Cancelada

---

# Entidad: Activo

Representa cualquier elemento físico administrado dentro de una propiedad.

Ejemplos

- Caldera
- Ascensor
- Grupo electrógeno
- Sistema de riego
- Aires acondicionados
- Cámaras
- Portón automático
- Piscina

Cada activo podrá tener:

- Manuales
- Garantías
- Historial
- Fotografías
- Preventivos asociados

---

# Entidad: Preventivo

Representa un mantenimiento programado.

Puede generarse:

- Por calendario
- Por cantidad de usos
- Por normativa
- Manualmente

---

# Entidad: Proveedor

Empresa o profesional encargado de ejecutar trabajos.

Puede estar asociado a:

- Solicitudes
- Preventivos
- Presupuestos

No posee acceso al sistema en la versión MVP.

---

# Entidad: Presupuesto

Documento económico asociado a una solicitud.

Estados

- Solicitado
- Recibido
- Aprobado
- Rechazado

Puede contener uno o más archivos PDF.

---

# Entidad: Evidencia

Registro visual o documental asociado a una solicitud.

Ejemplos

- Fotografías
- Videos
- PDFs
- Notas técnicas

---

# Entidad: Documento

Repositorio documental permanente.

Ejemplos

- Manuales
- Garantías
- Planos
- Certificados
- Contratos
- Facturas
- Informes

---

# Entidad: Reporte

Documento generado automáticamente por la plataforma.

Tipos

- Ejecutivo
- Mensual
- Historial
- Preventivos
- Costos
- KPIs

Formato

- PDF

---

# Relaciones Principales

```text
Cliente
↓
Propiedades
↓
Activos
↓
Solicitudes
↓
Presupuestos
↓
Proveedor
↓
Evidencias
↓
Reportes
```

---

# Principios del Dominio

- Toda solicitud pertenece a una propiedad.
- Todo activo pertenece a una propiedad.
- Todo presupuesto pertenece a una solicitud.
- Toda evidencia pertenece a una solicitud.
- Todo reporte pertenece a un cliente y una propiedad.
- La propiedad constituye el agregado principal del dominio.
