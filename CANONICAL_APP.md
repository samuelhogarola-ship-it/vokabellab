# App canonica

Este repositorio, `vokabellab`, es la fuente activa de la app.

## Que esta en produccion

- Hostinger sirve esta app como **Node app**
- `server.js` expone:
  - `GET /`
  - `GET /api/health`
  - `GET /api/resumen`
  - `GET /api/vocabulario`
- el frontend lo sirven los mismos archivos de raiz:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `practice.js`

## Que no debe considerarse fuente activa

- el repo o carpeta `VokabelLab.node`
- cualquier prueba abierta con `file://.../index.html`

`file://` puede renderizar el HTML, pero no representa el entorno real de produccion.

## Regla de trabajo

Antes de tocar codigo:

1. comprobar que el remoto apunta a `samuelhogarola-ship-it/vokabellab`
2. trabajar sobre la rama del repo canonico
3. probar por `http://localhost:3000` y no por `file://`

## Siguiente limpieza recomendada

1. archivar el repo `VokabelLab.node` en GitHub
2. renombrar la carpeta local duplicada para marcarla como legado o moverla fuera de `Desktop/webs`
3. mantener solo `vokabellab` como fuente viva
