# Deploy en Hostinger

Este proyecto esta preparado para desplegarse como **una sola Node app**.

## Estructura correcta

Hostinger debe apuntar a la raiz del proyecto, donde viven:

- `package.json`
- `package-lock.json`
- `server.js`
- `index.html`
- `styles.css`
- `app.js`
- `practice.js`
- `logo-small.webp`
- `logo-hero.webp`

No necesita carpeta `frontend/` ni una app separada para backend.

## Comando de inicio

Usa:

```bash
npm start
```

## Variables de entorno

Configura en Hostinger:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Opcional:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PORT`

## Que sirve esta app

- `GET /` -> `index.html`
- `GET /api/health`
- `GET /api/resumen`
- `GET /api/vocabulario`

## Nota importante

La app debe desplegarse desde la **raiz del repositorio**.

## Nota de mantenimiento

- `app.js` carga el shell principal
- `practice.js` se carga solo cuando el usuario entra al laboratorio
- `supabase/migrations/` es la referencia versionada para base de datos
