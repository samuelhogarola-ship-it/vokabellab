# Vokabel Lab: estructura recomendada para pasar a Node

## Objetivo
Mantener `Supabase` como base de datos y auth, y mover solo la capa web a una app Node cuando te venga bien.

## Qué dejamos estable desde hoy
- `public.vocabulario`: catálogo maestro de palabras.
- `public.profiles`: perfil básico ligado a `auth.users`.
- `public.user_progress`: progreso por palabra y usuario.
- `public.study_sessions`: sesiones de práctica.
- `public.session_answers`: respuestas individuales para analítica futura.

Si mantienes estas tablas, la futura migración a Node no debería requerir cambios de datos.

## Arquitectura recomendada por fases

### Fase 1: ahora
- Hosting web actual en Hostinger.
- Frontend simple.
- Supabase para datos y login.
- Sin backend propio.

### Fase 2: con usuarios reales
- Login con Supabase Auth.
- Guardar progreso en `user_progress`.
- Registrar sesiones en `study_sessions`.
- Mantener RLS activa para que cada usuario vea solo sus datos.

### Fase 3: migración a Node web app
- Mantener Supabase como Postgres y Auth.
- Crear una app Node con SSR o API routes.
- Usar cliente público en navegador solo para acciones seguras.
- Mover lógica más delicada al servidor si hace falta.

## Stack razonable para la futura Node app
- `Next.js` si quieres SSR, rutas y panel admin con poco roce.
- `Express` o `Fastify` si quieres algo más manual.
- `@supabase/supabase-js` como cliente principal.
- Variables de entorno:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` solo en servidor

## Qué lógica dejaría en frontend
- Cargar vocabulario público.
- Navegación entre modos de estudio.
- UI de tarjetas, test y escritura.
- Estadísticas temporales de la sesión actual.

## Qué lógica movería luego al servidor
- Panel admin para importar o editar vocabulario en lote.
- Reglas de spaced repetition más sofisticadas.
- Informes agregados.
- Pagos y webhooks.
- Acciones que usen claves privadas.

## API shape recomendada si más adelante añades backend propio

### Lectura pública
- `GET /api/vocabulario?thema=4&type=Verb`
- `GET /api/themas`

### Usuario autenticado
- `GET /api/me/progress`
- `POST /api/me/progress`
- `POST /api/me/sessions`
- `POST /api/me/session-answers`

### Admin
- `POST /api/admin/vocabulario/import`
- `PATCH /api/admin/vocabulario/:id`
- `DELETE /api/admin/vocabulario/:id`

## Decisiones que te ahorran rehacer trabajo
- Usa `uuid` para tablas de usuario y sesiones.
- Mantén `vocabulario.id` estable.
- No hagas `de` único: la misma palabra puede aparecer en varios temas o con matices distintos.
- No mezcles progreso de usuario dentro de la tabla `vocabulario`.
- Guarda filtros de sesión (`selected_themas`, `selected_types`) para analítica.
- Separa catálogo, progreso y eventos.

## Qué haría justo después de esta fase
1. Crear las tablas con [`supabase_schema.sql`](/Users/sam/Downloads/Vokabel%20Lab/supabase_schema.sql).
2. Importar `vocabulario`.
3. Conectar la web actual a Supabase.
4. Añadir login.
5. Empezar a persistir progreso por usuario.
