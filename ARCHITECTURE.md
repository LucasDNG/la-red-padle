# LA RED Pádel — Arquitectura final

## Principio
Una sola aplicación, un solo motor competitivo y una sola base. No existe coexistencia con el runtime histórico.

## Backend
Node.js 22 + Express 5 + PostgreSQL/Neon.

Módulos:
- `src/core.js`: reglas puras, score, fechas, categorías.
- `src/account.js`: identidad, legales, recuperación y teléfono.
- `src/pairs.js`: invitaciones, parejas, pausa y disolución.
- `src/competitionEngine.js`: escalera, ELO, rachas, ascensos/descensos, eventos.
- `src/wheel.js`: asignación automática, programación, no-show, extensión, resultados y mantenimiento.
- `src/discipline.js`: reportes y estados disciplinarios.
- `src/notifications.js`: notificaciones internas + outbox WhatsApp.
- `src/admin.js`: excepciones administrativas.
- `src/app.js`: API HTTP.
- `src/index.js`: servidor y maintenance horario.

## Base
`database/schema.sql` crea el estado final desde cero.

Tablas separan:
- identidad;
- aceptación legal;
- usuarios/disciplinas;
- parejas/membresías;
- invitaciones;
- rueda;
- programación;
- resultados/versiones;
- partidos oficiales;
- canchas;
- notificaciones/outbox;
- eventos competitivos;
- auditoría admin.

`database/verify.sql` contiene controles post-creación.

## Frontend
React 19 + Vite 7 + React Router.

Superficies:
- portada pública;
- ranking;
- próximos partidos;
- perfil deportivo;
- registro/login/recuperación;
- pareja;
- `MI LIGA`;
- notificaciones;
- panel admin;
- PWA instalable.

## Motor
`wheel-v2` es el único motor activo.

Invariantes:
- máximo un assignment abierto por pareja;
- posiciones únicas por categoría viva;
- una membresía competitiva por usuario;
- resultados idempotentes por assignment;
- eventos con `source_key` único;
- outbox con `dedupe_key` único.

## Seguridad
- JWT jugador: 30 días.
- JWT admin: 12 h.
- rol admin revalidado en DB.
- TOTP admin configurable con `ADMIN_TOTP_SECRET`.
- DNI y teléfono nunca públicos.
- rate limiting básico por IP.
- logs no deben incluir contraseñas, códigos o DNI completos.

## CI
GitHub Actions ejecuta backend syntax/check, tests y build frontend en cada push a `main`.

## Deploy
- API: Render.
- Frontend: Vercel.
- DB: Neon.
- WhatsApp: Meta WhatsApp Cloud API mediante outbox.


## Capa visual

La presentación está desacoplada del motor deportivo, pero su identidad es estable.

`frontend/src/App.jsx` contiene las superficies wheel-v2 y `frontend/src/styles.css` aplica el sistema visual oficial. Los assets de marca/hero viven en `frontend/public/`.

Una corrección visual no debe cambiar reglas competitivas ni contratos de API. Una reconstrucción de backend tampoco debe borrar la identidad visual aprobada.


## Documentos de identidad

`identity_documents` guarda temporalmente frente/dorso del DNI como `bytea` únicamente durante `pending_verification`.

No existe endpoint público. `GET /api/admin/identity/:id/document/:side` requiere autenticación + rol Admin y devuelve `Cache-Control: no-store`.

Cuando Admin verifica o rechaza, el backend elimina la fila temporal completa. La decisión queda en la auditoría administrativa, sin mantener una copia activa del documento.


## Ciclo de reenvío de identidad

`users.identity_resubmit_reason` y `users.identity_resubmit_requested_at` representan una solicitud de nuevas fotos sin cambiar el estado competitivo de la cuenta: la identidad continúa `pending`.

Admin usa `/api/admin/identity/:id/resubmit`. El backend elimina las imágenes temporales anteriores, guarda el motivo, audita y encola la notificación.

El usuario autenticado usa `/api/me/identity-documents` para reemplazar frente y dorso. El endpoint solo acepta cuentas `pending`, reemplaza el conjunto completo de imágenes y limpia el motivo de reenvío.


## Estado de instalación durante estabilización

La Neon actual nació desde el schema limpio y recibió durante las pruebas locales los ajustes posteriores de identidad documental/reenvío. `database/schema.sql` debe representar siempre el estado final para una instalación nueva; los archivos `PATCH_*` sirven únicamente para llevar una base ya creada durante este ciclo de desarrollo hasta ese estado.

La Neon histórica no existe. No hay que diseñar futuras decisiones asumiendo que puede recuperarse desde esa base.

## Runtime objetivo

Producción objetivo: Node 22. Las pruebas que se hayan ejecutado accidentalmente con Node 24 no sustituyen el gate final sobre Node 22.

## Válvula de equilibrio entre categorías
`core.relegationLossThreshold()` concentra el umbral puro de descenso. `competitionEngine.applySportingResult()` consulta cantidades activas de la categoría actual e inferior y aplica 2 o 3 derrotas según la diferencia. No existe job que mueva parejas por población: el movimiento ocurre únicamente al confirmar un resultado deportivo.


## Concurrencia de resultados deportivos
`applySportingResult()` serializa por `wheel_assignments.id` antes de comprobar idempotencia y bloquea en orden la categoría del partido y sus adyacentes. Esto evita que dos retries simultáneos apliquen el mismo match dos veces y que ascensos/descensos concurrentes hacia una misma categoría choquen por posiciones transitorias. El bloqueo es transaccional y no cambia ninguna regla deportiva.
