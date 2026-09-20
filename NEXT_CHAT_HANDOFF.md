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
- Candidato de referencia antes de esta auditoría: package `5.0.8`.
- Neon nueva activa; la Neon histórica fue eliminada y no existe como backup.
- Registro con DNI + frente/dorso: probado.
- Admin privado `/admin-la-red`: probado.
- Verificación `pending -> verified`: probada.
- Purga de documentación temporal: probada.
- Reenvío de DNI: implementado.
- CI del checkpoint anterior en Node 22: verde.
- Suite conocida: 14/14 tests verdes antes de la auditoría longitudinal.
- No asumir todavía que el ciclo deportivo completo está validado en integración real.

## Auditoría longitudinal ya realizada

Se corrieron simulaciones largas sobre el modelo competitivo.

Hallazgos principales:

1. La escalera básica, selección de rivales y ELO posicional mantuvieron sus invariantes en cientos de miles de operaciones.
2. En simulaciones de 7 categorías apareció una posible deriva de población hacia categorías superiores, especialmente Primera.
3. El problema todavía NO está resuelto ni debe considerarse una regla modificada.
4. Existe un bug/inconsistencia probable: un no-show objetado e indeterminado puede incrementar `monthly_miss_streak` a ambas parejas aunque la regla exige que la auto-pausa dependa de incumplimientos atribuibles.

## Próximo problema a resolver

Analizar matemáticamente y por simulación cómo estabilizar la distribución entre categorías SIN romper la filosofía de escalera.

Regla vigente de referencia:
- #1 + 3 victorias consecutivas => asciende una categoría.
- último + 3 derrotas consecutivas => desciende una categoría.
- Primera no asciende.
- 7ª no desciende.

Propuesta del usuario AÚN NO APROBADA:
- considerar que el último necesite 5 derrotas para descender.

Importante: esa propuesta puede empeorar la deriva hacia arriba porque reduciría descensos. No adoptarla sin simularla.

El próximo chat debe:
1. construir/usar simulaciones reproducibles;
2. comparar varias reglas de ascenso/descenso;
3. medir población por categoría, flujos de ascenso/descenso, categorías vacías y estabilidad a 5/10/20 años;
4. explicar cuál variante estabiliza mejor y por qué;
5. recién después proponer un cambio de regla;
6. actualizar `.md` + tests junto con cualquier cambio aceptado.

## Metodología

- No pedir al usuario que simule años manualmente.
- El usuario solo debería hacer smoke tests humanos/UX cuando sean necesarios.
- Primero simulación y tests automáticos.
- Luego integración PostgreSQL/concurrencia.
- Después smoke manual.
- Antes de cada bloque grande, actualizar `.md` y hacer checkpoint/push.

## Regla de continuidad

Los `.md` son la memoria oficial del proyecto. El objetivo de este archivo es que un chat nuevo pueda reconstruir el contexto sin depender de un resumen informal del chat anterior.
