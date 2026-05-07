# Vokabel Lab

Aplicacion de vocabulario de aleman con:

- landing y practica en `index.html`
- estilos separados en `styles.css`
- runtime principal en `app.js`
- runtime de practica en `practice.js`
- backend minimo en `server.js`
- base de datos en Supabase

## Estado canonico

Este repositorio es la **app canonica actual** de Vokabel Lab.

- Produccion en Hostinger corre como **Node app**
- `server.js` sirve el frontend y la API
- el frontend sigue siendo HTML/CSS/JS clasico, pero **no** es un hosting estatico separado
- la carpeta o repo `VokabelLab.node` debe tratarse como **legado/duplicado**, no como fuente activa

Si estas probando localmente, evita abrir `file://.../index.html` para validar comportamiento real.
Usa siempre la app servida por Node:

```bash
npm start
```

y abre `http://localhost:3000` o el puerto configurado.

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
