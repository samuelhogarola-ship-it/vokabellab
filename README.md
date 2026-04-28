# Vokabel Lab

Aplicacion de vocabulario de aleman con:

- landing y practica en `index.html`
- backend minimo en `server.js`
- base de datos en Supabase

## Estructura actual

Este repositorio esta preparado como **una sola Node app**.

Archivos clave en la raiz:

- `package.json`
- `package-lock.json`
- `server.js`
- `index.html`
- `logo-small.webp`
- `logo-hero.webp`

No requiere carpeta `frontend/`.

## Como funciona

`server.js` sirve tanto el frontend como la API:

- `GET /`
- `GET /api/health`
- `GET /api/resumen`
- `GET /api/vocabulario`

El frontend llama a la API y renderiza:

- `Thema`
- `Nomen`
- `Verb`
- `Ausdruck`
- `Adjektiv/Adverb`

## Variables de entorno

Copia `.env.example` a `.env` en desarrollo y define:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Opcional:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`

## Esquema actual de Supabase

Tabla principal:

- `public.vocabulario`

Campos usados por la app:

- `id`
- `de`
- `es`
- `artikel`
- `type`
- `thema`
- `thema_id`
- `is_active`

La API filtra por `is_active = true`.

## Base de datos y migraciones

La fuente de verdad para cambios de base de datos es:

- `supabase/migrations/`

Los `.sql` sueltos de importacion o pruebas ya no forman parte de la estructura principal del repo.

## Desarrollo local

Instalar dependencias:

```bash
npm install
```

Arrancar:

```bash
npm start
```

## Deploy en Hostinger

Despliega esta app como **Node app desde la raiz del repositorio**.

No uses scripts del estilo:

```bash
cd frontend && npm install
```

porque este proyecto no tiene estructura separada de frontend/backend.

Guia rapida:

- `HOSTINGER_DEPLOY.md`
- `PROJECT_STRUCTURE.md`
