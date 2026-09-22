# NEXT_CHAT_HANDOFF.md — LA RED Pádel

## Instrucción para el próximo chat

Antes de proponer cambios o escribir código, leer el estado actual del repositorio `LucasDNG/la-red-padle`, rama `main`, y tomar los archivos `.md` como fuente de verdad.

Orden mínimo de lectura:

1. `CHECKPOINT_2026-09-20.md`
2. `PROJECT_RULES.md`
3. `DECISIONS.md`
4. `SIMULATION_AUDIT_2026-09-20.md`
5. `AUDIT_2026-09-20.md`
6. `TEST_SCENARIOS.md`
7. `ARCHITECTURE.md`
8. `PROJECT_JOURNEY.md`
9. `RELEASE_MANIFEST.md`

Si el chat anterior y los `.md` difieren, prevalece el estado documentado más reciente y se debe señalar la discrepancia antes de cambiar código.

## Estado de producto al cerrar este chat

- Motor activo: `wheel-v2`.
- Package actual: `5.0.9`.
- Neon nueva activa; la Neon histórica fue eliminada y no existe como backup.
- Registro con DNI + frente/dorso: probado.
- Admin privado `/admin-la-red`: probado.
- Verificación `pending -> verified`: probada.
- Purga de documentación temporal: probada.
- Reenvío de DNI: implementado.
- CI del checkpoint anterior en Node 22: verde.
- Suite actual después de la auditoría ampliada: 20/20 tests verdes.
- No asumir todavía que el ciclo deportivo completo está validado en integración real.

## Auditoría longitudinal ya realizada

La deriva de categorías fue simulada y la regla vigente quedó validada con una auditoría ampliada a 5, 10 y 20 años.

Hallazgos:
1. P3/R3 fijo deriva hacia categorías superiores.
2. La hipótesis de 5 derrotas para descender fue medida y descartada: reduce demasiado el flujo descendente y agrava fuertemente la acumulación en Primera.
3. P4/R3 sobrecorrige hacia categorías inferiores.
4. Entre válvulas adaptativas gap 4/5/6, gap 5 da el mejor compromiso medido a 20 años.
5. La regla vigente queda sin cambios: 3 derrotas normalmente; 2 si la categoría tiene al menos 5 parejas activas más que la inferior.
6. El simulador ahora mide población, ascensos, descensos, categorías vacías y RMSE de estabilidad en 5/10/20 años.
7. Sigue pendiente auditar la inconsistencia probable de no-show objetado/indeterminado y `monthly_miss_streak`.

## Próximo problema a resolver

Pasar a integración PostgreSQL del ascenso/descenso y la válvula de equilibrio, sin pedir pruebas manuales largas.

El próximo bloque debe:
1. probar diferencia poblacional 4 => umbral de descenso 3;
2. probar diferencia 5 => umbral 2;
3. confirmar que el cambio de población no mueve parejas por sí solo;
4. confirmar que una derrota deportiva posterior de la última dispara el movimiento exactamente una vez;
5. validar entrada base #2, deuda, renumeración y ELO;
6. validar ascenso al fondo activo;
7. probar retries/concurrencia/idempotencia;
8. recién después hacer smoke manual de UX.

Simulación reproducible: `npm run simulate:balance`.
Suite actual: 51/51 tests puros + 45/45 integración PostgreSQL + `verify:db`, CI verde en Node 22/PostgreSQL 16; Vercel status success.

## Metodología

- No pedir al usuario que simule años manualmente.
- El usuario solo debería hacer smoke tests humanos/UX cuando sean necesarios.
- Primero simulación y tests automáticos.
- Luego integración PostgreSQL/concurrencia.
- Después smoke manual.
- Antes de cada bloque grande, actualizar `.md` y hacer checkpoint/push.

## Regla de continuidad

Los `.md` son la memoria oficial del proyecto. El objetivo de este archivo es que un chat nuevo pueda reconstruir el contexto sin depender de un resumen informal del chat anterior.


### Cambio en curso: integración PostgreSQL
Se agregó `npm run test:integration` y PostgreSQL 16 como service de GitHub Actions. También se corrigió el bug de no-show objetado que sumaba strikes no atribuibles y se endureció la concurrencia de `applySportingResult()`.

Antes de seguir con otro bloque:
1. continuar integración PostgreSQL de formación de pareja y primera asignación de rueda;
2. probar concurrencia de dos aceptaciones/altas en la misma categoría y máxima una membresía vigente;
3. probar assignWheel concurrente, máximo un assignment por pareja, odd/byes y waiting time;
4. después programación/resultado end-to-end.


### Bloque pareja → rueda en validación
Se corrigieron dos riesgos detectados por auditoría:
- orden de locks/posición transitoria al aceptar parejas concurrentemente;
- prioridad de espera en categorías impares antes del matching de rival.

Se agregaron 5 escenarios PostgreSQL: altas simultáneas, invitaciones compartiendo jugador, `assignWheel()` concurrente, bye impar y pareja sola. CI confirmado: 20/20 tests puros + 12/12 PostgreSQL, Node 22 y frontend build verdes. El siguiente bloque es programación + resultado end-to-end sobre PostgreSQL.


### Bloque programación → resultado en validación
Se agregaron 7 escenarios PostgreSQL que cubren propuesta/aceptación, conservación de programación oficial, revisión de la primera versión, confirmación, matching versions, disputa + resolución Admin, auto-validación a 15 días y rechazo después de 30 días.

También se corrigió que la resolución Admin de disputa no notificaba a ambas parejas. CI confirmado: 20/20 tests puros + 19/19 integración PostgreSQL, Node 22/PostgreSQL 16 y frontend build verdes. Siguiente paso: edge cases de vencimiento/extensión/no-show/pausa/disolución y luego smoke UX.


### Edge cases competitivos en validación
Se detectaron y corrigieron tres desvíos de implementación sin cambiar reglas:
- voto de extensión fuera de las 48 h técnicas;
- atribución incorrecta cuando ambas parejas actuaron pero una lo hizo tarde;
- ELO no recalculado al confirmar pausa voluntaria.

Se agregaron 10 escenarios PostgreSQL sobre vencimientos/extensión/no-show/pausa/disolución. CI confirmado: 20/20 tests puros + 29/29 integración PostgreSQL, Node 22/PostgreSQL 16 y frontend build verdes. El corazón deportivo automatizado queda cubierto. Pasan a primer plano hardening restante: disciplina, pausa global de relojes, schema/verify, outbox/TOTP y configuración real de WhatsApp/deploy/backups; smoke UX/legal al final.


### Hardening lateral en validación
El corazón deportivo quedó en 20/20 tests puros + 29/29 PostgreSQL. El bloque actual agrega:
- `verify:db` sobre una base de prueba reconstruida desde `schema.sql`;
- corrección del falso positivo de `verify.sql` durante reenvío de DNI;
- integración de disciplina y pausa global de relojes;
- dedupe de notificaciones/outbox;
- validación TOTP.

CI confirmado: `verify:db` verde, 20/20 tests puros + 35/35 integración PostgreSQL y frontend build verde. El hardening automatizado queda cerrado. El trabajo pendiente se concentra en configuración real de producción: WhatsApp Meta, secreto TOTP, Neon/SSL/backups-PITR, Render/Vercel, variables/cron y smoke UX/legal.


### Preflight de producción en validación
Después del hardening 20/20 + 35/35 + `verify:db`, el bloque actual:
- elimina `rejectUnauthorized:false` en PostgreSQL;
- rechaza modos SSL explícitamente inseguros;
- valida JWT, HTTPS/CORS, TOTP y WhatsApp;
- agrega `npm run preflight:prod`, no destructivo, para Neon/configuración reales.

CI del código de preflight confirmado: 26/26 tests puros + 35/35 PostgreSQL + `verify:db` + frontend build verdes. Con credenciales reales, ejecutar `npm run preflight:prod` contra producción. Lo que no puede cerrarse desde CI: WhatsApp Meta real, secreto TOTP real, backups/PITR Neon, Render/Vercel y smoke/legal.


### Lesión / abandono en validación
Último caso deportivo explícitamente pendiente del checklist. Se corrigió la persistencia oficial de `abandoned_pair_id` y se agregaron 4 escenarios PostgreSQL para ladder/rachas/ascenso/descenso/cero games.

También existe `database/PATCH_MATCH_ABANDONMENT_2026-09-21.sql` para aplicar en la Neon existente antes de desplegar código que escriba ese campo. CI confirmado; el caso deportivo queda cerrado.


### Estado funcional deportivo cerrado
Todos los ítems funcionales deportivos del release checklist están cubiertos automáticamente. Estado: 26/26 tests puros, 39/39 integración PostgreSQL, `verify:db` y frontend build verdes.

Lo pendiente ya es operativo/deploy: aplicar patch de abandono en Neon existente, cargar secretos reales, ejecutar `npm run preflight:prod`, configurar/probar WhatsApp Meta y TOTP, confirmar backups/PITR, validar Render/Vercel, cancha activa, smoke UX y revisión legal/seguro.


### Hardening de logs/outbox en validación
Se detectó un riesgo de PII en logs: `console.error(err)` podía persistir `detail` de PostgreSQL con valores como DNI. Se preparó logging seguro de producción, aislamiento del rate limit por IP+endpoint y una prueba de retry real del outbox WhatsApp (fallo 500 -> failed -> retry -> sent).

CI confirmado: 29/29 tests puros + 40/40 integración PostgreSQL + `verify:db` + frontend build verdes. Después de este bloque, lo restante sigue siendo principalmente operativo: patch Neon de abandono, preflight real, WhatsApp/TOTP reales, backups/PITR, Render/Vercel, cancha activa, smoke UX y legal/seguro.


### Deploy/migración/health en validación
Se preparó un bloque de deploy seguro:
- `npm run migrate:prod` aplica de forma idempotente el patch de abandono y verifica columna/constraint;
- `render.yaml` usa `autoDeployTrigger: checksPass`, pre-deploy de migración y health `/api/health`;
- el health ahora consulta PostgreSQL y exige engine `wheel-v2`;
- los errores 500 productivos ya no devuelven `err.message` crudo.

CI confirmado: 30/30 tests puros + 42/42 integración PostgreSQL + `verify:db` + frontend build verdes. Quedan pendientes los gates reales: ejecución contra Neon, secretos/TOTP/WhatsApp, Render/Vercel efectivos, backups/PITR, cancha real, smoke UX y legal/seguro.


### Smoke público automatizado en validación
Vercel ya reporta `success` a GitHub. Render no aparece como status/check del repo.

Se preparó `npm run smoke:prod` + workflow manual `LA RED production smoke`, que valida health DB-aware, CORS, endpoints públicos y frontend sin modificar datos. CI confirmado: 32/32 tests puros + 42/42 integración PostgreSQL + `verify:db` + frontend build verdes. Después ejecutar ese workflow cuando Render esté realmente desplegado.


### TOTP/CORS fail-closed en validación
Se endureció la configuración productiva:
- admin-login falla cerrado si falta `ADMIN_TOTP_SECRET` en producción;
- secreto TOTP mínimo 32 caracteres Base32 (~160 bits);
- JWT y TOTP deben ser distintos;
- `FRONTEND_URL` solo acepta orígenes HTTPS puros y CORS normaliza trailing slash.

Confirmar CI antes de cerrar este bloque. Después quedan únicamente gates de infraestructura/operación real.


### Generador local de secretos en validación
Se preparó `npm run generate:secrets -- --account=admin` para generar localmente JWT, TOTP Base32 de 160 bits y URI `otpauth://` sin persistir nada en Git.

Confirmar CI del candidato. Después el siguiente paso real es cargar los valores en Render/Authenticator y ejecutar migración + preflight sobre Neon real.


### Migración startup compatible con plan free en validación
La documentación actual de Render muestra que `preDeployCommand` requiere servicio pago. Se elimina esa dependencia:
- producción migra antes de `app.listen()`;
- advisory lock serializa instancias concurrentes;
- `render.yaml` no usa `preDeployCommand`;
- `migrate:prod` sigue disponible manualmente.

CI confirmado: la migración startup multi-plan quedó verde. El deploy real puede funcionar tanto en free como en paid.


### Login Admin HTTP en validación
Se prepara el último hardening de acceso:
- campo TOTP requerido, numérico y de 6 dígitos en frontend;
- prueba HTTP con PostgreSQL real de fail-closed sin secreto y éxito con TOTP válido.

CI confirmado: TOTP de código cerrado. El TOTP real en autenticador sigue siendo gate externo.


### WhatsApp configurable/sanitizado en validación
Se elimina la versión Graph hardcodeada:
- nueva variable `WHATSAPP_GRAPH_VERSION`;
- preflight valida versión, phone-number-id y template;
- el sender no guarda cuerpos crudos de error Meta, solo HTTP/code/subcode;
- la regresión verifica que datos simulados del destinatario no lleguen a `last_error`.

CI confirmado: WhatsApp de código cerrado. Solo queda conectar Meta real y enviar un mensaje de prueba aprobado.


### Preflight DB explícito en validación
Se prepara `databasePreflight()`, read-only y testeable. Además de TLS/Admin/cancha/verify, bloquea si:
- el reloj global quedó pausado;
- falta columna/constraint del patch de abandono.

Confirmar CI. Si queda verde, el próximo paso requiere infraestructura real: Neon/Render + secretos + `npm run preflight:prod`.


### Fix de paridad schema/patch en validación
El preflight reforzado encontró una diferencia de identidad, no de regla: `schema.sql` tenía el CHECK de abandono anónimo y el patch lo nombra `matches_abandonment_consistency`.

Se corrige el schema base para crear el constraint con ese nombre. No se debilita el preflight. CI confirmado: preflight sano verde y fallo explícito al eliminar el constraint.


### Gate VITE_API_URL — VERDE
CI + Vercel confirmados sobre `b4640a863b8f41ae744798731b0184becaa02d85`:
- 39/39 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

El build de producción ya exige `VITE_API_URL` HTTPS terminado exactamente en `/api`. Próximo paso: infraestructura real Neon/Render/preflight; mantener checkpoints cortos por turno.


### Workflow de preflight real — VERDE
CI confirmado sobre `a29c047a8233671d5126345444a483b86359bb4d`:
- 39/39 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

El workflow manual `LA RED production preflight` queda listo. Usa GitHub Environment `production` y ejecuta `npm run preflight:prod` contra Neon de forma read-only.

Próximo paso real: cargar secretos/variables del Environment `production` y ejecutar el workflow manual. Mantener checkpoints cortos.


### Bootstrap de Environment production — VERDE
CI confirmado sobre `4a6508001ff6a1fa3e63b5b2af3035d75cce49c2`:
- 39/39 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

`PRODUCTION_ENVIRONMENT_SETUP.md` y la validación de inputs del workflow quedaron confirmados.

El conector GitHub del chat no expone APIs de secrets/environments sensibles. Próximo paso manual/externo: cargar los secrets/variables reales del Environment `production` siguiendo la guía y ejecutar `LA RED production preflight`. Mantener checkpoints cortos.


### Preflight core/full — VERDE
CI confirmado sobre `495902ce8950eabcc4fde18435e7ae0bc3e6f072`:
- 39/39 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

El workflow manual permite:
- `core`: validar Neon/TLS/JWT/CORS/TOTP/engine/timezone/reloj/patch/Admin/cancha/verify sin exigir Meta;
- `full`: todo lo anterior + configuración WhatsApp completa.

Próximo paso: cargar los inputs core reales y ejecutar el preflight `core` contra Neon. `full` sigue siendo obligatorio antes del release público.


### Comandos explícitos de preflight — VERDE
CI confirmado sobre `7836e8854eb0a4150cfe6391e073b891e0f24c39`:
- 39/39 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

Quedan disponibles:
- `npm run preflight:core`
- `npm run preflight:full`

Próximo paso real: cargar inputs core del Environment `production` y ejecutar el preflight `core` contra Neon.


### Smoke ligado al Environment production — VERDE
CI confirmado sobre `079272a061d150db2c712e1a64f2474cc17bcc4e`:
- 40/40 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

`LA RED production smoke` usa `PROD_API_URL` y `PROD_FRONTEND_URL` del Environment `production`, sin URLs manuales por ejecución, y rechaza entradas que no sean orígenes HTTPS puros.


### Recuperación Neon preparada
Se agrega `PRODUCTION_RECOVERY.md`.

No marcar backups/PITR como verde hasta:
- confirmar plan y restore window reales de la Neon final;
- definir RPO/RTO;
- completar una prueba de recuperación sobre una branch/restauración aislada.

La documentación pública de Neon sirve como referencia; la configuración real del proyecto prevalece.


### Background/rate-limit hardening — VERDE
CI confirmado sobre `f1dbea68dcbe3a347c13373a5352f171539cad8b`:
- 44/44 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

Quedó confirmado:
- logs background sanitizados;
- mantenimiento y outbox aislados entre sí;
- rate limiter acotado a 10.000 claves activas;
- saturación fail-closed para claves nuevas;
- limpieza de claves expiradas al necesitar capacidad.

La limitación por instancia sigue documentada; múltiples instancias requieren almacenamiento compartido.


### Security headers — VERDE
CI/Vercel confirmados sobre `023bc126308201b68bf0c3ea229e577b02753602`:
- 46/46 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

Backend y Vercel aplican `nosniff`, anti-frame, referrer policy y HSTS productivo. La CSP se limita a `frame-ancestors 'none'` para no romper scripts/styles/connect; no se bloquea cámara por el flujo de captura de DNI.

### No-store/startup hardening — VERDE
CI confirmado sobre `e2aa61e5d2c9472b8f8af292636de74903df1319`:
- 51/51 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Vercel `success`.

Quedó confirmado:
- `/api/auth/*`, `/api/me*` y `/api/admin*` son explícitamente `no-store`;
- startup productivo libera cliente aun si falla migración;
- fallos fatales de startup/listen se loguean sanitizados;
- startup no productivo no intenta migraciones.


### Graceful shutdown/runtime handlers — VERDE
CI confirmado sobre `1a8a55c5ffe652b930a56fecbe18ba9610ced10c`:
- 55/55 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db`, frontend y Vercel verdes.

SIGTERM/SIGINT cierran HTTP + PostgreSQL y cancelan timers; fallos fatales de proceso se sanitizan y terminan con código no-cero.


### Smoke de headers/cache — VERDE
CI confirmado sobre `b0c5c54110d0d87695b1434dc2b0099110868b30`:
- 57/57 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db`, frontend y Vercel verdes.

El smoke real exige headers de seguridad, HSTS, ausencia de `X-Powered-By` y `no-store` en un probe auth 404 no destructivo.


### Liveness/readiness + shutdown budget Render — VERDE
CI confirmado sobre `d565968140b81ce996ee144694763c1cecd617f7`:
- 61/61 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db`, frontend y Vercel verdes.

`/api/live` es dependency-free; `/api/health` conserva DB/engine y sigue como health check de Render. El Blueprint deja 15 s de shutdown budget frente a los 10 s internos.


### Pool PostgreSQL idle-error handling — VERDE
CI confirmado sobre `1c7473acb3d7a08e004a1d098d4b369a0b2dc1f7`:
- 62/62 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db`, frontend y Vercel verdes.

Errores asíncronos de clientes idle del pool disparan shutdown fatal sanitizado.


### Installs reproducibles backend/workflows en validación
Se cambia a `npm ci --ignore-scripts` en:
- job backend de CI;
- production preflight;
- production smoke.

El lock raíz queda con metadata de versión 5.0.9. Frontend sigue usando `npm install` porque no existe `frontend/package-lock.json`; se intentó generarlo desde el registry pero el entorno agotó timeout, por lo que no se fabricó manualmente.
