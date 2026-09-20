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
Suite actual: 20/20 tests puros + 7/7 integración PostgreSQL, CI verde en Node 22/PostgreSQL 16.

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
