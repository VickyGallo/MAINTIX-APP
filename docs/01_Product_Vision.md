# Documento 01 — Product Architecture

## 1. Visión del Producto

### Objetivo

Facility Management App es una plataforma diseñada para digitalizar y centralizar la gestión operativa de propiedades de alto valor.

Su propósito no es únicamente registrar incidencias o tareas de mantenimiento, sino ofrecer una visión integral del estado de cada propiedad, facilitando la coordinación entre Facility Managers, propietarios y, en una etapa futura, proveedores.

El producto busca transformar procesos que hoy dependen de llamadas, mensajes de WhatsApp, planillas y conocimiento informal en un sistema único, trazable y escalable.

## 2. Problema que resuelve

Actualmente la operación diaria de un Facility Manager presenta varios desafíos:

- Información distribuida entre WhatsApp, correos electrónicos y planillas.
- Falta de trazabilidad sobre trabajos realizados.
- Dificultad para demostrar al propietario el valor del servicio.
- Escaso seguimiento de mantenimientos preventivos.
- Documentación fotográfica desorganizada.
- Dependencia del conocimiento personal del administrador.

La aplicación centraliza toda esa información y la convierte en un flujo de trabajo estructurado.

## 3. Filosofía del Producto

La aplicación no fue concebida como un sistema de tickets tradicional.

Su objetivo principal es transmitir al propietario confianza, transparencia y control sobre el estado de su patrimonio.

Cada funcionalidad debe responder al siguiente principio:

> "El propietario debe sentir que su propiedad está siendo cuidada, incluso cuando no está presente."

Por este motivo la experiencia prioriza:

- claridad
- simplicidad
- evidencia visual
- trazabilidad
- comunicación

antes que la complejidad técnica.

## 4. Usuarios del Sistema

El producto contempla tres perfiles principales.

### Facility Manager

Responsable operativo.

Gestiona la totalidad del sistema.

Funciones principales:

- administrar propiedades
- gestionar tickets
- coordinar proveedores
- controlar preventivos
- registrar hallazgos
- generar reportes
- consultar indicadores

### Propietario

Cliente del servicio.

Posee una experiencia simplificada enfocada en consultar el estado de sus propiedades y realizar solicitudes.

Puede:

- crear pedidos
- consultar trabajos
- aprobar presupuestos
- visualizar fotografías
- descargar reportes

No posee acceso a información administrativa interna.

### Proveedor (Etapa futura)

Participa únicamente sobre tareas asignadas.

Puede:

- consultar trabajos
- subir fotografías
- informar avances
- confirmar finalización

## 5. Principios de Diseño

Durante toda la evolución del producto deberán respetarse los siguientes principios.

### Simplicidad

Cada pantalla debe mostrar únicamente la información necesaria para el usuario actual.

### Transparencia

Todo trabajo realizado debe poder justificarse mediante evidencia.

### Trazabilidad

Cada acción debe quedar registrada.

Nunca debe perderse el historial de una propiedad.

### Escalabilidad

La solución debe poder migrar desde AppSheet hacia una arquitectura propia sin modificar las reglas del negocio.

### Mobile First

La operación diaria ocurre desde dispositivos móviles.

Toda funcionalidad crítica debe poder ejecutarse desde un teléfono.

## 6. Alcance del MVP

La primera versión del producto incluye:

- Gestión de propiedades
- Gestión de clientes
- Gestión de proveedores
- Tickets correctivos
- Plan maestro de preventivos
- Evidencia fotográfica
- Hallazgos
- Dashboard FM
- Dashboard Propietario
- Generación de PDF
- Dictado por voz
- Automatizaciones básicas

## 7. Funcionalidades futuras

La arquitectura fue diseñada considerando futuras extensiones como:

- Portal de proveedores
- WhatsApp Business
- Firma digital
- IA para clasificación de incidencias
- OCR sobre facturas
- Dashboard financiero
- Aplicación React Native
- SaaS multiempresa
- Multi tenant
- Integración con ERPs

## 8. Arquitectura Conceptual

```text
                Facility Management Platform
                    ┌──────────────┐
                    │ Propietarios │
                    └──────┬───────┘
                           │
                           │
                    ┌──────▼──────┐
                    │  Dashboard  │
                    └──────┬──────┘
                           │
         ┌─────────────────┼──────────────────┐
         │                 │                  │
         ▼                 ▼                  ▼
   Propiedades       Tickets         Preventivos
         │                 │                  │
         │                 │                  │
         ▼                 ▼                  ▼
   Proveedores      Evidencias       Hallazgos
         │                 │                  │
         └─────────────────┼──────────────────┘
                           │
                           ▼
                    Reportes / PDFs
```

## 9. Objetivo del MVP

El MVP no busca validar si es posible construir la aplicación.

Busca validar si un Facility Manager obtiene suficiente valor operativo como para adoptar la plataforma en su trabajo diario y convertirla en una herramienta indispensable.
