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
Suite actual: 30/30 tests puros + 42/42 integración PostgreSQL + `verify:db`, CI verde en Node 22/PostgreSQL 16.

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

Se preparó `npm run smoke:prod` + workflow manual `LA RED production smoke`, que valida health DB-aware, CORS, endpoints públicos y frontend sin modificar datos. Confirmar CI del código. Después ejecutar ese workflow cuando Render esté realmente desplegado.
