# VokabelLab

Repositorio de trabajo de **VokabelLab**, centrado en vocabulario, ejercicios y conexión con Supabase.

## Estado actual

Este repositorio ya fue separado de **imKontext** y ahora queda dedicado únicamente a **VokabelLab**.

Su función actual es servir como base ligera para seguir iterando sobre:

- el frontend actual de VokabelLab
- la conexión con Supabase
- el backend mínimo necesario para exponer vocabulario
- futuras mejoras visuales y funcionales

## Qué contiene ahora

Actualmente el repositorio conserva una estructura mínima:

- `package.json`
- `server.js`
- copia de seguridad del HTML actual de VokabelLab para seguir trabajándolo directamente

## Frontend

El frontend actual de VokabelLab sigue apoyándose en una base simple:

- archivo principal en `index.html`
- estilos todavía incrustados o pendientes de separarse mejor
- estructura visual en proceso de actualización

Se ha subido una **copia de seguridad del HTML actual** para poder seguir iterando directamente sobre ella cada vez que se hagan cambios.

## Backend

El backend actual es una base mínima con **Node.js**, **Express** y **Supabase**.

Incluye actualmente:

- `GET /api/health`
- `GET /api/vocabulario`

### `GET /api/health`
Comprueba si el servidor está corriendo y si Supabase está configurado correctamente.

### `GET /api/vocabulario`
Consulta la tabla `vocabulario` en Supabase y transforma los datos al formato que utiliza el frontend.

Formato devuelto:

- `aleman`
- `espanol`
- `categoria`
- `frase`
- `nivel`

## Base de datos

La base de datos está en **Supabase**.

La tabla usada actualmente por el backend es:

- `vocabulario`

Campos consultados:

- `id`
- `german`
- `word_type`
- `spanish`
- `example_sentence_de`
- `level`
- `article`

## Stack actual

```json
{
  "name": "aleman-backend",
  "version": "1.0.0",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.2"
  }
}
