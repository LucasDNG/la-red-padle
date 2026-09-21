# Checkpoint de estabilización — 2026-09-20

Este checkpoint representa el estado real de LA RED inmediatamente antes del próximo push y de la búsqueda sistemática de inconsistencias/bugs.

## Versión de código de referencia
- candidato completo: `LA_RED_FINAL_2026-09-20_v11.zip`
- package: `5.0.9`
- motor: `wheel-v2`
- backend: Node + Express
- frontend: React + Vite
- DB: PostgreSQL / Neon
- timezone oficial: `America/Argentina/Buenos_Aires`

## Estado real ya probado localmente

### Base
- La Neon histórica fue eliminada accidentalmente antes del corte y ya no existe como backup.
- Se creó una Neon nueva y limpia.
- `database/schema.sql` fue cargado sobre la base nueva.
- La base recibió también los cambios posteriores de identidad documental/reenvío necesarios para llegar al esquema actual.
- La conexión local backend → Neon funciona.

### Backend
- `/api/health` funciona con `wheel-v2`.
- El error inicial de `DATABASE_URL` vieja fue resuelto.
- El crash por export faltante `requestIdentityResubmission` fue corregido.
- El error PostgreSQL `42P08` al verificar identidad fue corregido.
- La verificación administrativa real fue probada con éxito.
- La documentación temporal de DNI se purga al cerrar la verificación.

### Identidad y cuentas
- registro con DNI;
- frente + dorso obligatorios;
- cuenta `pending` hasta revisión;
- Admin puede ver frente/dorso;
- Admin puede verificar/rechazar;
- Admin puede pedir nuevas fotos sin rechazar la cuenta;
- jugador puede reenviar desde Mi cuenta;
- login jugador separado del login Admin;
- ruta Admin privada: `/admin-la-red`;
- primer propietario se promueve por consola.

### Frontend
- identidad visual de LA RED restaurada;
- cancha nocturna de pádel + azul/verde + glassmorphism;
- navegación Login ↔ Crear cuenta corregida;
- pasada global de espaciado/jerarquía aplicada a páginas internas;
- header autenticado y cards reorganizados.

### Admin
- acceso privado funcionando;
- panel visible;
- identidad pendiente funcionando;
- verificación real funcionando;
- auditoría/canchas/disputas/disciplina/salud del sistema están implementados y pendientes de recorrido completo con datos reales.

### Tests
- suite pura/simulación: 20/20 verde en el candidato actual.
- simulación larga incluida en la suite.
- los tests automáticos todavía no sustituyen las pruebas de integración PostgreSQL/concurrencia que faltan.

## No probado todavía de punta a punta
- formación de pareja completa con dos jugadores verificados;
- invariantes reales de membresía bajo concurrencia;
- primera asignación automática de rueda;
- propuesta/aceptación de fecha y cancha;
- extensión extraordinaria;
- no-show;
- carga/confirmación/disputa/auto-validación de resultado;
- ladder swap;
- ascenso/descenso;
- pausa/reactivación;
- disolución;
- disciplina real;
- WhatsApp real con Meta;
- TOTP Admin real;
- Render/Vercel contra la Neon nueva;
- build/gates de producción completos.

## Entorno local a normalizar antes del release
- El proyecto declara Node 22, pero durante pruebas se observó Node 24 local. Antes del release hay que probar con Node 22.
- La connection string actual genera un warning de `pg` por `sslmode=require`; antes del release se debe revisar la configuración recomendada y dejarla explícita/estable.
- WhatsApp y TOTP todavía pueden estar sin configurar localmente.

## Regla para continuar
Desde este checkpoint no se agregan funciones por intuición. El siguiente bloque es:

**push → verificar repo/CI → recorrer producto real → registrar bug/inconsistencia → corregir → actualizar docs/tests en el mismo cambio.**

Los `.md` son la memoria oficial del proyecto. Si chat y documentación difieren, primero se corrige la documentación y luego se implementa.

## Post-push: equilibrio de categorías
La auditoría por simulación cambió una regla: el descenso deja de ser completamente independiente de población. Mantiene 3 derrotas consecutivas como base, pero baja a 2 cuando la categoría tiene al menos 5 parejas activas más que la inmediatamente inferior. Ver `SIMULATION_AUDIT_2026-09-20.md`.


## Post-push: validación ampliada de equilibrio
La auditoría ampliada a 5/10/20 años confirmó la válvula vigente `gap >= 5 => 2 derrotas` frente a P3/R3, P3/R5, gaps 4/6 y P4/R3. R5 queda descartado. La suite sube a 20/20 con regresiones longitudinales. El siguiente bloque es integración PostgreSQL del movimiento real.


## Integración PostgreSQL automatizada
Se incorpora un job de CI con PostgreSQL 16 y `npm run test:integration`. El bloque cubre frontera gap 4/5, entrada de descenso #2, deuda remanente, ELO, ascenso al fondo, retry concurrente exactamente una vez, movimientos concurrentes hacia la misma categoría y no-show objetado sin strike atribuible. CI confirmado en Node 22 + PostgreSQL 16: 20/20 tests puros y 7/7 tests de integración PostgreSQL verdes; frontend build verde.


## Bloque pareja → rueda concurrente
Se prepararon correcciones de orden de locks en `acceptInvitation()`, serialización por categoría de destino y prioridad explícita de bye por antigüedad. Se agregaron 5 pruebas PostgreSQL adicionales: la integración queda en 12/12 escenarios verdes en CI sobre Node 22 + PostgreSQL 16; frontend build verde.


## Bloque programación → resultado en validación
Se agregaron 7 escenarios PostgreSQL end-to-end para programación, revisión de resultado, confirmación rival, versiones coincidentes/incompatibles, resolución Admin, auto-validación por silencio y deadline de 30 días. También se corrigió la falta de notificación al resolver una disputa administrativa. CI confirmado: 20/20 tests puros + 19/19 integración PostgreSQL verdes en Node 22/PostgreSQL 16; frontend build verde.


## Bloque edge cases competitivos en validación
Se prepararon correcciones para límite superior de la ventana de extensión, atribución cuando ambas parejas actuaron pero una tarde y recálculo ELO al pausar voluntariamente. Se agregaron 10 escenarios PostgreSQL de vencimiento, extensión, no-show, pausa y disolución. CI confirmado: 20/20 tests puros + 29/29 integración PostgreSQL verdes en Node 22/PostgreSQL 16; frontend build verde.


## Hardening lateral en validación
Se corrigió `verify.sql` para distinguir correctamente el estado de reenvío de DNI y se agregó `npm run verify:db` como gate destructivo exclusivo de `TEST_DATABASE_URL`. Se prepararon 6 pruebas adicionales sobre disciplina, reloj global, dedupe, TOTP y reenvío de identidad. CI confirmado: `verify:db` verde, 20/20 tests puros, 35/35 integración PostgreSQL y frontend build verde.


## Preflight de producción en validación
Se eliminó el `rejectUnauthorized:false` productivo y se preparó `npm run preflight:prod`. También se agregaron tests puros de configuración para SSL, JWT, HTTPS/CORS, TOTP y WhatsApp. CI confirmado: 26/26 tests puros, 35/35 integración PostgreSQL, `verify:db` y frontend build verdes. El preflight real contra Neon sigue pendiente hasta cargar variables/credenciales reales.


## Lesión / abandono en validación
Se detectó que el match oficial no persistía quién abandonó aunque la versión cargada sí lo hacía. Se agregó `matches.abandoned_pair_id`, patch para la base existente, verificación de consistencia y 4 escenarios PostgreSQL que cubren cero games, ladder, rachas, ascenso/descenso y validación del abandonante. CI confirmado: 26/26 tests puros + 39/39 integración PostgreSQL + `verify:db` + frontend build verdes.


## Hardening de logs y outbox en validación
La revisión de release detectó que el middleware global hacía `console.error(err)`; errores PostgreSQL pueden incluir en `detail` valores conflictivos como un DNI. Se reemplaza por logging estructurado/sanitizado que en producción no conserva mensaje, SQL, detail ni valores de usuario.

También:
- el rate limit de auth se separa por IP + endpoint para no compartir cupo entre login/registro/recuperación;
- se agregan regresiones puras de sanitización y claves de rate limit;
- se agrega integración de outbox que prueba fallo Meta 500 -> `failed` -> retry -> `sent`;
- se actualiza el checklist de release: disciplina y retries/outbox ya estaban cubiertos, pero la documentación había quedado atrasada.

CI confirmado: 29/29 tests puros + 40/40 integración PostgreSQL + `verify:db` + frontend build verdes.


## Deploy/migración/health — VERDE
CI confirmó:
- 30/30 tests puros;
- 42/42 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- migración de abandono idempotente;
- health DB-aware;
- errores 500 productivos genéricos;
- Blueprint Render parseable por el repo y alineado con los campos oficiales usados.

El siguiente gate ya no es simulación: ejecutar migración/preflight contra Neon real y validar Render/Vercel/Meta/TOTP.


## Smoke público automatizado en validación
Vercel reportó status `success` sobre el commit actual. Se agrega smoke no destructivo de producción para health DB-aware, CORS, endpoints públicos y frontend SPA, disponible como `npm run smoke:prod` y workflow manual. Render sigue pendiente de deploy/status real. CI confirmado: 32/32 tests puros + 42/42 integración PostgreSQL + `verify:db` + frontend build verdes.


## TOTP/CORS fail-closed en validación
Se elimina el bypass implícito de TOTP en producción, se sube el mínimo del secreto a ~160 bits, se impide reutilizar JWT/TOTP y se valida/normaliza `FRONTEND_URL` como origen CORS real. Estado: pendiente de CI.
