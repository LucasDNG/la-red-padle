# Wheel v3 — Runbook de cutover

Fecha: 2026-09-29

## Principio

El cutover cambia únicamente cuando el código dual ya está desplegado y validado. No se mezclan assignments v2 y v3.

## Preconditions obligatorias

1. El commit a activar debe tener GitHub Actions completamente verde.
2. El backend desplegado debe ser la versión dual v2/v3.
3. `app_settings.engine` debe seguir en `wheel-v2`.
4. No puede haber assignments vivos (`open`, `result_pending`, `disputed`).
5. No puede haber pausas/disoluciones pendientes ni `pause_after_current`.
6. Todas las parejas, duplas exactas y circuitos deben tener su estado preparatorio v3.
7. El backend debe quedar temporalmente quiesced durante el cambio para que ninguna request que ya haya elegido v2 escriba después del switch.

El chequeo recomendado previo al cambio es:

```
EXPECTED_RELEASE_SHA=<sha-git-completo> npm run precutover:wheel-v3
```

Combina configuración de producción, TLS, preflight de base, gate competitivo v3 y smoke HTTP. Además exige que Render y Vercel expongan exactamente `EXPECTED_RELEASE_SHA`. Debe devolver `ok: true` y `cutover.ready: true`. Si Vercel no desplegó ese commit (por ejemplo por build-rate-limit), el cutover queda bloqueado.

El chequeo competitivo aislado sigue disponible con `npm run check:wheel-v3-cutover`.

## Activación

Con el backend quiesced:

```
CONFIRM_WHEEL_V3_CUTOVER=YES WHEEL_V3_BACKEND_QUIESCED=YES EXPECTED_RELEASE_SHA=<sha> CUTOVER_ADMIN_USER_ID=<admin_id> npm run activate:wheel-v3
```

El comando:
- abre una transacción;
- toma los advisory locks del asignador y mantenimiento;
- vuelve a comprobar todos los blockers;
- bloquea la fila de engine;
- cambia `wheel-v2 -> wheel-v3` de forma atómica;
- hace rollback ante cualquier error.

Después se inicia/reanuda el backend.

## Verificación inmediata

Ejecutar:

```
EXPECTED_RELEASE_SHA=<mismo-sha> npm run postcutover:wheel-v3
```

Ese comando valida configuración productiva, TLS, preflight/estado operativo v3 y smoke HTTP exigiendo `engine=wheel-v3`.

Además confirmar:
- `/api/health` informa `engine: wheel-v3`;
- liveness está verde;
- ranking público responde;
- login y `/api/me/league` responden;
- Admin muestra `engine: wheel-v3`;
- no aparece extensión extraordinaria;
- no aparece puntuación numérica paralela;
- mantenimiento v3 puede crear assignments sólo con attacker/defender definidos.

## Rollback

### Antes del primer write deportivo v3

Si el engine fue cambiado pero aún no existe ningún assignment, resultado, sanción, movimiento o transición deportiva creada por v3, se puede evaluar volver a v2 mediante una operación explícita y auditada.

### Después del primer write deportivo v3

**No cambiar simplemente `app_settings.engine` a `wheel-v2`.**

Desde ese momento las semánticas de roles, assignments, ascenso/descenso, inactividad y resultados son v3. Un rollback de software debe mantener `engine=wheel-v3` y desplegar una versión de código compatible o aplicar una migración de recuperación diseñada específicamente.

## Estado validado antes del cutover

GitHub Actions run `36509908405`, commit `9fa38f9a0529bafd3c7d36f82c72ac0d70b85710`: frontend build, check, unit tests, verify DB e integración PostgreSQL completos en verde.
