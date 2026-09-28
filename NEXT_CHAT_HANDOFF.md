# NEXT_CHAT_HANDOFF.md — LA RED Pádel

## Instrucción obligatoria

Continuar desde el repositorio `LucasDNG/la-red-padle`, rama `main`. No reconstruir el proyecto desde memoria del chat ni desde ZIPs históricos.

Primera acción en un chat nuevo: obtener el HEAD real de `main` y comprobar GitHub Actions + status Vercel de ese HEAD. No afirmar CI verde antes de verificarlo.

Después leer, como mínimo:

1. `WHEEL_V3_SPEC.md`
2. `WHEEL_V3_AUDIT_2026-09-28.md`
4. `CHECKPOINT_2026-09-20.md`
4. `PROJECT_RULES.md`
5. `DECISIONS.md`
6. `SIMULATION_AUDIT_2026-09-20.md`
7. `AUDIT_2026-09-20.md`
8. `TEST_SCENARIOS.md`
9. `ARCHITECTURE.md`
10. `PROJECT_JOURNEY.md`
11. `RELEASE_MANIFEST.md`
12. `RELEASE_CHECKLIST.md`
13. `FINALIZATION_PLAN.md`
14. `PRODUCTION_ENVIRONMENT_SETUP.md`
15. `PRODUCTION_RECOVERY.md`

## Diseño competitivo nuevo — PRIORIDAD ANTES DE TOCAR CÓDIGO

### Actualización prioritaria 2026-09-28 — ranking e inactividad
- La posición real es el único ranking; eliminar cualquier métrica numérica paralela y sus referencias.
- El único récord histórico especial es defensas exitosas del #1 de Primera.
- La rueda asigna automáticamente los partidos.
- Inactividad correctamente aplicada: sin partidos y sin descenso de categoría por el mero paso del tiempo.
- Posición de retorno: hasta 3 meses completos conserva puesto; desde el 4º mes pierde 1 puesto de retorno por mes completo, siempre dentro de la misma categoría.
- Si se inactivó siendo #1 de cualquier categoría, vuelve como máximo #2 durante los primeros 3 meses y luego ese #2 base también baja 1 puesto por mes completo adicional.
- Si dos inactivas vuelven al mismo puesto objetivo, la que reactiva más tarde se inserta allí y desplaza hacia abajo a la anterior.
- Si había período de descenso, queda congelado y se retoma al volver.
- Tres incumplimientos atribuibles consecutivos provocan 30 días sin assignments y paso automático a inactiva; al día 30 se reactiva automáticamente y la racha se reinicia solo con un cierre real sin incumplimiento propio.
- Nuevas/ascendidas entran **anteúltimas**, no a mitad ni al fondo. No activan descenso solo por ingresar.
- Una dupla disuelta y re-formada se trata competitivamente como pareja nueva.
- Formación y porcentajes son independientes por circuito.
- La antigua fórmula de mitad queda reemplazada. Con N=0 entra #1; con N=1 entra #2.
- 3 incumplimientos => 30 días inactiva; reactivación automática; cualquier assignment sin incumplimiento atribuible resetea la racha.
- Resultado cargado abre inmediatamente 7 días de revisión y luego auto-valida por silencio.
- Todos los cambios operativos relevantes se notifican por WhatsApp.
- El récord del #1 de Primera es por reinado, no acumulativo entre reinados; empate = récord compartido.
- El primer partido de una pareja 0 PJ al activarse la zona no cuenta y luego entra en 0/3. La entrada nueva/ascendida es anteúltima; N=0 => #1 y N=1 => #2.
- No quedan preguntas funcionales abiertas. Próximo paso obligatorio: simulaciones/tests del diseño antes de tocar el motor.

- El propietario redefinió la rueda automática en una conversación extensa el 2026-09-28.
- Todo quedó consolidado en `WHEEL_V3_SPEC.md`.
- El código sigue en `wheel-v2`; **no implementar parcialmente desde memoria del chat**.
- La spec nueva sustituye, cuando haya conflicto, la selección de rival anterior, la válvula poblacional anterior, la pausa/inactividad anterior y partes de no-show/asignación.
- Los bordes funcionales detectados en la auditoría están cerrados. No reabrirlos por intuición; validar mediante tests/simulación antes de migración/código.
- Después: consolidar `PROJECT_RULES.md` + `DECISIONS.md`, escribir tests/simulación y recién entonces implementar.

### Auditoría Wheel v3 — 2026-09-28
- `WHEEL_V3_AUDIT_2026-09-28.md` contiene la auditoría y debe leerse antes de tocar el motor.
- Los hallazgos anti-abuso A–D quedaron resueltos: descenso pendiente de la dupla, categoría individual tras descenso, resultado cargado protegido y cancelación automática sin reset de incumplimientos.
- La simulación longitudinal ya fue rehecha con ingreso **anteúltimo** y no mostró deriva peligrosa ni categorías vacías en los escenarios modelados.
- Se agregaron `scripts/simulate-wheel-v3.js`, `tests/wheel-v3-simulation.test.js`, `scripts/wheel-v3-rule-model.js` y `tests/wheel-v3-rules.test.js`.
- Los cuatro bordes nuevos quedaron cerrados: N=1 => #2; descenso pendiente vuelve a su categoría original; strikes pertenecen a la dupla exacta; partido jugado antes de cancelación puede cargarse después.
- Próximo paso: diseñar estado/migración DB (incluyendo tiempo autoritativo de servidor) y ampliar tests puros/PostgreSQL antes de implementar el runtime Wheel v3.

### Tiempo autoritativo — NUEVA DECISIÓN
- Ningún plazo oficial puede depender del reloj de la PC/teléfono/navegador.
- Backend/Neon son la autoridad temporal; guardar/comparar UTC y usar preferentemente PostgreSQL `CURRENT_TIMESTAMP/NOW()` para vencimientos transaccionales.
- La API debe devolver deadlines absolutos + `server_now` (o equivalente); el frontend solo presenta countdowns.
- Cambiar la hora local jamás altera 7 días, 30 días, 48 h, meses de inactividad ni sanciones.
- Mostrar al usuario en horario de Argentina cuando corresponda, sin cambiar la lógica UTC.

### Código todavía contradictorio que NO representa la regla vigente
- `frontend/src/App.jsx` todavía muestra la puntuación numérica legacy y estadísticas acumuladas en varias superficies.
- `src/core.js` y `src/competitionEngine.js` todavía calculan/persisten esa métrica y el récord antiguo.
- `src/pairs.js` todavía la recalcula al pausar/reactivar/formar.
- `database/schema.sql` todavía contiene columnas/tablas legacy relacionadas.
- tests existentes todavía validan esa lógica.
- **No corregir parcialmente** antes de cerrar las preguntas de `WHEEL_V3_SPEC.md`; luego eliminarla de forma transversal en código, DB, API, frontend y tests.

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


### Preparación DB Wheel v3 — 2026-09-28
- Se agregó `WHEEL_V3_DB_DESIGN.md`.
- Se agregó `database/PATCH_WHEEL_V3_STATE_2026-09-28.sql` y fue incorporado a `src/migrations.js`.
- `database/schema.sql` ya contiene el estado preparatorio Wheel v3 para instalaciones limpias.
- Nuevas estructuras: `league_wheel_state`, `pair_wheel_state`, `pair_duo_state`, `first_place_reigns`.
- `wheel_assignments` suma `attacker_pair_id`, `defender_pair_id`, `cancelled_at` y `first_result_at`.
- Triggers aditivos mantienen creado el estado v3 para parejas/duplas nuevas mientras el runtime sigue en `wheel-v2`.
- La migración no traduce ELO/rachas legacy a contadores v3 porque no son semánticamente equivalentes; posiciones/categorías/partidos se conservan.
- Se ampliaron tests puros de meses completos, cancelación tardía y deadlines absolutos.
- Se agregó `tests/integration/wheel-v3-state-postgres.test.js` para schema, idempotencia, constraints, reloj DB, reinados y sincronización de nuevas parejas.
- **El engine sigue en `wheel-v2`; no se implementó todavía el runtime Wheel v3.**
- Validación local desde este entorno no pudo ejecutarse por bloqueo DNS hacia GitHub; confirmar GitHub Actions del HEAD antes de dar este bloque por verde.


### Endurecimiento de migración Wheel v3 — 2026-09-28
- La suite PostgreSQL ya no prueba solo el patch sobre el schema final.
- Se agregó un caso que construye un esquema mínimo pre-v3 tipo `wheel-v2`, carga una pareja pausada con datos reales, aplica `PATCH_WHEEL_V3_STATE_2026-09-28.sql` dos veces y verifica:
  - `engine` sigue en `wheel-v2`;
  - posición/categoría/estado competitivo se conservan;
  - se crea estado de inactividad/retorno;
  - se crea estado canónico de dupla;
  - la segunda ejecución es idempotente.
- `database/verify.sql` ahora falla si alguna pareja no tiene `pair_wheel_state`, una dupla exacta no tiene `pair_duo_state`, una pausada carece de snapshot de retorno o una sanción de 30 días carece de timestamps.
- Siguiente paso: confirmar CI PostgreSQL del HEAD y ampliar tests de comportamiento/concurrencia v3 antes de tocar el runtime.

### Auditoría de estado persistente Wheel v3 — 2026-09-28
- Se detectó y corrigió un error real de delimitadores PL/pgSQL en los triggers preparatorios.
- Se agregó `defense_required_until_real` para persistir la defensa obligatoria posterior a incumplimiento.
- Se agregó `relegation_route_step` para que la ruta de descenso no se pierda por reinicio/disolución.
- Se agregó `awaiting_zone_kind` para distinguir el partido habilitante de ascenso vs descenso al cerrar formación.
- El patch preparatorio ahora también evoluciona instalaciones que ya hubieran recibido una versión anterior de las tablas v3 mediante `ALTER ... ADD COLUMN IF NOT EXISTS`.
- Se agregaron regresiones PostgreSQL para persistencia de descenso por dupla, múltiples encarnaciones de la misma dupla, sanción de 30 días, circuito correcto, cancelación/resultados y evolución de schema.
- `verify.sql` valida coherencia de zona habilitante y ruta de descenso vacía.
- El runtime continúa en `wheel-v2`.

### Antigüedad real de espera Wheel v3 — 2026-09-28
- `pairs.waiting_since` queda como dato legacy de wheel-v2.
- Wheel v3 usa `pair_wheel_state.real_waiting_since`.
- La migración inicializa activas desde el último match real (`normal` o `injury_abandonment`) o desde creación si nunca jugaron.
- Un match real actualiza la espera; `dissolution_forfeit` no.
- Nueva pareja, reactivación y reformación desde `inactive` reinician la espera con `CURRENT_TIMESTAMP` de PostgreSQL.
- Se agregaron regresiones PostgreSQL para estas transiciones.

### Correcciones del patch preparatorio
- Se reordenó `PATCH_WHEEL_V3_STATE_2026-09-28.sql` para crear `pair_duo_state` antes de alterarla.
- Se corrigieron delimitadores `DO $$` y funciones PL/pgSQL.
- El patch conserva idempotencia y puede evolucionar instalaciones que recibieron una versión preparatoria anterior.

### Núcleo puro Wheel v3 — 2026-09-28
- Se agregó lógica pura para cierre de formación por circuito (7 categorías con >=5 activas).
- Se fijaron roles estructurales: #1 defensa, último ataque, una sola activa sin rol efectivo.
- Se agregó transición post partido real atacante->defensa / defensor->ataque con respeto de extremos.
- Se agregó prioridad absoluta por `real_waiting_since`.
- Se agregó selección de defensor solo hacia arriba, ventanas dinámicas de 3, prioridad por espera y expansión inmediata.
- Se agregó evitación blanda de rival inmediato: se evita si hay alternativa, nunca bloquea la rueda.
- Se agregó resolución de colisiones: el atacante con mayor espera toma primero el defensor y el otro continúa buscando.
- Se agregó rebalance inicial de roles con extremos forzados.
- La matemática de población 3/2/1 y mejora conjunta quedó centralizada en `wheel-v3-rule-model.js`; la simulación reutiliza esa misma fuente.
- Se agregó `entryPositionPenultimate`; el alias legacy `entryPositionAntepenultimate` se conserva solo para no romper tests/simulaciones existentes.
- `delayedResultMovement` también quedó centralizado en el modelo puro.
- Todo este bloque sigue aislado: todavía no se conectó al runtime productivo ni se cambió `engine=wheel-v2`.

### Motor Wheel v3 aislado — avance 2026-09-28
- Las reglas puras dejaron de vivir solo en `scripts/`: fuente productiva nueva `src/wheelV3Rules.js`; `scripts/wheel-v3-rule-model.js` reexporta por compatibilidad.
- `npm run check` incluye `src/wheelV3Rules.js` y `src/wheelV3Engine.js`.
- Se agregaron transiciones puras de ascenso, descenso, incumplimientos, defensa obligatoria, ruta de descenso, cancelación estructural, récord por reinado, inactividad y deadlines.
- Se corrigió el edge del partido habilitante de descenso: solo abre 0/3 si la pareja sigue última después de ese partido.
- Se agregó planificador puro de categoría con normalización de roles, prioridad de espera, ventanas de 3, no-repeat blando y colisiones.
- Se agregó adaptador PostgreSQL aislado `src/wheelV3Engine.js`.
- El adaptador puede leer formación por circuito, planificar una categoría, persistir roles, crear assignments con atacante/defensor y deadlines DB, y consultar último rival real.
- La creación de assignments bloquea la categoría y conserva máximo un compromiso por pareja mediante `wheel_assignment_participants`.
- Se agregó cierre de formación persistente e irreversible.
- El cierre de formación ahora inicializa en la misma transacción zonas 0/3 o estado `awaiting_zone_kind` para parejas con 0 PJ.
- Se agregó cancelación estructural previa a primera carga, liberación de participantes y preservación de roles/antigüedad.
- Se agregó `registerWheelV3FirstResult`: fija `first_result_at` y revisión de 7 días con reloj PostgreSQL; desde ahí el assignment queda protegido de cancelación por ranking/categoría.
- Se agregó elegibilidad de resultado cargado después de cancelación usando `played_at <= cancelled_at`.
- Se agregó `refreshWheelV3Category` para cancelar inválidos y reevaluar asignación inmediatamente.
- Todo lo anterior sigue AISLADO: `wheel.js` productivo no llama a `wheelV3Engine.js` y `app_settings.engine` continúa en `wheel-v2`.
- Se ampliaron regresiones puras y PostgreSQL para formación, assignments concurrentes, cancelación, primera carga y zonas.


### Wheel v3 aislado — checkpoint ampliado 2026-09-28
- Fuente pura productiva: `src/wheelV3Rules.js`; el script histórico solo reexporta.
- Motor PostgreSQL aislado: `src/wheelV3Engine.js`.
- Ya están implementados en aislamiento: formación, matching, assignments, resultados, 7d, 30d, ascenso/descenso, población, incumplimientos, deuda, inactividad, disolución/reforma exacta, no-show, programación, resolución admin, reinados de Primera, historial de 5 movimientos y notificaciones.
- Se agregó vínculo assignment -> reinado de Primera para acreditar correctamente defensas tardías.
- Se corrigió el planificador para calcular #1/último sobre toda la tabla activa aunque alguna pareja esté ocupada/bloqueada.
- Se limpió `DECISIONS.md` de reglas supersedidas de mitad de tabla/bordes pendientes.
- Auditoría detallada de cobertura: `WHEEL_V3_IMPLEMENTATION_AUDIT_2026-09-28.md`.
- **No activar todavía:** producción sigue en `wheel-v2`.
- Próximo bloque: fachada/API y routing por engine, después frontend/background/health, ejecución real de suites y cutover.


### Routing y frontend dual v2/v3 — 2026-09-28
- Se agregaron selectores centrales de runtime: `competitionRuntime.js`, `wheelRuntime.js`, `pairsRuntime.js` y `adminRuntime.js`.
- `app.js` y el mantenimiento de background ya despachan por `app_settings.engine`; el valor vigente sigue siendo `wheel-v2`.
- Se agregaron fachadas aisladas `wheelV3Api.js`, `pairsV3Api.js` y `adminV3Api.js`.
- Health, preflight y smoke aceptan `wheel-v3` sin activarlo.
- El mantenimiento v3 respeta la pausa global y la reanudación calcula duración con `CURRENT_TIMESTAMP` de PostgreSQL, no `Date.now()`.
- Se cerró el edge de disolución `awaiting_result`: al cerrar el assignment se archiva automáticamente la pareja si corresponde.
- El frontend quedó dual: v2 conserva sus controles legacy mientras v3 muestra inactividad directa, cancelar propuesta, `No pude jugar`, cancelar/aceptar/objetar no-show y resolución Admin v3.
- El frontend ya no muestra ni consulta el ranking numérico paralelo anterior; Ranking usa posición + rol + estadísticas deportivas.
- El récord de Primera muestra defensas por reinado y soporta holders compartidos.
- En v3 la habilitación visual de acciones temporales usa `server_now` + reloj monotónico del navegador; cambiar el reloj del dispositivo no altera la referencia.
- Resultado ya cargado bloquea nuevas asignaciones; además `No pude jugar` y un no-show nuevo quedan prohibidos después de la primera carga de resultado.
- El backend público v3 conserva formas compatibles para ranking, próximos, resultados y perfil de pareja.
- Aún falta ejecutar suites/build reales en un entorno con repo+PostgreSQL, corregir cualquier fallo, completar auditoría frontend/contratos y recién después considerar el switch de `engine`.

### CI real como gate de Wheel v3 — 2026-09-28
- Workflow: .github/workflows/ci.yml, nombre LA RED final checks.
- Los runs de push se consultan por la API de GitHub Actions; fetch_commit_workflow_runs no los mostraba porque filtra otro tipo de evento.
- Ya hubo ejecuciones reales con frontend build, npm run check, npm test y npm run verify:db en verde.
- CI detectó y permitió corregir dos fallos unitarios: contrato de liveness y desbalance de roles iniciales.
- CI también detectó una incompatibilidad v2 en no-show tras convertir la unicidad a índice parcial; wheel-v2 quedó compatible usando ON CONFLICT DO NOTHING.
- Se corrigieron errores de sintaxis en tests PostgreSQL v3 que antes impedían ejecutar esa suite.
- Run de confirmación en curso al escribir este checkpoint: 36497136449, SHA 6b8e7108745252197baafcba0ec3c4711706affd.
- No declarar la suite PostgreSQL completa verde hasta que ese run termine.
