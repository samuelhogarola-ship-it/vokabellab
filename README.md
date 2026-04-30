# Vokabel Lab

Aplicacion de vocabulario de aleman con:

- landing y practica en `index.html`
- estilos separados en `styles.css`
- runtime principal en `app.js`
- runtime de practica en `practice.js`
- backend minimo en `server.js`
- base de datos en Supabase

## Estructura actual

Este repositorio esta preparado como **una sola Node app**.

Archivos clave en la raiz:

- `package.json`
- `package-lock.json`
- `server.js`
- `index.html`
- `styles.css`
- `app.js`
- `practice.js`
- `logo-small.webp`
- `logo-hero.webp`

No requiere carpeta `frontend/`.

## Como funciona

`server.js` sirve tanto el frontend como la API:

- `GET /`
- `GET /api/health`
- `GET /api/resumen`
- `GET /api/vocabulario`

El frontend se divide asi:

- `index.html`: estructura y pantallas
- `styles.css`: estilos compartidos
- `app.js`: home, navegacion, resumen, carga de datos y shell de aplicacion
- `practice.js`: logica de practica, cargada bajo demanda al entrar al laboratorio
- `shared/`: helpers puros para reutilizar logica de respuestas, sesiones y tarjetas sin tocar UI

## Nota importante del split `app.js` / `practice.js`

Despues de separar el frontend, hubo un fallo silencioso donde `practice.js` dejaba de cargar por una redeclaracion global de `const Lab`.

Regla a mantener a partir de aqui:

- `window.VokabelLab` se inicializa una sola vez en `app.js`
- los scripts clasicos no deben redeclarar bindings globales ya usados por otros archivos
- la logica compartida nueva debe vivir en helpers puros dentro de `shared/` antes de entrar en `app.js` o `practice.js`

## Preparado para futuras versiones

La app ya deja una base minima para crecer hacia:

- login de usuarios
- niveles/roles
- panel maestro o admin panel

La configuracion inicial vive en `window.VokabelLab` dentro de `app.js`.

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

Guia rapida:

- `HOSTINGER_DEPLOY.md`
- `PROJECT_STRUCTURE.md`
