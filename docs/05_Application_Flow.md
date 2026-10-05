# 05 - Application Flow

**Proyecto:** Maintix Platform

---

# Objetivo

Definir el flujo de navegación de la aplicación para cada tipo de usuario.

---

# Roles

## Facility Manager

Usuario operativo.

Acceso completo.

## Cliente

Vista simplificada.

Solo puede visualizar y generar solicitudes.

## Administrador

Configuración global de la plataforma.

---

# Flujo Facility Manager

```text
Login
↓
Dashboard
↓
Seleccionar Cliente
↓
Seleccionar Propiedad
↓
Resumen
↓
Solicitudes
↓
Detalle Solicitud
↓
Presupuesto
↓
Proveedor
↓
Evidencias
↓
Finalizar
```

---

# Dashboard FM

Visualiza

- Solicitudes abiertas
- Preventivos próximos
- Presupuestos pendientes
- Trabajos en curso
- KPIs
- Costos
- Actividad reciente

---

# Menú Principal FM

Dashboard

Clientes

Propiedades

Solicitudes

Preventivos

Proveedores

Documentos

Reportes

Configuración

Perfil

---

# Flujo Cliente

```text
Login
↓
Mis Propiedades
↓
Seleccionar Propiedad
↓
Dashboard
↓
Nueva Solicitud
↓
Seguimiento
↓
Historial
↓
Reportes
```

---

# Dashboard Cliente

Visualiza

- Estado general
- Trabajos en curso
- Preventivos realizados
- Próximos mantenimientos
- Documentación
- Reportes
- Fotos

No visualiza información administrativa.

---

# Menú Cliente

Inicio

Mis Propiedades

Solicitudes

Documentos

Reportes

Perfil

---

# Navegación Mobile

Bottom Navigation

Inicio

Solicitudes

Propiedades

Reportes

Perfil

---

# Navegación Web

Sidebar

Dashboard

Clientes

Propiedades

Solicitudes

Preventivos

Proveedores

Documentación

Reportes

Configuración

---

# Flujo Nueva Solicitud

```text
Seleccionar Propiedad
↓
Seleccionar Tipo
↓
Prioridad
↓
Descripción
↓
Agregar Fotos
↓
Adjuntar Archivos
↓
Enviar
↓
Confirmación
```

---

# Flujo Preventivo

```text
Dashboard
↓
Preventivos
↓
Seleccionar Preventivo
↓
Registrar ejecución
↓
Agregar Evidencias
↓
Cerrar
```

---

# Flujo Reportes

```text
Dashboard
↓
Seleccionar Propiedad
↓
Seleccionar Período
↓
Generar PDF
↓
Compartir / Descargar
```

---

# Principios UX

- Mobile First.
- Máximo tres niveles de navegación.
- Acciones frecuentes accesibles en un clic.
- Información resumida para clientes.
- Información operativa completa para Facility Managers.
- Modo claro y modo oscuro.
- Diseño premium y minimalista.
