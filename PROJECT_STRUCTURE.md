# Estructura recomendada del proyecto

Esta app esta organizada para que podamos evolucionarla sin volver a llenar el repo de archivos temporales.

## Regla base

Mantener **una sola app Node** en la raiz del proyecto.

Archivos base:

- `index.html`
- `server.js`
- `package.json`
- `package-lock.json`
- `.env.example`

Assets activos:

- `logo-small.webp`
- `logo-hero.webp`

## Donde va cada cosa

### Frontend

- `index.html`
- si el frontend crece mucho, extraer a:
  - `styles/`
  - `scripts/`
  - `assets/`

### Backend

- `server.js`
- si el backend crece mucho, extraer a:
  - `api/`
  - `lib/`
  - `services/`

### Base de datos

- usar `supabase/migrations/` como unica fuente de verdad versionada
- no dejar `.sql` sueltos en la raiz salvo que sean temporales y no se suban

### Documentacion

Mantener solo documentos vivos:

- `README.md`
- `HOSTINGER_DEPLOY.md`
- `PROJECT_STRUCTURE.md`

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
