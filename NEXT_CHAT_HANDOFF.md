# NEXT_CHAT_HANDOFF.md — LA RED Pádel

## Instrucción obligatoria

Continuar desde el repositorio `LucasDNG/la-red-padle`, rama `main`. No reconstruir el proyecto desde memoria del chat ni desde ZIPs históricos.

Primera acción en un chat nuevo: obtener el HEAD real de `main` y comprobar GitHub Actions + status Vercel de ese HEAD. No afirmar CI verde antes de verificarlo.

Después leer, como mínimo:

1. `WHEEL_V3_SPEC.md`
2. `CHECKPOINT_2026-09-20.md`
3. `PROJECT_RULES.md`
4. `DECISIONS.md`
5. `SIMULATION_AUDIT_2026-09-20.md`
6. `AUDIT_2026-09-20.md`
7. `TEST_SCENARIOS.md`
8. `ARCHITECTURE.md`
9. `PROJECT_JOURNEY.md`
10. `RELEASE_MANIFEST.md`
11. `RELEASE_CHECKLIST.md`
12. `FINALIZATION_PLAN.md`
13. `PRODUCTION_ENVIRONMENT_SETUP.md`
14. `PRODUCTION_RECOVERY.md`

## Diseño competitivo nuevo — PRIORIDAD ANTES DE TOCAR CÓDIGO

### Actualización prioritaria 2026-09-28 — ranking e inactividad
- La posición real es el único ranking; eliminar cualquier métrica numérica paralela y sus referencias.
- El único récord histórico especial es defensas exitosas del #1 de Primera.
- La rueda asigna automáticamente los partidos.
- Inactividad correctamente aplicada: sin partidos, sin castigos periódicos y sin descenso por el mero paso del tiempo.
- La antigua pérdida mensual de posición durante inactividad queda descartada.
- Resolver las preguntas reformuladas de `WHEEL_V3_SPEC.md` antes de tocar el motor.

- El propietario redefinió la rueda automática en una conversación extensa el 2026-09-28.
- Todo quedó consolidado en `WHEEL_V3_SPEC.md`.
- El código sigue en `wheel-v2`; **no implementar parcialmente desde memoria del chat**.
- La spec nueva sustituye, cuando haya conflicto, la selección de rival anterior, la válvula poblacional anterior, la pausa/inactividad anterior y partes de no-show/asignación.
- Hay preguntas abiertas finales al final de `WHEEL_V3_SPEC.md`. Resolverlas con el propietario antes de migración/código.
- Después: consolidar `PROJECT_RULES.md` + `DECISIONS.md`, escribir tests/simulación y recién entonces implementar.

## Estado consolidado

- package: `5.0.9`.
- motor activo: `wheel-v2`.
- Neon histórica: eliminada; no asumir recuperable.
- Neon nueva: base de referencia actual.
- runtime objetivo: Node 22.
- 71/71 tests puros verdes en el último checkpoint verificado.
- 46/46 integración PostgreSQL verdes.
- `verify:db` verde.
- frontend build verde.
- Vercel `success` en el último checkpoint verificado.
- el corazón deportivo, concurrencia, edge cases y lesión/abandono están cubiertos automáticamente.
- liveness/readiness, migrations startup, shutdown, pool errors, seguridad HTTP, no-store, request correlation, preflight y production smoke están implementados y testeados.
- backend/preflight/smoke usan `npm ci`.
- workflows tienen `contents: read` y timeouts.
- `frontend/.vite/` ya no está versionado.

El último commit de código/higiene verificado antes de esta normalización documental fue `5ad90c16f2e000d3ceb2f6bfed4d7e737563402b` (`Limpia cache generada de Vite`): GitHub Actions y Vercel terminaron `success`. Si `main` está más adelante, verificar el HEAD nuevo en lugar de reutilizar ese estado.

## Equilibrio competitivo: diseño anterior reemplazado

La válvula `gap >= 5 => descenso con 2` pertenece a Wheel v2 y **no debe usarse como regla funcional futura**.

Wheel v3 define:
- fase de formación hasta 5 parejas activas en cada una de las 7 categorías;
- luego distribución objetivo porcentual sobre activas;
- zona normal 10–19 %;
- umbrales 3/2/1 según desvío normal/moderado/fuerte;
- la población nunca mueve parejas sin un resultado;
- `WHEEL_V3_SPEC.md` es la referencia vigente de diseño.

`SIMULATION_AUDIT_2026-09-20.md` sigue siendo evidencia histórica de por qué se descartaron alternativas anteriores, no la definición final del nuevo motor.

## Metodología

- `.md` > memoria informal del chat.
- No cambiar reglas por fallas de tests sin compararlas con docs.
- Primero tests/simulaciones automáticas, después PostgreSQL, manual solo para UX/smoke.
- Distinguir fixture/test debt de bugs reales.
- Push directo a `main`.
- Actualizar checkpoint/handoff después de cambios importantes.
- No tocar ni imprimir secretos reales.
- Avanzar autónomamente todo lo posible.
- No agregar hardening especulativo si no responde a evidencia.
- No interpretar DNS bloqueado del entorno del chat como caída de Render/Vercel.

## Pendientes externos reales

Cerrados en producción real:
- Environment `production` core cargado;
- preflight core real verde;
- Render startup/health verde;
- production smoke real verde;
- TOTP Admin real probado con autenticador.

Pendientes:
1. confirmar plan/restore window Neon, definir RPO/RTO y completar drill aislado;
2. configurar Meta WhatsApp + mensaje real;
3. ejecutar `preflight:full`;
4. smoke UX autenticado final;
5. revisión legal/seguro Argentina.

## Deuda técnica no bloqueante

Generar legítimamente `frontend/package-lock.json` con npm y solo después cambiar el frontend de CI de `npm install` a `npm ci`. No fabricar el lock manualmente.

## Nota de continuidad

La cronología extensa está en `AUDIT_2026-09-20.md`, `CHECKPOINT_2026-09-20.md` y `PROJECT_JOURNEY.md`. Este handoff debe mantenerse corto y representar únicamente el estado vigente.


### Cancelación de invitación saliente — CORREGIDA
`Mi pareja` ya muestra la invitación saliente activa, su vencimiento/categoría, permite cancelarla y bloquea el envío de otra mientras siga pendiente. Se agregó regresión automática. No cambia reglas deportivas.


### Acciones pausa/reactivación en Mi pareja — CORREGIDAS
La UI muestra PAUSAR solo para pareja `active` y REACTIVAR solo para pareja `paused`. Se agregó regresión automática.


### Preflight TLS Neon — CORREGIDO
La primera ejecución real de `preflight:core` alcanzó Neon pero `pg_stat_ssl` dio un falso negativo de TLS. El preflight ahora valida el `TLSSocket` real de `node-postgres`; CI quedó verde. Falta ejecutar un workflow manual NUEVO sobre el HEAD actualizado para validar producción real.


### Lugar libre y surface audit — IMPLEMENTADOS
- Programación usa `location_text` libre escrito por jugadores; ya no exige una cancha precargada.
- `venues` es una capa comercial separada. Solo active+associated se publica como “Cancha adherida”.
- No existe desafío manual por diseño: la rueda asigna rival.
- Pausa/disolución, extensión, no-show, resultados/disputas y disciplina post-partido tienen flujos visibles.
- `tests/frontend-user-journey.test.js` verifica paridad entre endpoints funcionales y frontend.
- Estado verificado: 71/71 puros + 46/46 PostgreSQL + verify:db + frontend build + Actions/Vercel verdes.
- Producción necesita desplegar el HEAD nuevo para aplicar `PATCH_FREE_TEXT_LOCATIONS_2026-09-22.sql`, y después ejecutar un preflight core NUEVO.


### Gates productivos reales — 2026-09-22
- `LA RED production preflight` core sobre HEAD vigente: success.
- salida del preflight: `ok:true`, `wheel-v2`, TLS 1.3, migrations ready, reloj activo, 1 admin, 0 sedes comerciales válidas, outbox limpio.
- `LA RED production smoke`: success; Render/Vercel/CORS/headers/request-id/no-store/endpoints públicos verdes.
- Login Admin real con TOTP confirmado por el propietario.


### Recuperación Neon — estado actual
- Backup & Restore real verificado en consola.
- Ventana histórica: 8 horas.
- Snapshots manuales disponibles; schedules requieren upgrade.
- Drill de recuperación aislado diferido por decisión del propietario hasta que haya datos/cambios que permitan comprobar algo útil.
- Próximo gate externo: WhatsApp Meta real, luego preflight full.


### Service Worker /liga — CORREGIDO
Se corrigió un fallo real de producción: ante error transitorio de red, el Service Worker podía devolver `undefined` para una navegación como `/liga`, causando `Failed to convert value to 'Response'`. Ahora solo intercepta GET same-origin no-API, usa shell `/` como fallback de navegación y siempre devuelve una `Response`. Regresión automática agregada. Estado verificado: 71/71 puros + 46/46 PostgreSQL + frontend build + Vercel success.
