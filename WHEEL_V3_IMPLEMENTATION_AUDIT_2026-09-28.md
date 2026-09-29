# Wheel v3 — Auditoría de implementación
Fecha: 2026-09-28

## Estado general

Wheel v3 ya no es solo una especificación: existe un motor aislado en `src/wheelV3Engine.js` y reglas puras compartidas en `src/wheelV3Rules.js`.

**Todavía no está activado en producción.** `app_settings.engine` sigue en `wheel-v2`, pero backend y frontend ya están integrados en modo dual detrás del selector de engine. `wheel-v2` permanece activo hasta el cutover; `wheel-v3` está implementado, enrutable y validado por CI.

La estrategia sigue siendo expand -> validar -> integrar -> cutover -> limpiar legacy.

## Implementado y cubierto por regresiones escritas

### Estado/migración
- estado por circuito y cierre irreversible de formación;
- estado Wheel v3 por pareja;
- estado anti-abuso por dupla exacta;
- espera basada en último partido real;
- ruta de descenso;
- defensa obligatoria;
- inactividad/retorno;
- reinados del #1 de Primera;
- atacante/defensor/cancelación/primera carga por assignment;
- vínculo opcional assignment -> reinado histórico de Primera;
- resultado administrativo explícito;
- no-show con historial múltiple y un único reporte vivo;
- migración aditiva/idempotente y schema limpio equivalente.

### Formación y población
- formación por circuito;
- cierre cuando 7/7 categorías alcanzan 5 activas;
- inicialización atómica de zonas 0/3;
- borde 0 PJ;
- umbral poblacional 3/2/1;
- aceleración solo si mejora el desvío conjunto;
- movimientos adyacentes.

### Rueda
- ataque/defensa;
- extremos sobre la tabla activa completa, no sobre el subconjunto libre;
- prioridad por tiempo desde partido real;
- ventanas de 3;
- expansión inmediata;
- colisiones por antigüedad;
- no-repeat blando;
- ruta especial de descenso;
- máximo un compromiso materializado mediante `wheel_assignment_participants`.

### Resultados
- primera carga dentro de 30 días;
- revisión fija de 7 días;
- edición no reinicia revisión;
- silencio auto-valida;
- versiones coincidentes confirman;
- versiones contradictorias disputan;
- confirmación explícita;
- resultado normal valida marcador/ganador;
- lesión/abandono cuenta como real;
- resultado jugado antes de cancelación puede cargarse tarde;
- `played_at` posterior a cancelación se rechaza;
- un ganador nunca baja por resultado tardío;
- resultado histórico no modifica zonas de una categoría que la pareja ya abandonó;
- espera real nunca retrocede por un resultado histórico.

### Ascenso/descenso
- llegar #1 inicia 0 y el partido que llevó allí no cuenta;
- tocar último inicia 0 y la derrota que llevó allí no cuenta;
- promoción solo con victorias reales;
- victoria administrativa no suma promoción;
- victoria real sale del período de descenso;
- descenso persistente de la dupla exacta;
- descenso directo de último + incumplimiento, salvo 7ª;
- ascenso entra anteúltimo;
- descenso entra #2 o #1 si está vacía;
- categorías individuales se actualizan según las reglas anti-evasión.

### Incumplimientos
- unilateral 6-0 6-0;
- incumplidor nunca mejora;
- defensa obligatoria;
- ambos incumplen: exactamente una posición efectiva cada uno;
- deuda futura cuando no hay espacio;
- consumo de deuda cuando una inserción futura desplaza;
- racha exacta por dupla;
- tercera falta -> 30 días;
- auto-reactivación por reloj PostgreSQL.

### Inactividad
- solicitud inmediata sin assignment;
- solicitud pendiente si existe compromiso;
- se aplica automáticamente al cerrarse el compromiso;
- posición de retorno por meses calendario completos;
- #1 retorna como máximo #2;
- no cambia categoría por tiempo;
- reinicia espera al volver;
- conserva descenso exacto pendiente.

### Disolución/reforma
- archivo no borra estado exacto de dupla;
- reforma normal usa categorías individuales vigentes;
- descenso pendiente obliga a volver excepcionalmente a la categoría original;
- pérdidas/ruta de descenso sobreviven;
- racha de incumplimientos sobrevive;
- una sanción vigente no puede evadirse reformando;
- sanción vencida se limpia como bloqueo pero no inventa un reset de racha;
- Primera cierra el reinado al disolverse.

### No-show
- solo después de horario oficial;
- 48 h de reconsideración;
- reporter puede cancelar;
- puede re-reportarse luego de una reprogramación;
- aceptación expresa resuelve inmediatamente;
- contradicción bloquea;
- vencimiento unilateral pasa a Administración;
- nunca se auto-condena;
- no-show vivo bloquea el vencimiento genérico de 30 días;
- resolución administrativa auditada.

### Primera
- reinados separados;
- pérdida de punta cierra reinado;
- regreso empieza en cero;
- defensa real suma;
- no-show aceptado puede sumar defensa;
- assignment de Primera queda ligado al reinado que estaba defendiendo;
- una defensa cargada tarde acredita el reinado histórico correcto.

### Programación
- propuestas con reloj DB;
- respuesta 48 h;
- nueva propuesta reemplaza pendiente;
- aceptación por la otra pareja;
- fecha/lugar libres dentro de límites;
- cambiar fecha nunca modifica el deadline general de 30 días;
- propuesta vencida se cierra sin alterar assignment.

### Historial/notificaciones
- eventos `wheel_v3_movement` para movimientos reales;
- consulta pública de últimos 5 movimientos;
- no se necesita historial completo de partidos por pareja;
- notificaciones/WhatsApp en assignments, resultados, disputas, cancelaciones, formación, movimientos, inactividad, reactivación, sanciones, no-show y programación;
- claves de deduplicación para evitar avisos duplicados.

## Aún pendiente antes del cutover

No quedan tareas funcionales conocidas de implementación Wheel v3. El pendiente es operativo:

1. Elegir el SHA final y exigir que GitHub Actions esté completamente verde.
2. Lograr que Render y Vercel desplieguen ese mismo SHA. Vercel actualmente puede quedar bloqueado por `build-rate-limit`; no se fuerza el cutover mientras eso ocurra.
3. Ejecutar `EXPECTED_RELEASE_SHA=<sha> npm run precutover:wheel-v3` contra producción y exigir `ok: true`.
4. Resolver cualquier blocker real reportado por el precutover, sin omitir ni desactivar gates.
5. Quiescer temporalmente el backend para que no queden requests v2 en vuelo.
6. Ejecutar la activación atómica con `CONFIRM_WHEEL_V3_CUTOVER=YES`, `WHEEL_V3_BACKEND_QUIESCED=YES`, `EXPECTED_RELEASE_SHA=<sha>` y `CUTOVER_ADMIN_USER_ID=<admin verificado>`.
7. Reanudar backend y ejecutar `EXPECTED_RELEASE_SHA=<mismo sha> npm run postcutover:wheel-v3`.
8. Observar estabilidad antes de retirar físicamente tablas, columnas o runtime legacy.

El runbook operativo está en `WHEEL_V3_CUTOVER_RUNBOOK.md`.

## Regla de seguridad de implementación

No conectar parcialmente `wheelV3Engine.js` a producción mientras unas rutas sigan aplicando consecuencias competitivas v2 y otras v3. La integración debe quedar completa detrás de un selector de engine y el cambio efectivo debe ser atómico.

## Evidencia ejecutada de implementación — 2026-09-29

- Run de GitHub Actions: `36509908405`.
- Commit validado: `9fa38f9a0529bafd3c7d36f82c72ac0d70b85710`.
- Resultado del workflow: `success`.
- Pasaron build frontend, chequeo de sintaxis/imports, unit tests, `verify:db` y suite de integración PostgreSQL completa.
- El motor productivo sigue seleccionado como `wheel-v2`; la validación corresponde al código dual y al motor v3 aislado/ruteable, no a un cutover productivo ya realizado.

## Cierre funcional definitivo — 2026-09-29

- Código final validado: `8c4d0104bffd98df72ec473d1297c8f72832138e`.
- GitHub Actions: run `36519976313`, resultado `success` completo.
- Últimos bordes cerrados: defensa obligatoria cumplida por defensa real, búsqueda de rival fresco más allá de la primera ventana, semántica poblacional no-empeorante y nomenclatura inequívoca de ingreso anteúltimo.
- No quedan defectos funcionales conocidos ni tareas de implementación Wheel v3 abiertas en esta auditoría.
- El único trabajo pendiente es operativo y está descrito en `WHEEL_V3_CUTOVER_RUNBOOK.md`; hasta ejecutarlo, producción permanece en `wheel-v2`.


## Releases de backend/frontend desacopladas — 2026-09-29

El requisito operativo ya no es identidad de commit entre proveedores, sino **compatibilidad demostrada + verificación exacta de cada artefacto desplegado**.

- `precutover:wheel-v3` y `postcutover:wheel-v3` validan `EXPECTED_BACKEND_SHA` y `EXPECTED_FRONTEND_SHA` por separado.
- `activateWheelV3()` exige ambos SHA y los registra en auditoría.
- Run `36521118598` sobre `eba415f82579d7dc763513531cbb7c6f4c35f831`: success completo.
- Vercel `87532489ca44d8ed5cd9378a5e17db64f360c032` es compatible con ese backend según diff de repositorio sin cambios de frontend/API pública entre ambos.
- Aun así, el SHA real de cada proveedor debe ser leído por smoke/precutover; no se adivina.
