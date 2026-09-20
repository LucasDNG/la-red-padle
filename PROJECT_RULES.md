# LA RED Pádel — Reglas vigentes del proyecto

> **Fuente de verdad funcional.** Antes de cambiar reglas, backend, base o frontend, revisar este archivo y `TEST_SCENARIOS.md`.
>
> Este documento contiene solo reglas vigentes. Las reglas reemplazadas quedan en `DECISIONS.md`, no acá.

## 1. Alcance

- Liga de pádel por parejas para San Pedro, Buenos Aires.
- Dos circuitos: masculino y femenino.
- Categorías de 1ª a 7ª.
- Todas las categorías son ilimitadas.
- No existen partidos de ubicación.
- El ranking es una escalera: la posición se conquista y se pierde por resultados de cancha o penalizaciones de posición.
- **Las estadísticas desempatan; no gobiernan el ranking. El ranking se conquista en cancha mediante intercambio de posiciones.**

## 2. Alta de jugadores y parejas

- Registrarse no obliga a formar pareja inmediatamente.
- Después del registro se ofrece `FORMAR PAREJA` / `MÁS TARDE`.
- `MÁS TARDE` mantiene la sesión iniciada.
- `MI LIGA` debe llevar a una única gestión de pareja.
- Dos jugadores completamente nuevos pueden elegir libremente la categoría inicial.
- Si uno o ambos ya tienen categoría vigente, la nueva pareja entra en la categoría vigente más fuerte de los dos.
- Menor número = categoría más fuerte. Ejemplo: 2ª + 4ª => 2ª.
- La categoría individual vigente representa el nivel actual, no la mejor categoría histórica.
- Una pareja nueva entra al fondo de su categoría.
- No existe espera por cupo.

## 3. Estados de una pareja

Los estados conceptuales deben distinguirse claramente:

- `active`: pareja existente y participando normalmente de la rueda.
- `paused`: pareja existente, temporalmente fuera de la rueda competitiva.
- `inactive`: pareja disuelta/archivada.

`paused` e `inactive` no son equivalentes.

### Pareja disuelta (`inactive`)

Al disolver una pareja:

- pasa a `inactive` y queda archivada;
- no se elimina físicamente;
- conserva el historial existente;
- sus compromisos competitivos abiertos deben cerrarse/cancelarse sin transferirlos a una pareja futura;
- ELO, posición y rachas no se transfieren;
- cada jugador conserva su categoría individual vigente.

Una nueva pareja empieza con identidad competitiva propia.

### Pareja pausada (`paused`)

- Sigue existiendo como la misma pareja.
- Conserva categoría e historial.
- Sale de la rueda y no recibe nuevos partidos mientras esté pausada.
- Se ubica al fondo de su categoría.
- Su ELO competitivo visible pasa a 0 mientras está pausada.
- No sigue recibiendo penalizaciones mensuales por no jugar mientras permanece pausada.
- Al reactivarse vuelve a competir desde el fondo de su categoría.

> **Pendiente:** definir de forma cerrada qué ocurre con deuda de posición previa al entrar/salir de `paused` y qué pasa si se solicita pausa mientras existe un partido de rueda abierto.

## 4. Corazón del ranking: escalera

- Si una pareja ubicada más abajo le gana a una pareja ubicada más arriba, intercambian posiciones.
- Si gana la pareja que ya estaba más arriba, las posiciones no cambian.
- No se reordena toda la categoría por porcentaje de victorias, ELO, diferencia de games ni antigüedad.
- Una posición ganada se conserva hasta que otro resultado válido, una penalización o un movimiento de categoría la modifique.

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

## 5. Parejas nuevas y desempates auxiliares

- Una pareja sin partidos oficiales tiene ELO 0.
- Puede haber varias parejas con ELO 0.
- Entre parejas nuevas todavía equivalentes y sin actividad, la antigüedad de `pairs.created_at` puede ordenar visualmente: más antigua primero.
- Jugar el primer partido **no autoriza a reordenar automáticamente la escalera** ni a quitar una posición previamente ganada.

Cuando exista un desempate auxiliar real, el orden es:

1. mayor cantidad de partidos ganados;
2. mejor diferencia acumulada de games (`games ganados - games perdidos`);
3. mayor antigüedad de la pareja.

Estos criterios nunca pueden reemplazar la posición estructural ganada en cancha.

## 6. ELO posicional

- El ELO acompaña la posición; no gobierna el ranking.
- La escala base debe ser proporcional a la posición y a la cantidad de parejas activas de la categoría.
- Se permiten decimales.
- Las parejas sin partidos oficiales muestran ELO 0.
- Pueden existir ELO repetidos cuando las reglas deportivas lo permitan; no existe una obligación de unicidad numérica absoluta.
- Solo el #1 de Primera puede superar 2000 por defensas exitosas.

> **Pendiente funcional:** la fórmula proporcional exacta para posiciones normales todavía debe validarse definitivamente. La fórmula actualmente implementada en el código candidato no debe considerarse inmutable por estar implementada.

## 7. #1 de Primera y récord histórico

- Conquistar el #1 de Primera deja a la pareja en ELO base 2000.
- La victoria con la que conquista el #1 no cuenta como defensa.
- Cada victoria oficial obtenida cuando la pareja ya era #1 de Primera y conserva esa posición suma `+1` ELO.
- 2015 ELO = 15 defensas exitosas del #1 de Primera.
- Si pierde la punta, deja de acumular defensas.
- El máximo histórico de Primera alcanzado por cualquier pareja se conserva permanentemente.
- El récord público considera únicamente Primera.
- La portada debe mostrar pareja, máximo ELO y cantidad de defensas asociadas al récord.

## 8. Ascensos y descensos deportivos

### Ascenso

- #1 de una categoría + 3 victorias consecutivas => asciende a la categoría inmediatamente superior.
- El #1 de Primera no asciende.
- La cantidad de parejas de las categorías no modifica esta regla.
- La racha que produjo el ascenso se reinicia después del movimiento.

> **Pendiente:** confirmar definitivamente en qué posición entra la pareja ascendida en la categoría superior. El código candidato actual la coloca al fondo, pero sigue bajo auditoría.

### Descenso

- Última pareja de una categoría + 3 derrotas consecutivas => desciende a la categoría inmediatamente inferior.
- La 7ª no desciende.
- La cantidad de parejas de las categorías no modifica esta regla.
- La racha que produjo el descenso se reinicia después del movimiento.
- Una pareja que desciende nunca desplaza al #1 de la categoría inferior.
- Entrada base al descender: #2.
- Cada unidad de deuda de posición empuja la entrada un puesto adicional: deuda 1 => #3, deuda 2 => #4, etc.
- Si no existen suficientes puestos para materializar toda la deuda, entra lo más abajo posible y la deuda sobrante se conserva.

> **Pendiente:** comportamiento exacto si la categoría inferior está completamente vacía.

## 9. Rueda competitiva mensual

La rueda reemplaza el modelo de múltiples desafíos activos y los plazos anteriores de 30 días para aceptar / 90 días para jugar.

### Principios

- Una pareja `active` puede tener **como máximo un partido de rueda abierto a la vez**.
- La rueda asigna el rival; no debe depender de que las dos parejas creen desafíos manuales entre sí.
- Un rival asignado debe pertenecer a la misma categoría en el momento de la asignación.
- El sistema debe evitar duplicar compromisos activos entre las mismas parejas.
- El criterio de rueda debe favorecer variedad de rivales y considerar el historial de cruces; el algoritmo exacto queda sujeto a simulación de largo plazo.

### Plazo de juego

- Desde la asignación de un partido de rueda existen **30 días corridos** para jugarlo y cargar un resultado.
- Los 30 días son un **plazo máximo**, no un límite de frecuencia.
- Si un partido se resuelve hoy, la pareja puede recibir un nuevo rival inmediatamente y volver a jugar al día siguiente o incluso el mismo día si la logística lo permite.
- No existe una regla de “solo un partido por mes”. Existe una obligación de no dejar vencer el partido asignado.

### Incumplimiento del plazo de 30 días

- Si una pareja cumplió con la coordinación y la otra fue responsable de que el partido no se jugara, baja un puesto únicamente la incumplidora.
- Si ninguna de las dos realizó acciones válidas para concretarlo, ambas reciben la penalización de un puesto.
- Si una pareja ya está última y no puede bajar físicamente, la penalización se acumula como deuda de posición.
- Una penalización de inactividad no cuenta como derrota deportiva y no modifica por sí sola la racha de derrotas.

> **Pendiente técnico/funcional:** definir el mecanismo objetivo con el que el sistema atribuye responsabilidad (propuestas de fecha, respuestas, reportes y/o resolución administrativa) para no inferir culpa sin evidencia.

## 10. Inactividad competitiva y pausa automática

- Cada vencimiento mensual atribuible a una pareja suma un incumplimiento competitivo consecutivo.
- Si una pareja cumple su siguiente partido de rueda, la secuencia de incumplimientos consecutivos se reinicia.
- **Dos incumplimientos mensuales consecutivos atribuibles a la misma pareja => pasa automáticamente a `paused`.**
- Al pasar automáticamente a `paused`:
  - sale de la rueda;
  - pasa al fondo de su categoría;
  - ELO visible = 0;
  - conserva categoría, pareja e historial;
  - deja de bloquear el avance de las demás parejas.
- Mientras está `paused` no sigue acumulando nuevas sanciones mensuales por ausencia.

La pausa voluntaria también debe existir para viajes, vacaciones u otros períodos en los que la pareja sabe que no podrá competir.

## 11. Resultados y orden cronológico

### Carga

- Un partido de rueda jugado debe permitir que una de las parejas cargue ganador y marcador.
- Desde la primera carga de resultado, ambas parejas quedan bloqueadas para recibir otro partido de rueda hasta que ese resultado quede oficial o sea resuelto por administración.
- Esto evita que resultados viejos modifiquen el ranking después de partidos nuevos.

### Confirmación

- La otra pareja tiene **15 días corridos** desde la carga para confirmar u objetar.
- Si confirma, el resultado se vuelve oficial inmediatamente.
- Si no responde dentro de 15 días, el único resultado cargado se vuelve oficial automáticamente.
- Una vez vencido ese plazo y auto-validado el resultado, la pareja que no respondió perdió su oportunidad de confirmarlo u objetarlo por la vía normal.

### Disputa

- Si la otra pareja declara una versión incompatible del resultado, el caso pasa a `disputed`.
- Mientras está `disputed`, no impacta ranking, rachas, ELO, ascenso ni descenso.
- El administrador debe tener una bandeja visible de resultados en disputa.
- Administración debe poder ver ambas versiones y resolver cuál queda oficial o rechazar ambas.
- Mientras la disputa siga abierta, las dos parejas permanecen bloqueadas para un nuevo partido de rueda.

## 12. Marcadores y diferencia de games

- La diferencia de games es auxiliar; nunca reordena por sí sola la escalera.
- El marcador debe almacenarse de forma suficientemente estructurada como para calcular `games ganados - games perdidos` sin interpretar incorrectamente un super tie-break como games normales.

> **Pendiente:** cerrar el formato exacto de carga/validación del marcador (sets, super tie-break, abandono, etc.). Hasta entonces no se debe confiar en parseo libre de texto para estadísticas oficiales.

## 13. Penalizaciones de posición

- Una penalización baja a la pareja un puesto si existe una pareja inmediatamente debajo.
- La pareja que estaba debajo sube un puesto.
- Si la pareja ya está última, suma 1 a `position_penalty_debt`.
- La penalización no cuenta como derrota deportiva.
- Si varias parejas implicadas en el mismo evento son penalizadas, el movimiento debe calcularse de manera simultánea para evitar dobles intercambios artificiales.

## 14. Denuncias y disciplina

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

> **Pendiente:** definir cuánto tiempo después de un partido/asignación se permite presentar una denuncia para que un hecho muy antiguo no ingrese artificialmente en la ventana móvil actual.

## 15. Datos, mantenimiento y rendimiento

- No borrar historial al archivar parejas.
- No implementar todavía purga automática a 12 meses.
- Récords e históricos permanentes quedan excluidos de cualquier futura purga.
- El mantenimiento automático debe usar únicamente el motor competitivo vigente; no puede seguir ejecutando reglas antiguas como `-10 ELO`.
- Consultar el ranking no debe recalcular y escribir innecesariamente toda la base en cada lectura.
- Los cálculos históricos pesados deben poder optimizarse o precomputarse cuando el volumen crezca.

## 16. Base de datos y migraciones

- `database/schema.sql` es únicamente para bases nuevas.
- Nunca ejecutar `database/schema.sql` sobre producción existente.
- Producción se actualiza con migraciones fechadas.
- En DBeaver, ejecutar migraciones manuales una sentencia por vez; una función PL/pgSQL completa cuenta como una sola sentencia.

## 17. Principio de implementación

- Antes de modificar reglas o código competitivo, releer `PROJECT_RULES.md`, `DECISIONS.md`, `TEST_SCENARIOS.md` y el checkpoint vigente.
- Si una regla no está definida, no inventarla silenciosamente.
- No mantener dos motores competitivos activos en paralelo.
- El código viejo que contradiga estas reglas debe eliminarse o quedar completamente desconectado antes de considerar la aplicación terminada.
