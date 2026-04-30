# Estructura recomendada del proyecto

Esta app esta organizada para poder crecer sin volver a un HTML monolitico dificil de mantener.

## Regla base

Mantener **una sola app Node** en la raiz del proyecto.

## Capas actuales

### Shell de aplicacion

- `index.html`
- `styles.css`
- `app.js`

Responsabilidades:

- layout general
- home
- navegacion entre pantallas
- resumen del catalogo
- carga inicial ligera
- punto de entrada para futuras capas de auth y admin

### Runtime de practica

- `practice.js`
- `shared/answer-utils.js`
- `shared/practice-core.js`
- `shared/flashcard-core.js`

Responsabilidades:

- sesion de estudio
- tarjetas
- escribir
- multiple choice
- tabla de palabras
- helpers puros reutilizables para normalizacion, scoring y estado compartido

Esta capa se carga **bajo demanda** para ayudar al `Time to Interactive`.

## Regla de seguridad para scripts clasicos

El bug corregido en la PR #3 dejo una restriccion clara para futuras extracciones:

- no redeclarar `const Lab` ni otros bindings globales compartidos entre `app.js` y `practice.js`
- cualquier logica reutilizable nueva debe entrar primero en `shared/`
- `shared/` debe mantenerse puro, sin DOM, sin framework y sin dependencias de Supabase

### Backend

- `server.js`

Responsabilidades:

- servir frontend
- exponer API
- hablar con Supabase
- cachear resumen y vocabulario

### Base de datos

- `supabase/migrations/`

Unica fuente de verdad versionada para cambios de esquema o carga controlada.

## Evolucion recomendada

Cuando aparezca login o panel maestro:

- crear `auth.js` o `scripts/auth/`
- crear `admin.js` o `scripts/admin/`
- mantener `app.js` como shell/orquestador
- no mezclar logica de practica con permisos de usuario

## Que no deberia volver a entrar al repo

- seeds sueltos en la raiz
- exports manuales de tablas
- logos antiguos no usados
- documentos de migracion ya cerrados
- archivos temporales de pruebas

## Criterio para futuras versiones

Si algo cumple una de estas condiciones, puede quedarse:

- lo usa produccion
- lo usa el deploy
- lo necesitamos para desarrollo diario
- es documentacion viva
- es una migracion versionada

Si no cumple ninguna, mejor fuera del repo.
