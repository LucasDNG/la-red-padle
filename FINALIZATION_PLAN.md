# LA RED Pádel — Plan de llegada a versión final

## Objetivo

Llegar a una única implementación competitiva coherente con `PROJECT_RULES.md`, probada bajo años simulados de uso, y recién después realizar la limpieza técnica/visual final.

## Fase 0 — Documentación y auditoría

Estado: **EN CURSO / CASI CERRADA**

Entregables:

- `PROJECT_RULES.md`
- `DECISIONS.md`
- `TEST_SCENARIOS.md`
- `CHECKPOINT_2026-09-20.md`
- `AUDIT_2026-09-20.md`
- `FINALIZATION_PLAN.md`

Criterio de salida:

- ningún comportamiento crítico debe depender de recordar el chat;
- todo pendiente debe estar explícitamente marcado.

## Fase 1 — Cerrar decisiones que afectan el modelo de datos

Estado: **CERRADA PARA EL MODELO DE RUEDA**

Ya quedaron definidos:

1. ascenso al fondo del bloque activo;
2. descenso a categoría inferior vacía => #1;
3. deuda y rachas en pausa;
4. pausa/disolución con compromisos abiertos;
5. atribución objetiva básica mediante coordinación registrada;
6. orden active/paused;
7. paused fuera del denominador ELO;
8. rechazo de ambas versiones => `void`;
9. marcador estructurado;
10. ventana ordinaria de denuncia de 15 días;
11. variedad/rematch por nunca enfrentado + cruce más antiguo;
12. disciplina bloquea nuevas asignaciones;
13. récord de Primera independiente para masculino y femenino;
14. invitaciones de pareja y restricción de membresía vigente;
15. `pause_after_current`;
16. `discipline_resolved_at`.

Queda abierta únicamente la fórmula proporcional definitiva del ELO normal. Puede cerrarse durante Fase 6 sin impedir construir el modelo de rueda.

## Fase 2 — Modelo de datos competitivo nuevo

Crear una migración fechada; nunca tocar producción con `schema.sql`.

Diseño recomendado:

- separar `competition_state` de `discipline_state`;
- entidad de `wheel_assignments`/partidos asignados;
- un único compromiso abierto por pareja garantizado transaccionalmente;
- plazo `play_deadline_at` de 30 días;
- registro estructurado de coordinación;
- contador de incumplimientos consecutivos;
- soporte `paused`;
- una versión de resultado por pareja;
- `confirmation_deadline_at` de 15 días;
- timestamps de auto-validación/resolución;
- fecha real de partido;
- estadísticas acumuladas aptas para ranking sin escanear todo el historial.

Criterio de salida:

- migración ejecutable sentencia por sentencia;
- consultas de post-migración verifican estructura e integridad.

## Fase 3 — Motor de rueda único

Implementar:

- asignación solo entre parejas elegibles de la misma categoría;
- un partido abierto máximo por pareja;
- prevención de duplicados;
- espera sin penalización cuando no existe rival elegible;
- criterio de variedad;
- criterio de antigüedad de espera para evitar starvation;
- vencimiento a 30 días;
- penalización simultánea;
- deuda si no puede bajar;
- contador de incumplimientos;
- segundo incumplimiento consecutivo => `paused`.

Criterio de salida:

- ningún endpoint competitivo debe crear “desafíos múltiples” del modelo viejo.

## Fase 4 — Resultados y administración

Implementar:

- carga estructurada por una pareja;
- respuesta estructurada de la otra;
- bloqueo de ambas;
- 15 días;
- confirmación inmediata cuando coincide;
- auto-validación idempotente por silencio;
- disputa con ambas versiones visibles;
- resolución administrativa;
- fecha real del partido;
- actualización única del motor competitivo.

Criterio de salida:

- una asignación produce como máximo un partido oficial;
- ningún resultado puede oficializarse fuera de orden para una misma pareja.

## Fase 5 — Pausa, disolución y disciplina

Implementar:

- pausa voluntaria;
- pausa automática;
- reactivación;
- fondo de categoría;
- ELO visible 0 en pausa;
- separación disciplina/ciclo competitivo;
- regla segura para pausa/disolución con casos abiertos;
- disciplina sin reactivar accidentalmente pausados.

Criterio de salida:

- `paused` nunca libera integrantes para formar otra pareja;
- `inactive` sigue siendo disolución real.

## Fase 6 — ELO, ranking y estadísticas

Cerrar fórmula ELO normal y luego implementarla.

Optimizar:

- ranking de lectura;
- stats de victorias/games precomputadas o actualizadas por evento;
- récord de Primera como snapshot histórico;
- ninguna escritura masiva provocada por `GET /ranking`.

Criterio de salida:

- 100+ parejas por categoría y miles de partidos no degradan el endpoint de ranking de forma proporcional a todo el historial.

## Fase 7 — Tests automáticos y simulación larga

Agregar `npm test` usando `node:test` o equivalente.

Niveles:

1. funciones puras de posición/rueda/marcador;
2. integración de base sobre DB de prueba;
3. simulación de años;
4. pruebas de concurrencia/idempotencia;
5. regresiones de todos los bugs de `AUDIT_2026-09-20.md`.

Escenarios de estrés:

- miles de asignaciones;
- parejas muy activas;
- parejas que siempre consumen 30 días;
- categorías de 1, 2, 3, 100+ parejas;
- categorías impares;
- pausas masivas;
- ascensos/descensos simultáneos;
- resultados al límite de 15 días;
- confirmaciones concurrentes;
- maintenance concurrente;
- admin lento en disputas;
- intentos de disolver para evitar un resultado.

Criterio de salida:

- cero violaciones de invariantes;
- pruebas repetibles en cada push.

## Fase 8 — Desconexión y limpieza del motor viejo

Solo después de que el motor nuevo pase las pruebas:

- eliminar funciones viejas de desafío 30/90;
- eliminar `-10 ELO` histórico del runtime;
- eliminar formulario/League viejo no usado;
- eliminar chequeos de cupos;
- eliminar duplicados de lógica;
- actualizar README e instrucciones;
- simplificar imports/endpoints.

Criterio de salida:

- existe un solo camino para cada operación competitiva.

## Fase 9 — Seguridad, PWA y acabado visual

- rate limiting;
- validación/normalización de inputs;
- rol admin revalidado o estrategia equivalente;
- PWA/offline;
- responsive final;
- coherencia visual;
- accesibilidad básica;
- textos definitivos sin reglas viejas.

## Fase 10 — Release final

Antes del release:

- backup/snapshot de base;
- migración final aplicada;
- queries de verificación;
- `npm run check`;
- `npm test`;
- `frontend npm run build`;
- simulación larga verde;
- deploy backend/frontend;
- smoke test de producción;
- ZIP final autocontenido del proyecto consolidado.

## Definición de “terminado”

LA RED no se considera terminada porque “abre y funciona”. Se considera terminada cuando:

- las reglas y el código dicen lo mismo;
- no hay dos motores competitivos;
- existe una sola asignación activa por pareja;
- los plazos son idempotentes;
- no se puede escapar de un resultado disolviendo/pausando;
- el ranking no se reordena por estadísticas;
- los históricos sobreviven;
- los tests cubren las reglas críticas;
- la simulación larga no rompe invariantes;
- no quedan textos o rutas que ejecuten reglas obsoletas.


## Ajuste de plan — autonomía administrativa

Antes de escribir la migración de rueda, se consideran cerrados: entrada del ascendido al fondo activo, descenso a categoría inferior vacía (#1), deuda/rachas en pausa, pausa con compromiso (`pause_after_current`), criterio de rival, disciplina y rueda, resultado `void`, formato estructurado de marcador y ventana ordinaria de denuncia de 15 días.

Diseño de datos adicional obligatorio:

- invitaciones de pareja;
- membresía vigente protegida por DB;
- `competition_state` y `discipline_state`;
- `discipline_resolved_at`;
- `monthly_miss_streak`, `pause_after_current`, `waiting_since`;
- assignments + participantes únicos;
- eventos de coordinación;
- versiones de resultado;
- notifications/event log;
- stats acumuladas para ranking.

La cola administrativa final se limita a excepciones reales. El motor debe poder pasar días/semanas sin que el administrador tenga que asignar rivales, aplicar sanciones o validar resultados silenciosos.

## Ajuste de producto — cartelera pública y sedes

El modelo de datos definitivo también debe contemplar:

- programación aceptada (`scheduled_at`) separada de la asignación;
- lugar administrable (`venues`) con activo/inactivo y sede asociada opcional;
- snapshot del lugar/programación para preservar historial;
- doble aceptación para publicar/reprogramar;
- endpoint público de próximos partidos de solo lectura;
- dos consultas/récords independientes para Primera Masculina y Primera Femenina.

Estos puntos forman parte del bloque funcional antes de la limpieza visual final.


## Ajuste de modelo posterior al checkpoint de producto

La migración funcional definitiva también deberá contemplar:

- DNI único, estado de verificación y auditoría de identidad;
- estado disciplinario de jugador separado del de pareja;
- invitaciones de pareja con expiración de 10 días;
- categoría individual independiente de la categoría temporal de pareja;
- programación única por assignment y propuestas/cambios auditados;
- una prórroga extraordinaria de 15 días;
- `pause_after_current`;
- no-show con ventana de 48 horas;
- resultado `injury_abandonment` sin games;
- solicitud de disolución y deadline de 7 días;
- centro de notificaciones + outbox/idempotencia para WhatsApp;
- eventos explicativos reutilizables por historial/UI;
- auditoría de acciones administrativas;
- zona horaria oficial de negocio.

Antes del release, la simulación debe incluir cambios de año, fallos de entrega de WhatsApp, solicitudes de disolución con assignment abierto, cambios de fecha repetidos y disciplina individual atravesando cambios de pareja.


## Fase legal/comercial obligatoria antes del release

Antes de publicación general:

- versión final de Términos y Condiciones;
- asunción informada de riesgos;
- Código de Conducta;
- Política de Privacidad;
- consentimiento de WhatsApp;
- registro/versionado de aceptaciones;
- revisión por abogado argentino;
- evaluación de responsabilidad civil/accidentes;
- revisión de tratamiento de DNI/teléfono;
- definición del rol de LA RED frente a sedes.

Antes de activar pagos/reservas comerciales:

- proveedor de pagos;
- acuerdo modelo con sedes;
- comisión y liquidación;
- políticas de cancelación/reintegro;
- facturación/impuestos;
- chargebacks;
- revisión legal/contable/tributaria.

El motor deportivo debe quedar desacoplado de estas funciones para que monetizar no cambie ranking, rueda ni resultados.
