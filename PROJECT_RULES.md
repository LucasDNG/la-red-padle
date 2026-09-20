# LA RED Pádel — Reglas vigentes del proyecto

> Este archivo es la fuente de verdad funcional. Si una decisión nueva reemplaza una regla anterior, este archivo debe quedar actualizado y sin contradicciones.

## 1. Alcance

- Liga de pádel por parejas para San Pedro, Buenos Aires.
- Dos circuitos: masculino y femenino.
- Categorías numeradas de 1ª a 7ª.
- No existen partidos de ubicación.
- La posición estructural manda sobre cualquier valor complementario de ELO.

## 2. Categorías y altas

- Todas las categorías, de 1ª a 7ª, son sin límite de parejas.
- No debe existir cierre automático por capacidad.
- Una pareja nueva entra en la última posición estructural de su categoría.
- Dos jugadores completamente nuevos pueden elegir libremente la categoría inicial.
- Si uno o ambos jugadores ya tienen una categoría vigente, la nueva pareja entra en la categoría vigente más alta de los dos.
- Como la numeración menor representa una categoría más fuerte, se toma el menor número conocido. Ejemplo: 2ª + 4ª => 2ª.
- Un jugador nuevo + jugador de 3ª => 3ª.
- La categoría vigente individual es el nivel actual válido, no la mejor categoría histórica alcanzada.

## 3. Ciclo de vida de parejas

- Después del registro, el usuario no debe ser obligado a formar pareja.
- El onboarding debe ofrecer: FORMAR PAREJA / MÁS TARDE.
- Si elige MÁS TARDE, sigue autenticado y puede navegar normalmente.
- Debe existir un acceso claro a MI LIGA y desde allí una única gestión de pareja.
- Al disolver una pareja:
  - la pareja pasa a estado `inactive`/archivada;
  - no se elimina físicamente;
  - se conserva el historial existente;
  - los desafíos `pending` y `accepted` relacionados se cancelan;
  - el ELO de la pareja no se transfiere;
  - la posición no se transfiere;
  - las rachas no se transfieren;
  - cada jugador conserva su categoría individual vigente.
- Una nueva pareja comienza sin heredar ELO, posición ni rachas de parejas anteriores.

## 4. Posiciones, ascensos y descensos

- Las posiciones dentro de cada categoría son 1, 2, 3, ... sin límite superior.
- Ascenso: la pareja líder de una categoría que consigue 3 victorias consecutivas intercambia categoría con la última pareja de la categoría inmediatamente superior.
- La pareja #1 de Primera no asciende.
- Descenso: la última pareja de una categoría que acumula 3 derrotas consecutivas intercambia categoría con la líder de la categoría inmediatamente inferior.
- La 7ª no desciende.
- Después de un intercambio se reinicia la racha que produjo el movimiento.
- La normalización de posiciones nunca debe dejar posiciones duplicadas entre parejas activas de la misma categoría.

## 5. Desafíos

- Se pueden tener varios desafíos aceptados simultáneamente.
- Aceptar un desafío no bloquea la aceptación de otro.
- Cada desafío aceptado tiene su propio plazo de 30 días desde la aceptación.
- La rueda de desafíos prioriza historial de cruces y antigüedad.
- Un desafío aceptado que no se juega dentro del plazo vence.
- La penalización histórica acordada para vencimiento es -10 ELO a cada pareja y debe ser idempotente.
- No se asigna culpa automáticamente por vencimiento.

> Pendiente técnico: integrar la penalización -10 con el modelo posicional de ELO sin romper la unicidad de valores.

## 6. Resultados

- Una pareja puede cargar el resultado de un desafío aceptado.
- El resultado queda pendiente hasta que la otra pareja lo confirme o lo objete.
- Al confirmar:
  - se crea el partido oficial;
  - se actualizan las rachas;
  - se comprueban ascensos y descensos;
  - el desafío pasa a `played`.
- Si existe desacuerdo, el resultado no debe afectar ranking ni rachas hasta la resolución administrativa.
- El administrador puede validar el resultado presentado o rechazarlo.
- No se debe afirmar que existe un flujo completo de W.O. mientras no esté implementado expresamente.

## 7. ELO posicional

Reglas confirmadas hasta el momento:

- El ELO representa matemáticamente la posición; la posición es la autoridad.
- Dentro de cada categoría se usa una escala base de 0 a 2000 distribuida porcentualmente entre las parejas activas.
- El #1 tiene 2000 como valor base.
- La última posición tiende a 0.
- Nunca puede haber dos parejas activas de una misma categoría con el mismo ELO.
- Si hacen falta decimales para mantener la distribución y la unicidad, se usan decimales.
- Cuando cambia la cantidad de parejas activas de una categoría, la distribución debe recalcularse.
- El líder puede superar 2000 mientras mantiene la punta y sigue acumulando según la regla de récord.
- El máximo histórico alcanzado debe conservarse aunque la pareja luego pierda la punta o sea archivada.
- Cuando el líder pierde la punta, no debe quedar con el mismo ELO que otra pareja. En el caso ya definido de bajar a la posición que ocupaba el segundo, queda 1 punto por debajo del ELO que tenía ese segundo antes del cambio.
- Una pareja nueva no hereda el ELO de parejas anteriores.

> Pendiente de especificación antes de tocar esta parte del código: fórmula exacta de acumulación del líder sobre 2000 y cómo convive con la penalización -10 por vencimiento manteniendo siempre el orden y la unicidad.

## 8. Récord histórico de ELO

- El récord histórico corresponde al máximo ELO alcanzado por una pareja.
- Debe poder superar 2000.
- Si la pareja se disuelve, el récord histórico permanece.
- El registro debe conservar una instantánea suficiente para seguir identificando la pareja histórica aunque quede archivada.
- No implementar todavía una purga automática de datos históricos.

## 9. Denuncias y disciplina

Motivos admitidos:

- `coordination_refusal`
- `no_show`
- `other`

Ventana móvil: 180 días.

- 3 parejas denunciantes distintas => `observed`.
- 5 parejas denunciantes distintas => `review`.
- Una misma pareja denunciante cuenta una sola vez para los umbrales.
- Los reportes `dismissed` no cuentan para los umbrales.
- Se conserva el historial completo de reportes.
- Administración debe poder ver totales históricos y totales/distintos de los últimos 180 días.
- Puede existir en el futuro una señal para denunciantes frecuentes, pero no hay umbral definido y no debe hardcodearse.

## 10. Datos e historial

- No borrar historial de parejas al archivarlas.
- No implementar todavía una limpieza automática de datos a 12 meses.
- Si en el futuro se implementa retención, primero se debe definir exactamente qué tablas y qué datos son purgables.
- Los datos históricos permanentes y récords deben quedar excluidos de cualquier purga.

## 11. Base de datos y migraciones

- `database/schema.sql` es únicamente para instalaciones nuevas.
- Nunca ejecutar `database/schema.sql` sobre la base de producción existente.
- Las bases existentes se actualizan mediante migraciones fechadas.
- En DBeaver las migraciones manuales se ejecutan una sentencia por vez, salvo una función PL/pgSQL completa, que constituye una sola sentencia.

## 12. Principio de implementación

Antes de modificar código relacionado con reglas de liga, revisar este archivo y `TEST_SCENARIOS.md`.

Si una regla no está definida, no inventarla: dejarla marcada como pendiente o pedir definición antes de implementarla.
