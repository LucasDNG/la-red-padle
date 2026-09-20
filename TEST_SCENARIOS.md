# LA RED Pádel — Escenarios obligatorios de validación

Estos casos deben conservarse al modificar reglas, base de datos o backend.

## Alta y onboarding

1. Un usuario puede registrarse sin formar pareja inmediatamente.
2. Después del registro aparecen FORMAR PAREJA y MÁS TARDE.
3. MÁS TARDE mantiene la sesión iniciada y permite navegar.
4. MI LIGA permite volver a la gestión de pareja.
5. No deben existir dos formularios distintos compitiendo para formar/disolver pareja.

## Categorías ilimitadas

1. Una categoría puede tener 10, 30, 100 o más parejas activas sin cerrarse por capacidad.
2. Crear una pareja nueva siempre la coloca en la última posición estructural disponible.
3. No existe espera por cupo.

## Selección de categoría

1. Nuevo + nuevo => pueden elegir cualquier categoría 1ª–7ª.
2. Jugador de 3ª + nuevo => nueva pareja en 3ª.
3. Jugador de 2ª + jugador de 4ª => nueva pareja en 2ª.
4. Jugador que descendió legítimamente de 2ª a 4ª + nuevo => nueva pareja en 4ª.
5. El sistema no debe usar la mejor categoría histórica si la categoría vigente es otra.

## Disolución de pareja

1. La pareja pasa a `inactive` y sigue existiendo en la base.
2. Sus miembros quedan libres para formar nuevas parejas.
3. Sus desafíos `pending` y `accepted` pasan a `cancelled`.
4. Partidos, reportes y movimientos históricos siguen consultables.
5. El ELO no se transfiere.
6. La posición no se transfiere.
7. Las rachas no se transfieren.
8. Cada jugador conserva su categoría vigente individual.

## Ascensos

1. Una pareja que no es líder no asciende aunque tenga 3 victorias seguidas.
2. Líder + 3 victorias seguidas => intercambio con la última pareja de la categoría superior.
3. El #1 de Primera no asciende.
4. Después del intercambio se reinicia la racha que provocó el ascenso.
5. Las posiciones de ambas categorías quedan normalizadas y sin duplicados.
6. La categoría vigente individual de los cuatro jugadores queda actualizada.

## Descensos

1. Una pareja que no es última no desciende aunque tenga 3 derrotas seguidas.
2. Última + 3 derrotas seguidas => intercambio con la líder de la categoría inferior.
3. Una pareja de 7ª no desciende.
4. Después del intercambio se reinicia la racha que provocó el descenso.
5. Las posiciones de ambas categorías quedan normalizadas y sin duplicados.
6. La categoría vigente individual queda actualizada.

## Desafíos

1. Una pareja puede aceptar más de un desafío simultáneamente.
2. Cada desafío aceptado conserva su propio plazo de 30 días.
3. Aceptar un desafío no modifica el plazo de otro.
4. Un desafío vencido aplica la penalización una sola vez.
5. El vencimiento no asigna culpa automática.

## Resultados

1. Una pareja carga un resultado y queda `pending`.
2. La misma pareja que lo cargó no puede auto-confirmarlo.
3. La otra pareja puede confirmar y recién entonces se crea el partido oficial.
4. La otra pareja puede objetar y el resultado queda `disputed`.
5. Un resultado disputado no modifica rachas ni categorías hasta resolución.
6. Confirmar un partido actualiza rachas y evalúa ascenso/descenso.

## Disciplina

1. Tres reportes válidos provenientes de tres parejas distintas dentro de 180 días => `observed`.
2. Cinco reportes válidos provenientes de cinco parejas distintas dentro de 180 días => `review`.
3. Cinco reportes de una misma pareja denunciante cuentan como una sola pareja denunciante.
4. Reportes `dismissed` no cuentan para los umbrales.
5. Reportes anteriores a 180 días permanecen en el historial pero salen del cálculo móvil.

## ELO posicional — invariantes confirmados

1. Dentro de una categoría, si posición A < posición B, entonces ELO(A) > ELO(B).
2. Nunca existen dos ELO iguales entre parejas activas de la misma categoría.
3. Se permiten decimales cuando son necesarios para mantener la distribución.
4. Cuando cambia la cantidad de parejas activas, se recalculan los valores de la escala base 0–2000.
5. El líder tiene 2000 como base antes de cualquier acumulación de récord.
6. Un líder puede superar 2000 mientras mantiene la punta.
7. El máximo histórico de una pareja permanece aunque después pierda ELO o sea archivada.
8. Al perder la punta, el exlíder no puede quedar con el mismo ELO de otra pareja.
9. En el caso definido de bajar a la posición que ocupaba el segundo, queda 1 punto por debajo del ELO que tenía ese segundo antes del cambio.
10. Una nueva pareja no hereda el ELO de parejas anteriores.

## ELO posicional — pendientes antes de implementación completa

1. Definir exactamente cuánto acumula el líder por cada evento que corresponda mientras sigue #1.
2. Definir cómo aplicar el -10 por desafío vencido sin romper orden, unicidad ni distribución posicional.

## Prueba de longevidad

Antes de una versión candidata a producción, ejecutar una simulación larga que incluya:

- altas continuas de jugadores y parejas;
- categorías con gran cantidad de parejas;
- disolución y recreación de parejas;
- ascensos y descensos repetidos;
- múltiples desafíos simultáneos;
- desafíos vencidos;
- resultados confirmados y disputados;
- reportes dentro y fuera de la ventana de 180 días;
- líderes que superan 2000;
- archivo de una pareja que posee un récord histórico.

La simulación debe comprobar, como mínimo:

- ningún jugador pertenece a dos parejas activas;
- no hay posiciones activas duplicadas en una categoría;
- no hay ELO activos duplicados en una categoría;
- las categorías individuales coinciden con el nivel vigente de los jugadores;
- los históricos sobreviven al archivado de parejas;
- las penalizaciones idempotentes no se duplican.
