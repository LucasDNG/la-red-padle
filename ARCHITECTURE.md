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


## Concurrencia de formación de pareja y prioridad de bye
`acceptInvitation()` toma locks de usuarios en orden estable antes de bloquear/revalidar la invitación. Luego bloquea la categoría de destino antes de crear o reactivar la pareja y renumerar posiciones. Esto evita deadlocks cuando dos invitaciones comparten jugador y evita colisiones de posición cuando dos parejas distintas ingresan simultáneamente a la misma categoría.

En categorías impares, `createAssignmentsForCategory()` reserva primero como bye a la pareja elegible con menor antigüedad de espera. Sobre las restantes se mantiene la prioridad de rival nunca enfrentado y luego cruce más antiguo. Así la selección de rival no puede quitarle turno a una pareja que lleva más tiempo esperando.


## Resolución de disputas y notificaciones
Una disputa mantiene el assignment abierto y bloqueado para nuevas asignaciones hasta resolución. Si Admin selecciona una versión, el motor aplica el resultado deportivo dentro de la misma transacción y luego cierra el assignment; si lo declara `void`, se cierra sin crear un match. Ambos caminos encolan una notificación idempotente a todos los integrantes afectados y registran auditoría Admin.


## Vencimientos y ventana extraordinaria
La atribución de vencimiento distingue entre “actuó” y “actuó con margen suficiente”. Un único actor con margen puede dejar al rival como único responsable solo si el rival no actuó en absoluto. Si ambos actuaron sin resolver, ambos son penalizados. La extensión extraordinaria solo acepta votos en las 48 horas posteriores al deadline original; si se activa, su deadline es exactamente 15 días después del original. Su vencimiento genera penalización posicional sin derrota deportiva ni strike atribuible.


## Gate de esquema de base
`npm run verify:db` es un gate destructivo pensado solo para CI/test. Exige `TEST_DATABASE_URL`, recrea el schema `public`, aplica `database/schema.sql` y ejecuta los controles de `database/verify.sql`. No usa `DATABASE_URL` como fallback para reducir el riesgo de apuntar por error a una base de producción.

El verificador considera válido un usuario de identidad `pending` sin blobs únicamente cuando existe una solicitud explícita de reenvío; fuera de ese estado, pending sin documentos es inconsistente.


## Configuración y preflight de producción
La conexión PostgreSQL se construye mediante `databasePoolOptions()`. En producción:
- `DATABASE_URL` es obligatoria;
- se rechazan modos SSL explícitamente inseguros;
- si la URL no define opciones SSL, se fuerza TLS con verificación estándar del runtime;
- si la URL ya define `sslmode`/certificados, `pg` interpreta esa configuración.

`npm run preflight:prod` es no destructivo y está separado de `verify:db`: el primero se usa contra producción existente; el segundo recrea únicamente `TEST_DATABASE_URL` para validar instalación limpia.


## Resultado por lesión / abandono
`injury_abandonment` es un resultado deportivo oficial. La versión cargada y el `match` confirmado conservan `abandoned_pair_id`; el ganador debe ser la otra pareja. No se persisten sets parciales ni games: `score=NULL`, `pair_a_games=0`, `pair_b_games=0`. El motor aplica la misma escalera, rachas, ascenso/descenso y defensa de Primera que una victoria/derrota normal, sin deuda ni strike administrativo adicional.


## Deploy y migraciones de producción
El backend declara un Blueprint `render.yaml` en la raíz. Render debe esperar checks verdes antes de autodeploy, ejecutar las migraciones automáticamente al arrancar, antes de abrir tráfico, y usar `/api/health` como health check HTTP.

`migrate:prod` solo corre con `NODE_ENV=production`; aplica las migraciones idempotentes explícitamente listadas en `src/migrations.js` y verifica sus invariantes antes de finalizar. El primer patch administrado es `PATCH_MATCH_ABANDONMENT_2026-09-21.sql`. El schema base usa el mismo nombre canónico de constraint (`matches_abandonment_consistency`) que la migración, de modo que instalaciones nuevas y bases migradas tengan el mismo estado verificable.

La misma rutina corre automáticamente en `src/index.js` antes de `app.listen()` cuando `NODE_ENV=production`. Usa un advisory lock PostgreSQL para que múltiples instancias que arranquen juntas no ejecuten migraciones en paralelo. Esto evita depender de `preDeployCommand`, que no está disponible en todos los planes de Render.

El health no es estático: depende de PostgreSQL y valida `app_settings.engine = wheel-v2`. Por eso una instancia sin DB funcional no puede quedar verde solo porque Express arrancó.
