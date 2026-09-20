# LA RED Pádel — Reglas vigentes del proyecto

> Fuente de verdad funcional. Antes de cambiar reglas, backend, base o frontend, revisar este archivo y `TEST_SCENARIOS.md`.

## 1. Alcance

- Liga de pádel por parejas para San Pedro, Buenos Aires.
- Dos circuitos: masculino y femenino.
- Categorías de 1ª a 7ª.
- Todas las categorías son ilimitadas.
- No existen partidos de ubicación.
- La posición se conquista en cancha. Las estadísticas auxiliares no reemplazan la escalera del ranking.

## 2. Alta de jugadores y parejas

- Registrarse no obliga a formar pareja inmediatamente.
- Después del registro se ofrece `FORMAR PAREJA` / `MÁS TARDE`.
- `MÁS TARDE` mantiene la sesión iniciada.
- `MI LIGA` debe permitir volver a una única gestión de pareja.
- Dos jugadores completamente nuevos pueden elegir libremente la categoría inicial.
- Si uno o ambos ya tienen categoría vigente, la nueva pareja entra en la categoría vigente más fuerte de los dos.
- Menor número = categoría más fuerte. Ejemplo: 2ª + 4ª => 2ª.
- La categoría individual vigente representa el nivel actual, no la mejor categoría histórica.
- Una pareja nueva entra al fondo de su categoría.
- No existe espera por cupo.

## 3. Ciclo de vida de parejas

Al disolver una pareja:

- pasa a `inactive` y queda archivada;
- no se elimina físicamente;
- conserva su historial;
- los desafíos `pending` y `accepted` relacionados se cancelan;
- resultados pendientes/disputados quedan cerrados sin impactar el ranking;
- ELO, posición y rachas no se transfieren a una pareja futura;
- cada jugador conserva su categoría individual vigente.

Una nueva pareja empieza con identidad competitiva propia.

## 4. Corazón del ranking: escalera por desafíos

La regla principal del ranking es el intercambio de posiciones.

- Si una pareja ubicada más abajo le gana a una pareja ubicada más arriba, intercambian posiciones.
- Si gana la pareja que ya estaba más arriba, las posiciones no cambian.
- No se reordena toda la categoría por porcentaje de victorias, ELO ni diferencia de games.
- Una posición ganada se conserva hasta que otro resultado o una penalización produzca un movimiento.

Ejemplo:

- #4 A
- #5 B
- #6 C
- #7 D

Si #7 D vence a #4 A:

- #4 D
- #5 B
- #6 C
- #7 A

## 5. Parejas nuevas, actividad y desempates auxiliares

- Una pareja sin partidos oficiales tiene ELO 0.
- Puede haber varias parejas nuevas con ELO 0.
- Entre parejas todavía sin partidos, la más antigua queda antes que la más nueva.
- Cuando una pareja juega su primer partido oficial, aunque lo pierda, deja de estar detrás de las parejas que nunca jugaron.
- Estos criterios son auxiliares y no reemplazan la escalera ganada en cancha.

Cuando exista un empate deportivo que realmente necesite desempate, el orden auxiliar es:

1. mayor cantidad de partidos ganados;
2. mejor diferencia de games (`games ganados - games perdidos`);
3. pareja creada con mayor antigüedad.

Si dos parejas siguen exactamente empatadas en los criterios deportivos definidos, se permite que muestren el mismo ELO; la antigüedad puede ordenar visualmente sin inventar una diferencia deportiva.

## 6. ELO posicional

- El ELO acompaña la posición; no decide por sí solo la posición.
- Se usa una escala base porcentual entre 0 y 2000 dentro de cada categoría.
- Cuando cambia la cantidad de parejas, la escala se recalcula.
- Se permiten decimales.
- Las parejas sin partidos muestran ELO 0.
- El único ELO por encima de 2000 pertenece al #1 de Primera durante una defensa de la punta.
- El récord histórico no se transfiere a una pareja nueva.

### Regla técnica vigente para la escala base

La versión candidata calcula, para una pareja que ya jugó al menos un partido:

`ELO = 2000 × (cantidad_total - posición) / (cantidad_total - 1)`

Con una sola pareja que ya jugó, el valor base es 2000.

Las parejas sin partidos se fuerzan a 0. Por eso varias parejas nuevas pueden compartir 0.

## 7. #1 de Primera y récord histórico

- Solo el #1 de Primera puede superar 2000.
- Conquistar el #1 deja a la pareja en 2000; esa victoria no cuenta como defensa.
- Cada victoria oficial obtenida cuando la pareja ya era #1 de Primera y conserva el #1 suma `+1` ELO.
- 2015 ELO = 15 defensas exitosas en esa permanencia como #1.
- Si pierde la punta, deja de acumular y vuelve al ELO correspondiente a su nueva posición.
- El máximo histórico alcanzado se conserva permanentemente.
- El récord público corresponde únicamente a Primera.
- La portada debe mostrar la pareja que alcanzó el ELO histórico más alto de Primera y la cantidad de defensas asociada al récord.

## 8. Ascensos y descensos

- Si una pareja está #1 y alcanza 3 victorias consecutivas, asciende a la categoría inmediatamente superior.
- El #1 de Primera no asciende.
- Si una pareja está última y alcanza 3 derrotas consecutivas, desciende a la categoría inmediatamente inferior.
- La 7ª no desciende.
- La cantidad de parejas de cada categoría no modifica estas reglas.
- Después del movimiento se reinicia la racha que lo produjo.

### Entrada al descender

- Una pareja que desciende no desplaza al #1 de la categoría inferior.
- La entrada base del descenso es #2.
- Cada deuda de posición acumulada empuja la entrada un puesto adicional: deuda 1 => #3; deuda 2 => #4; etc.
- Si no existen suficientes puestos para materializar toda la deuda, entra lo más abajo posible y la deuda sobrante se conserva.

### Punto a auditar después del próximo push

- La versión candidata hace que una pareja que asciende entre al fondo de la categoría superior.
- Si una categoría inferior estuviera completamente vacía, la implementación candidata usa #1 para no crear un hueco artificial. Este caso límite se revisará en la auditoría posterior al push.

## 9. Desafíos y rueda

- Una pareja puede tener varios desafíos aceptados simultáneamente.
- Cada desafío mantiene sus propios plazos.
- La rueda prioriza menos cruces históricos y, después, antigüedad.
- Los rivales deben estar activos y pertenecer a la misma categoría al momento de crear el desafío.

### Plazo para aceptar

- La pareja desafiada tiene 30 días desde la creación para aceptar.
- Si no acepta dentro de los 30 días, el desafío vence.
- La pareja desafiada pierde 1 puesto.
- Si ya estaba última y no puede perder un puesto real, suma 1 a su deuda de posición.

### Plazo para jugar/resolver

- Una vez aceptado, el desafío tiene 90 días desde la aceptación para jugarse/resolverse.
- Si vence sin resolución, ambas parejas pierden 1 puesto.
- Si alguna ya está última, esa pareja suma 1 a su deuda de posición.
- La penalización se aplica una sola vez por desafío.
- Una carga de resultado pendiente o disputada representa un partido ya jugado y congela la penalización automática hasta la resolución administrativa.

### Regla reemplazada

Queda eliminada la penalización anterior de `-10 ELO` por desafío vencido.

## 10. Penalizaciones de posición

- Una penalización de posición baja a la pareja un puesto si existe una pareja inmediatamente debajo.
- La pareja que estaba debajo sube un puesto.
- La penalización no cuenta como derrota deportiva y no altera por sí sola las rachas de victorias/derrotas.
- Si la pareja ya está última, la penalización se guarda en `position_penalty_debt`.
- La deuda se utiliza al producirse un descenso según la regla de entrada de la sección 8.

## 11. Resultados

- Una pareja carga el resultado de un desafío aceptado.
- El resultado queda `pending` hasta que la otra pareja lo confirme o lo objete.
- La pareja que cargó el resultado no puede auto-confirmarlo.
- Solo un resultado confirmado produce partido oficial y movimientos competitivos.
- Al confirmar se actualizan:
  - intercambio de posiciones de la escalera;
  - rachas;
  - ELO;
  - defensas del #1 de Primera;
  - ascensos/descensos.
- Un resultado `disputed` no modifica ranking ni rachas hasta resolución administrativa.
- Administración puede confirmar o rechazar el resultado disputado.
- No afirmar que existe un flujo W.O. completo mientras no esté implementado expresamente.

## 12. Denuncias y disciplina

Motivos:

- `coordination_refusal`
- `no_show`
- `other`

Ventana móvil: 180 días.

- 3 parejas denunciantes distintas => `observed`.
- 5 parejas denunciantes distintas => `review`.
- La misma pareja denunciante cuenta una sola vez para esos umbrales.
- Reportes `dismissed` no cuentan.
- El historial completo se conserva.
- Administración ve totales históricos y de los últimos 180 días.
- No hardcodear todavía un umbral para "denunciante frecuente".

## 13. Datos e historial

- No borrar historial al archivar parejas.
- No implementar todavía purga automática a 12 meses.
- Antes de cualquier política de retención se debe definir qué datos son purgables.
- Récords y datos históricos permanentes quedan excluidos de una futura purga.

## 14. Base de datos y migraciones

- `database/schema.sql` es únicamente para bases nuevas.
- Nunca ejecutar `database/schema.sql` sobre producción existente.
- Producción se actualiza con migraciones fechadas.
- En DBeaver, ejecutar migraciones manuales una sentencia por vez; una función PL/pgSQL completa cuenta como una sola sentencia.

## 15. Principio de implementación

- Antes de modificar reglas, releer `PROJECT_RULES.md` y `TEST_SCENARIOS.md`.
- Si una regla no está definida, no inventarla silenciosamente.
- Los criterios auxiliares nunca deben sustituir el corazón de la escalera por desafíos.
