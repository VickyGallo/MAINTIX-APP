# Contributing Guide

Proyecto: Maintix Platform

---

# Objetivo

Este documento define las reglas de desarrollo del proyecto Maintix.

Todos los colaboradores humanos y herramientas de IA deberán respetar estas reglas.

La documentación ubicada en `/docs` constituye la única fuente oficial de verdad del proyecto.

Ninguna implementación podrá contradecir la documentación aprobada.

---

# Arquitectura

La arquitectura del proyecto sigue los principios:

- Clean Architecture
- SOLID
- API First
- Mobile First
- Modular Design
- Domain Driven Thinking

No se aceptarán implementaciones que rompan estos principios.

---

# Fuente Oficial

Antes de escribir código deberá consultarse la documentación.

Orden de prioridad:

1. Product Vision

2. Platform Architecture

3. Domain Model

4. Data Model

5. API Contract

6. Backend Architecture

7. Frontend Architecture

El código nunca reemplaza la documentación.

La documentación siempre tiene prioridad.

---

# Herramientas

## NotebookLM

Responsabilidades

- Comprender el proyecto.
- Auditar cambios.
- Detectar inconsistencias.
- Generar prompts para Windsurf.

NotebookLM nunca toma decisiones de arquitectura.

---

## Windsurf

Responsabilidades

- Implementar código.
- Mantener el proyecto compilando.
- Respetar la arquitectura.
- No inventar funcionalidades.

Nunca deberá modificar el dominio del negocio.

Nunca deberá modificar el modelo de datos sin autorización.

---

## ChatGPT

Responsabilidades

- Arquitectura.
- Diseño técnico.
- Revisión.
- Documentación.
- Auditoría.

---

# Reglas de implementación

Antes de comenzar cualquier tarea deberá verificarse:

- Existe documentación suficiente.
- El módulo ya fue aprobado.
- No rompe módulos existentes.

---

# Reglas de código

Todo código debe ser:

- Tipado.
- Modular.
- Reutilizable.
- Testeable.
- Documentado.

No se aceptan soluciones rápidas ("quick fixes") que generen deuda técnica.

---

# Commits

Formato

```text
tipo(scope): descripción
```

Ejemplos

```text
feat(auth): implement JWT login
feat(requests): create request module
fix(properties): resolve image upload
docs(domain): update request lifecycle
refactor(api): simplify property service
```

---

# Branches

```text
feature/auth
feature/properties
feature/requests
feature/preventives
feature/reports
feature/mobile-dashboard
hotfix/...
release/...
```

---

# Pull Requests

Todo Pull Request deberá:

- Compilar.
- Pasar tests.
- Mantener compatibilidad.
- Respetar la arquitectura.

---

# Regla principal

La prioridad del proyecto es mantener una arquitectura consistente.

Es preferible desarrollar más lento antes que incorporar deuda técnica.

La calidad arquitectónica tiene prioridad sobre la velocidad de implementación.
