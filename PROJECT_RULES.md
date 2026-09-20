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

El estado competitivo y el estado disciplinario son dimensiones distintas y no deben compartir una misma columna lógica.

### Estado competitivo

- `active`: pareja existente y habilitada para competir en la rueda.
- `paused`: pareja existente, temporalmente fuera de la rueda.
- `inactive`: pareja disuelta/archivada.

### Estado disciplinario

- `clear`: sin bloqueo disciplinario.
- `observed`: estado disciplinario abierto.
- `review`: revisión disciplinaria abierta.

Una pareja puede, por ejemplo, ser `active` competitivamente y a la vez estar `review` disciplinariamente. Cuando el estado disciplinario es distinto de `clear`, **no puede recibir ni jugar nuevos partidos de rueda** hasta que administración lo resuelva. El bloqueo disciplinario no debe transformarse silenciosamente en una pausa ni borrar la posición estructural.

Los umbrales de denuncias pueden abrir/escalar un estado disciplinario, pero una vez abierto no se limpia automáticamente por el mero paso del tiempo: queda pendiente de resolución administrativa.

### Pareja disuelta (`inactive`)

Al disolver una pareja:

- pasa a `inactive` y queda archivada;
- no se elimina físicamente;
- conserva el historial existente;
- ELO, posición y rachas no se transfieren a una pareja futura;
- cada jugador conserva su categoría individual vigente;
- no puede desarmarse por autoservicio mientras exista un partido de rueda o un resultado pendiente/disputado sin resolver.

Una nueva pareja empieza con identidad competitiva propia.

### Pareja pausada (`paused`)

- Sigue existiendo como la misma pareja.
- Conserva categoría, historial, deuda de posición y rachas deportivas.
- Sale de la rueda y no recibe nuevos partidos.
- Se ubica al fondo de su categoría.
- Su ELO visible pasa a 0 mientras está pausada.
- No acumula nuevas sanciones mensuales por ausencia.
- Al reactivarse entra al fondo del bloque competitivo activo de su categoría.
- El contador de incumplimientos mensuales consecutivos se reinicia al reactivarse.
- La pausa voluntaria solo puede activarse por autoservicio cuando no existe un partido/resultado abierto; una excepción requiere intervención administrativa.

Si hay varias parejas pausadas, todas permanecen debajo de las parejas competitivamente activas. Una nueva pareja activa entra al fondo del bloque activo, no debajo de las pausadas.

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

La rueda reemplaza el modelo de desafíos múltiples.

### Principios

- Una pareja `active` con disciplina `clear` puede tener **como máximo un partido de rueda abierto a la vez**.
- La rueda asigna el rival automáticamente; no depende de que los jugadores creen desafíos manuales.
- El rival debe pertenecer a la misma categoría y estar libre/habilitado al momento de la asignación.
- Una pareja disciplinariamente bloqueada, pausada o con resultado pendiente/disputado no es elegible.
- Si una categoría tiene cantidad impar de parejas elegibles, una puede quedar esperando sin penalización. Los 30 días comienzan recién cuando existe una asignación real.
- Con una sola pareja elegible no existe incumplimiento: espera hasta que haya rival.

### Criterio de selección de rival

La rueda prioriza variedad y antigüedad del cruce:

1. primero rivales con los que nunca se jugó;
2. si todos ya se enfrentaron, el rival contra el que hace más tiempo no se juega;
3. para decidir qué pareja se atiende primero cuando no alcanza la cantidad de rivales, tiene prioridad la que lleva más tiempo libre/esperando una asignación;
4. los empates restantes se resuelven de forma estable y determinista.

Esto evita revancha inmediata cuando existen alternativas y evita que una misma pareja quede libre repetidamente por tener una categoría impar.

### Plazo de juego

- Desde la asignación existen **30 días corridos** para jugar y cargar resultado.
- Es un plazo máximo, no un límite de frecuencia.
- Un partido resuelto libera inmediatamente a ambas parejas para volver a entrar en la rueda.
- Una pareja puede jugar muchos partidos dentro del mismo mes si va cerrando cada compromiso antes de recibir el siguiente.

### Evidencia de coordinación e incumplimiento

La app debe registrar señales simples de coordinación (`disponible`, `no puedo este período`, `rival no responde` y nota opcional). Al vencer 30 días:

- si una sola pareja aparece objetivamente como incumplidora, solo esa baja un puesto;
- si ninguna realizó acciones válidas, ambas bajan un puesto;
- si ambas dejaron evidencia incompatible de haber intentado coordinar pero no hubo partido, el caso pasa a revisión administrativa en vez de inferir culpa;
- si la sancionada ya está última del bloque competitivo activo, suma deuda de posición;
- la penalización no cuenta como derrota deportiva.

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

### Carga y fecha real

- El resultado debe guardar la **fecha real en la que se jugó** el partido. `played_at` no es la fecha de confirmación.
- La fecha cargada no puede ser anterior a la asignación ni posterior al vencimiento del partido o al momento actual.
- La primera versión del resultado incluye ganador, fecha jugada y marcador.
- Desde esa primera carga ambas parejas siguen bloqueadas para una nueva asignación hasta cerrar el resultado.

### Confirmación — 15 días

- La otra pareja tiene 15 días corridos desde la primera carga para confirmar o responder.
- Si confirma, el resultado se oficializa inmediatamente.
- Si no responde dentro de 15 días, la única versión cargada se auto-valida una sola vez.
- La falta de respuesta no puede congelar indefinidamente la rueda.

### Dos versiones y disputa

- Cada pareja puede tener como máximo una versión propia del resultado para ese partido.
- Si la segunda pareja carga exactamente la misma versión normalizada, el resultado se confirma.
- Si ganador, fecha o marcador no coinciden, se conservan **las dos versiones completas** y el caso pasa a `disputed`.
- Administración ve ambas versiones lado a lado y puede validar la versión A, validar la versión B o cerrar el caso sin resultado oficial.
- Una disputa no modifica ranking, rachas, ELO ni categorías hasta su resolución.
- Mientras exista `pending` o `disputed`, ninguna de las dos parejas recibe otro partido de rueda.

Este bloqueo garantiza el orden cronológico competitivo: una pareja no puede acumular un partido posterior mientras el anterior todavía puede modificar su posición.

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

Ventana móvil de detección: 180 días.

- 3 parejas denunciantes distintas válidas pueden abrir `observed`.
- 5 pueden escalar a `review`.
- La misma pareja denunciante cuenta una sola vez para esos umbrales.
- Reportes `dismissed` no cuentan para disparar umbrales.
- `other` exige detalle no vacío también a nivel base de datos.
- Una misma pareja no puede duplicar la misma denuncia del mismo hecho por carrera/concurrencia.
- Una vez que `observed` o `review` quedó abierto, la pareja queda fuera de la rueda hasta resolución administrativa; el paso del tiempo por sí solo no la devuelve a `clear`.
- Al abrirse un bloqueo disciplinario, un partido todavía no jugado se cancela y el rival queda liberado sin sanción.
- Si ya existe un resultado cargado o disputado, no se borra: debe concluir por confirmación, auto-validación o administración.

> **Pendiente menor para release:** fijar el plazo máximo para presentar una denuncia respecto del hecho. Hasta entonces no se debe atribuir automáticamente disciplina a un hecho extremadamente antiguo sin revisión.

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

## 18. Pendientes críticos detectados en auditoría integral

Estos puntos **no son reglas resueltas**. Deben permanecer visibles hasta decisión explícita porque afectan el modelo final:

- cómo conviven posiciones de parejas `active`, nuevas y `paused` al fondo;
- si las parejas `paused` participan o no del denominador de ELO proporcional;
- si deuda de posición se conserva íntegra al pausar/reactivar;
- si rachas de victorias/derrotas se conservan o reinician al pausar/reactivar;
- qué ocurre con pausa o disolución cuando existe asignación, resultado pendiente o disputa abierta;
- qué acción de una pareja cuenta como cumplimiento suficiente para reiniciar su contador de incumplimientos si el rival fue quien impidió jugar;
- cómo se prueba objetivamente responsabilidad en un partido mensual no jugado;
- cómo evita la rueda revancha inmediata/farming cuando existen otros rivales posibles;
- cómo se prioriza a una pareja que lleva tiempo esperando rival para evitar starvation;
- qué sucede cuando una categoría tiene una sola pareja activa o una cantidad impar de parejas libres;
- qué efecto tiene el estado disciplinario `review` sobre la elegibilidad para nuevas asignaciones;
- qué estado toma una asignación si administración rechaza ambas versiones de un resultado;
- si quien cargó un resultado puede corregirlo antes de la respuesta rival;
- si el récord histórico de Primera es uno absoluto para LA RED o uno por circuito masculino/femenino;
- cómo se registra de manera oficial la fecha real en que se jugó un partido.

### Requisito técnico derivado de las reglas

El estado competitivo/ciclo de vida y el estado disciplinario no deben compartir una única variable si eso impide representar combinaciones válidas. La implementación final debe poder distinguir, por ejemplo, una pareja `paused` de su condición disciplinaria sin que un mantenimiento de denuncias la reactive accidentalmente.

### Regla de no penalización por falta de rival

Hasta que exista decisión más específica, **no implementar penalización automática cuando el sistema no pudo crear una asignación válida**. El plazo competitivo comienza con una asignación real, no con el mero paso del calendario.
