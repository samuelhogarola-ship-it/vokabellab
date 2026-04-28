# Deploy en Hostinger

Este proyecto esta preparado para desplegarse como **una sola Node app**.

## Estructura correcta

Hostinger debe apuntar a la raiz del proyecto, donde viven:

- `package.json`
- `package-lock.json`
- `server.js`
- `index.html`
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

Si Hostinger intenta ejecutar algo tipo:

```bash
cd frontend && npm install
```

esa configuracion es incorrecta para este proyecto.
La app debe desplegarse desde la **raiz del repositorio**.

## Nota de mantenimiento

Este repo ya no usa seeds sueltos ni imports manuales en la raiz.
La referencia versionada para base de datos debe mantenerse en:

- `supabase/migrations/`
