# LA RED Pádel — Diseño Wheel v3
Fecha: 2026-09-28

## Estado
Este documento captura las decisiones funcionales acordadas antes de tocar el motor competitivo.

- Estado: **diseño funcional pendiente de implementación**.
- El código productivo sigue en `wheel-v2` hasta que se implemente y pruebe este diseño.
- Para cualquier conflicto sobre asignación automática, ataque/defensa, fase de formación, equilibrio poblacional, inactividad, ascenso/descenso, incumplimientos o historial visible, **este archivo prevalece sobre las reglas anteriores**.
- Antes de implementar se debe resolver la sección `Preguntas abiertas finales`.
- No modificar el motor por intuición fuera de estas reglas.

## 1. Objetivo del motor
La rueda debe favorecer tres cosas, en este orden conceptual:

1. que las parejas activas jueguen y no queden estancadas;
2. que una pareja pueda progresar hacia arriba ganando partidos;
3. que quien ocupa una posición también deba defenderla.

No se busca un emparejamiento aleatorio de toda la categoría.

## 2. Ranking estructural
- El ranking sigue siendo una escalera.
- Si una pareja ubicada más abajo vence en un partido real a una pareja ubicada más arriba, intercambian las **posiciones actuales al momento de aplicar el resultado**.
- Si gana la pareja que ya estaba arriba, no hay intercambio.
- Si durante la vigencia de un assignment se invierte la relación competitiva y el atacante deja de estar debajo del defensor, el assignment se cancela automáticamente.
- Si una de las parejas cambia de categoría, el assignment se cancela automáticamente.
- Si la relación cambia pero el atacante sigue debajo del defensor, el assignment continúa.
- Un partido cancelado no genera movimiento ni resultado oficial. Si los jugadores desean jugarlo igualmente, pueden hacerlo de forma amistosa, pero no se carga en LA RED.
- La cancelación conserva el rol ataque/defensa de cada pareja y su antigüedad de espera; la reasignación debe ejecutarse de inmediato con prioridad alta.

## 3. Fase de formación
La liga tiene una fase inicial de formación.

- La fase termina cuando **cada una de las 7 categorías tiene al menos 5 parejas activas**.
- Mientras dura:
  - se juega normalmente dentro de cada categoría;
  - funciona la escalera interna;
  - no hay ascensos ni descensos entre categorías.
- Cuando se cumple la condición:
  - se informa en la web/app que finalizó la fase de formación;
  - se activan ascensos y descensos;
  - los contadores de ascenso/descenso empiezan desde cero;
  - la fase de formación **no vuelve a activarse jamás**, aunque después una categoría caiga por debajo de 5 activas.

## 4. Equilibrio poblacional entre categorías
Hay 7 categorías. El reparto teórico uniforme es:

- `100 / 7 = 14,2857 %` de las parejas activas por categoría.

El sistema no exige cupos exactos. Busca una distribución razonablemente pareja.

### 4.1 Qué parejas cuentan
- Solo cuentan las parejas **activas**.
- Las inactivas no cuentan para el porcentaje.
- Una categoría puede contener muchas inactivas sin considerarse superpoblada deportivamente.

### 4.2 Zona normal
- Entre **10 % y 19 %** de las parejas activas totales: población normal.
- En esa zona, ascenso/descenso usa el requisito base de 3.

### 4.3 Ajuste oculto de umbrales
El motor puede reducir el requisito para mover población, pero **la población por sí sola nunca mueve una pareja**.

Regla acordada:
- zona normal 10–19 %: requisito 3;
- desvío moderado: 7–<10 % o >19–22 %: requisito 2;
- desvío fuerte: <7 % o >22 %: requisito 1.

Cuando una categoría necesita recibir o expulsar población:
- el motor queda a la espera de resultados deportivos;
- puede resolverse por ascenso del #1 de la categoría inferior o descenso del último/período de descenso de la superior, según quién alcance primero el requisito aplicable;
- todos los movimientos son únicamente entre categorías adyacentes;
- si el porcentaje vuelve a zona normal, la ayuda poblacional se apaga;
- si sigue fuera de zona, el motor continúa esperando nuevos resultados.

Antes de acelerar un movimiento entre categorías vecinas, el motor debe comprobar que ese movimiento **mejora el equilibrio conjunto** de las dos categorías respecto del objetivo teórico de 14,2857 %. Si arreglar una categoría empeora más a la vecina, no se reduce el requisito y se conserva el umbral normal.

Los umbrales exactos son lógica interna; no deben exponerse públicamente como una fórmula explotable por jugadores.

## 5. Estados de rueda: ataque y defensa
La rueda se basa en dos roles.

### Ataque
- Una pareja en ataque busca **solo hacia arriba**.
- Nunca cumple un ataque jugando contra una pareja ubicada debajo.
- El atacante es el impulsor del emparejamiento.

### Defensa
- Una pareja en defensa **no busca**.
- Queda disponible para recibir un ataque de una pareja ubicada debajo.

### Balance global
- El motor intenta mantener una cantidad razonablemente pareja de atacantes y defensores entre parejas:
  - activas;
  - libres;
  - sin assignment pendiente.
- Las parejas inactivas y las que ya tienen partido abierto no participan del balance.
- No se exige 50/50 exacto.
- Después de un partido real, normalmente:
  - atacante -> defensa;
  - defensor -> ataque.
- Para evitar bloqueos, el motor puede repetir un rol cuando haga falta:
  - defensa -> defensa;
  - ataque -> ataque.
- Como regla de equilibrio, se intenta no superar **2 ataques consecutivos ni 2 defensas consecutivas** para una misma pareja.
- Ese límite es blando: puede superarse si es necesario para que la rueda no se trabe.
- La prioridad sigue siendo que las parejas jueguen y no queden estancadas.

### Extremos
- Si una categoría tiene una sola pareja activa, esa pareja simplemente espera; no se fuerza un rol efectivo ni un assignment hasta que exista otra activa.
- El #1 activo siempre queda en defensa: no tiene rival arriba para atacar.
- El último activo siempre queda en ataque: no tiene rival debajo para defender.
- Si una defensa obligatoria resulta estructuralmente imposible por estar último, se libera esa defensa y pasa a ataque.
- Excepción más fuerte: después de la fase de formación, **último activo + incumplimiento propio = descenso directo**.

## 6. Prioridad de espera
La prioridad principal de la rueda es el tiempo sin jugar.

- Primero se intenta resolver a la pareja activa/libre que lleva más tiempo sin un partido real.
- Para una pareja nueva, la antigüedad empieza al ingresar a la rueda.
- Para una pareja reactivada, empieza al reactivarse.
- Una cancelación por cambio de ranking/categoría no debe borrar la antigüedad de espera.
- La reasignación tras cancelación es inmediata, pero la **antigüedad absoluta sigue mandando**: una pareja cancelada no pasa por delante de otra que ya llevaba todavía más tiempo sin jugar.
- Una victoria administrativa 6-0 6-0 no reinicia el reloj de “hace cuánto no juega”; solo un partido real lo reinicia.

## 7. Selección de rival para un atacante
El atacante mira hacia arriba.

### Ventanas dinámicas
1. primero revisa hasta 3 puestos hacia arriba;
2. dentro de esa ventana, entre defensores elegibles, prioriza al que también lleva más tiempo sin jugar;
3. si no existe defensor elegible, amplía inmediatamente otros 3 puestos;
4. repite la expansión sin esperar días hasta encontrar rival o agotar la categoría.

Ejemplo:
- #8 ataca;
- #7 defensor jugó ayer;
- #6 defensor hace 12 días;
- #5 defensor hace 20 días;
- el rival preferido es #5 porque los tres están dentro de la primera ventana y prima la antigüedad sin jugar.

Si #8 y #9 quieren al mismo defensor:
- prima el atacante que lleva más tiempo sin jugar, aunque el otro esté más cerca;
- el atacante que pierde ese rival continúa buscando inmediatamente más arriba.

### Repetición de rival
- Se evita jugar dos partidos consecutivos contra la misma pareja si existe otra alternativa razonable.
- Si no existe otra opción, se repite inmediatamente.
- La protección contra repetición no puede bloquear la rueda.

### Única espera aceptada
Si un atacante no encuentra **ningún defensor superior** disponible, espera hasta que aparezca uno. No se lo manda hacia abajo.

## 8. Assignment automático
- No existe etapa de aceptación del assignment.
- El sistema asigna automáticamente el partido.
- WhatsApp/app informa la asignación.
- Máximo un assignment abierto por pareja.
- Desde la asignación corren **30 días corridos para jugar y cargar el resultado**.
- No existe extensión extraordinaria de 15 días en Wheel v3: 30 días y listo.
- Las dos parejas quedan ocupadas durante el assignment.
- Si una versión de resultado fue cargada dentro de los 30 días, la otra pareja dispone de una ventana adicional de **7 días solo para confirmar o discutir ese resultado**; esa ventana no permite jugar un partido que no fue jugado dentro de los 30 días.
- Resolver/cerrar libera inmediatamente a las parejas y dispara una nueva evaluación de la rueda.

## 9. Programación y cambios de fecha
- Dentro de los 30 días se pueden cambiar fecha/hora/lugar las veces que las parejas acuerden.
- Cambiar fecha no reinicia el plazo general de 30 días.
- Una programación oficial sirve como referencia para no-show.
- Un assignment cancelado por inversión de posiciones o cambio de categoría deja de ser competitivo aun si ya tenía cancha y horario.

Mensaje conceptual ante cancelación:
- LA RED explica que el ranking cambió y el cruce dejó de ser competitivo;
- pueden jugarlo amistosamente si desean;
- no podrán cargar ese resultado;
- se asignará un nuevo rival.

## 10. "No pude jugar"
Una pareja puede reconocer antes del vencimiento que no pudo cumplir.

- Cualquiera de los dos integrantes puede marcar `No pude jugar` en nombre de toda la pareja; no requiere confirmación del compañero.
- La UI/auditoría debe mostrar quién realizó la acción, por ejemplo: `No pude jugar (informado por Nombre Apellido)`.
- Si una sola pareja marca `No pude jugar`:
  - el assignment se cierra inmediatamente;
  - esa pareja recibe derrota administrativa 6-0 6-0;
  - la otra recibe victoria administrativa;
  - si corresponde por posición actual, puede existir intercambio;
  - la victoria administrativa **no cuenta** como victoria real para ascenso ni para salir de período de descenso;
  - la derrota administrativa sí cuenta como incumplimiento/derrota cuando corresponda;
  - no requiere confirmación del rival.
- El incumplidor pasa a defensa.
- Si ya estaba en defensa, queda en defensa obligatoria hasta cumplir una defensa real, salvo imposibilidad estructural.
- La pareja que sí estaba disponible conserva su rol anterior porque no pudo disputar un partido real.

Si ambas parejas reconocen que no pudieron jugar:
- ambas reciben penalización de posición;
- ambas se consideran incumplidoras;
- se aplica la deuda necesaria para que cada una pierda realmente un puesto sin que una sancionada beneficie a otra;
- si alguna es la última activa después de la fase de formación, aplica la regla especial de descenso directo.

Si vencen los 30 días sin resultado ni declaración:
- se trata como incumplimiento de ambas;
- no existe espera indefinida ni renovación automática del plazo.

### Tres incumplimientos consecutivos
- Esta regla es general para todas las categorías, no solo 7ª.
- Una pareja que acumula **3 incumplimientos atribuibles consecutivos** recibe una penalización de **30 días sin nuevas asignaciones** y pasa a estado inactivo durante esa penalización.
- En 7ª esta regla resuelve especialmente el caso de la última pareja, que no puede descender ni perder más posición.
- Falta confirmar si al terminar los 30 días la reactivación es automática y qué evento corta/reinicia la racha de incumplimientos.

## 11. Penalización simultánea y deuda de posición
La penalización debe hacer perder **exactamente un puesto efectivo** por incumplimiento ordinario.

Ejemplo con #5 y #6 sancionadas a la vez:
- #7 -> #5;
- #5 -> #6;
- #6 -> #7;
- #8 permanece #8.

No se debe castigar a #5 y #6 con dos puestos por haber sido sancionadas juntas.

La implementación puede usar deuda de posición para materializar este principio de forma idempotente y bajo concurrencia.

## 12. No-show
- Puede reportarse después de la fecha/hora oficial acordada.
- El reporte tiene una ventana de **48 horas para ser cancelado por quien lo emitió**.
- Durante esa ventana las parejas todavía pueden arrepentirse, reprogramar dentro del plazo original o cargar el resultado si corresponde.
- Pasadas las 48 horas, un no-show unilateral no se auto-valida: pasa a Administración.
- Si existe contradicción entre las parejas, pasa a Administración.
- Si la pareja reportada reconoce expresamente que no pudo presentarse, se resuelve **inmediatamente** como incumplimiento/6-0 6-0; no se espera a que termine la ventana de arrepentimiento del denunciante.
- Mientras existe una disputa real de no-show, el assignment permanece bloqueado hasta resolución.

## 13. Ascenso
Después de la fase de formación:

- al alcanzar el #1 activo de una categoría se entra en zona/período de ascenso;
- el contador comienza en 0 al llegar a #1;
- requisito base: 3 victorias reales;
- el requisito puede bajar a 2 o 1 por equilibrio poblacional;
- una victoria administrativa/no-show no cuenta como victoria real de ascenso;
- en Primera no hay ascenso de categoría;
- en Primera no existe una métrica numérica paralela al ranking;
- el único récord especial es la cantidad histórica de defensas exitosas del puesto #1 de Primera;
- si el #1 deja de ocupar el #1 antes de completar el ascenso, su racha de ascenso se reinicia; cuando recupere la punta empieza de 0;
- si el #1 pasa a inactividad:
  - pierde inmediatamente el liderazgo;
  - su mejor retorno posible pasa a #2;
  - pierde la racha actual de ascenso;
  - el récord histórico de Primera no se borra.
- Una pareja que **asciende** no entra al fondo: ingresa en la **mitad de la tabla activa** de la nueva categoría y desplaza hacia abajo a las parejas desde ese punto.
- Por ese ingreso no entra automáticamente en período de descenso.
- La fórmula exacta de “mitad de tabla” para cantidades pares/impares queda pendiente de cierre.

## 14. Período de descenso
Después de la fase de formación:

### Entrada
- **Tocar el último puesto activo activa inmediatamente el período de descenso**, incluso con 0 derrotas.
- El estado de descenso viaja con la pareja:
  - no desaparece porque luego suba posiciones;
  - no desaparece por inactividad;
  - no desaparece porque aparezca otra pareja debajo.

### Salida
- Para salir del período de descenso hace falta **una victoria real**.
- Una victoria administrativa 6-0 6-0 puede mover ranking, pero no salva del período.
- Requisito base para descender: acumular 3 derrotas antes de conseguir una victoria real.
- El requisito puede reducirse a 2 o 1 por equilibrio poblacional.
- Una reducción poblacional nunca causa descenso instantáneo sin un nuevo resultado.
- Si la pareja es última activa e incumple: descenso directo, aunque estuviera 0/3, **salvo en 7ª**.
- En 7ª no existe período de descenso: la categoría no tiene nivel inferior y la pareja continúa en la rueda normal ataque/defensa.

### Ruta de descenso
Mientras una pareja sigue en período de descenso:
- conserva la arquitectura ataque/defensa siempre que sea posible;
- cuando le toca atacar, la selección de rivales se hace siguiendo una **ruta desde la parte baja de la categoría hacia arriba**;
- los intentos buscan ser de menor a mayor dificultad;
- si perdió contra un rival, el siguiente intento intenta un escalón más difícil usando las posiciones actuales;
- si solo existe una opción, puede repetir rival;
- si movimientos administrativos la llevaron muy arriba, su posición visual no elimina la ruta de descenso;
- cada nueva selección recalcula posiciones actuales;
- una victoria real la saca inmediatamente del período y desde el siguiente ciclo vuelve a la rueda normal desde su posición actual.

## 15. Descenso de categoría
- Una pareja que desciende entra base #2 en la categoría inferior.
- Si no existe una pareja activa que pueda ocupar #1, entra #1 por imposibilidad material.
- Si dos descensos ocurren muy próximos, se procesan secuencialmente; el segundo descenso entra #2 y desplaza al descenso anterior a #3.
- Al descender:
  - se termina el período de descenso anterior;
  - los contadores de ascenso/descenso de la nueva categoría parten de cero;
  - el próximo rol es ataque.

### Parejas nuevas y categoría individual
- Una pareja completamente nueva también ingresa en la **mitad de la tabla activa** de su categoría y desplaza hacia abajo desde ese punto.
- Dos jugadores sin categoría individual previa pueden elegir libremente una categoría inicial entre 1ª y 7ª.
- Si los jugadores ya tienen categorías individuales distintas, la pareja compite en la categoría del jugador de nivel más alto (número de categoría más bajo).
- Ejemplo: jugador de 2ª + jugador de 5ª => la pareja compite en 2ª.
- Al disolverse, cada jugador recupera/conserva su categoría individual previa, salvo mejoras obtenidas por ascensos deportivos reales de la pareja.
- Un ascenso deportivo real mejora la categoría individual de ambos integrantes al nivel alcanzado.
- Una misma dupla que se disuelve y luego vuelve a formarse se trata **competitivamente como una pareja nueva**, aunque pueda reutilizarse una identidad técnica interna si eso conviene a la implementación.

## 16. Inactividad
La inactividad es voluntaria y sale de la rueda; también puede ser aplicada automáticamente como sanción de 30 días por 3 incumplimientos consecutivos.

### Solicitud
- **Alcanza con que uno de los dos integrantes la solicite** en nombre de la pareja.
- Si existe un assignment abierto, primero debe resolverse la situación de ese compromiso.
- No se obliga físicamente a jugar: si decide no disputar el partido pendiente, se aplica primero la consecuencia deportiva y recién después pasa a inactiva.
- Si la pareja que incumple estaba **por encima** de su rival, intercambian posiciones: el rival sube y la incumplidora baja.
- Si la pareja que incumple estaba **por debajo**, no se intercambian posiciones; incumplir nunca puede hacerla subir.
- Técnicamente `paused` puede seguir representando la inactividad temporal y `inactive` quedar reservado para disolución/archivo; en superficie se muestra “Pareja inactiva”.
- Una pareja inactiva:
  - no recibe assignments;
  - no participa del balance ataque/defensa;
  - no cuenta para el porcentaje poblacional;
  - no acumula nuevas derrotas ni incumplimientos simplemente por estar inactiva;
  - nunca desciende de categoría por el mero paso del tiempo.

### Bloque visual
Cada categoría muestra:
1. bloque de parejas activas con ranking competitivo;
2. debajo, bloque separado `Parejas inactivas`.

### Posición de retorno
- Durante los primeros **3 meses completos** de inactividad conserva su posición de retorno.
- Desde el 4º mes completo, pierde **1 posición de retorno por cada mes completo adicional**.
- Ejemplo: se inactiva siendo #5 y vuelve a los 6 meses completos => vuelve #8.
- La pérdida por tiempo se detiene en el fondo de la **misma categoría**; la inactividad nunca provoca descenso de categoría.
- Si se inactivó siendo #1 de cualquier categoría, pierde inmediatamente el derecho a volver #1:
  - si vuelve dentro de los primeros 3 meses, vuelve como máximo #2;
  - desde el 4º mes, ese #2 base también pierde una posición por cada mes completo adicional.
- Al reactivar, se inserta en su posición de retorno y desplaza hacia abajo a las parejas activas desde ese punto.
- Si dos parejas inactivas tienen calculada la misma posición de retorno:
  - la que se reactiva primero ocupa ese puesto;
  - cuando la otra se reactiva después, también se inserta en ese puesto y desplaza hacia abajo a la que había vuelto antes.
- La antigüedad de espera para la rueda comienza de nuevo al reactivarse.

### Inactividad y descenso
- Si la pareja ya estaba en período de descenso al inactivarse, ese estado y su contador quedan **congelados**.
- Mientras está inactiva no suma nuevas derrotas.
- Al reactivarse retoma el período de descenso desde el mismo estado.
- En 7ª no existe período de descenso.

### Sanción de 30 días por incumplimientos
- Tras 3 incumplimientos atribuibles consecutivos, la pareja pasa a inactiva y queda 30 días sin nuevas asignaciones.
- Esta inactividad sancionatoria sigue sin producir descenso por el simple paso del tiempo.
- Falta cerrar si la reactivación al día 30 es automática y cómo se reinicia la racha de incumplimientos.

## 17. Historial visible mínimo
No existe una ficha pública de historial estadístico acumulado de pareja.

No mostrar:
- partidos totales;
- victorias totales;
- derrotas totales;
- porcentaje de victorias;
- historial completo de rivales.

Sí mostrar:
- únicamente los **últimos 5 movimientos reales de ranking/categoría**;
- fecha `dd/mm/aaaa`;
- explicación genérica;
- origen -> destino cuando corresponda.

Ejemplos:
- `27/09/2026 · Victoria contra rival superior · #8 -> #5`
- `18/09/2026 · Penalización por incumplimiento · #5 -> #6`
- `04/09/2026 · Ascenso de categoría · 5ª -> 4ª`
- `22/08/2026 · Retorno de inactividad · #4 -> #7`

No registrar en esta lista partidos que no movieron ranking.

## 18. Auditoría interna
Aunque el jugador vea solo 5 movimientos, el sistema conserva internamente lo mínimo necesario para:
- seleccionar rivales;
- evitar repetición inmediata;
- medir tiempo desde último partido real;
- conservar roles;
- conservar período/contador de descenso;
- conservar contador de ascenso;
- calcular posición de retorno por inactividad;
- materializar deuda de posición;
- explicar cancelaciones/movimientos;
- resolver reclamos.

Administración debe conservar una auditoría técnica más completa de decisiones sensibles del motor.

## 19. Récord histórico de Primera
- El único récord deportivo histórico especial es la cantidad de **defensas exitosas del puesto #1 de Primera**, separado por circuito.
- Cada vez que una pareja ocupa el #1 de Primera, juega una defensa y conserva el #1, suma 1 defensa exitosa.
- La pareja con la mayor cantidad histórica de defensas exitosas ocupa la sección pública de récord.
- Si dos o más parejas empatan la mayor cantidad, el récord se muestra como **compartido**.
- La antigua sección de máximo valor numérico se reutiliza para este récord y no conserva su significado anterior.
- No existe ninguna métrica numérica paralela al ranking.
- No crear un sistema general de estadísticas históricas de pareja.

## 20. Principios de UX
- La complejidad puede existir en el motor, pero no debe trasladarse al jugador.
- Siempre que el sistema pueda determinar automáticamente el próximo partido, debe asignarlo sin pedir búsqueda de rival, desafío manual ni aceptación previa.
- La interfaz debe comunicar principalmente **qué le toca hacer ahora** a cada pareja.
- El sistema debe explicar siempre la próxima acción.
- No mostrar fórmulas internas explotables de equilibrio poblacional.
- Sí explicar de forma simple cuando:
  - un partido fue asignado;
  - un partido fue cancelado por cambio de ranking/categoría;
  - una pareja entró en período de descenso;
  - una pareja salió del período por victoria real;
  - una pareja entra/sale de inactividad;
  - se aplicó una penalización;
  - terminó la fase de formación.

## 21. Preguntas abiertas finales antes de código
La última revisión cerró la mayor parte de los bordes. Quedan únicamente estos puntos:

1. **Circuitos independientes:** ¿fase de formación y porcentajes poblacionales se calculan por separado para Masculino y Femenino, de modo que un circuito pueda salir de formación aunque el otro todavía no?
2. **Mitad de tabla:** falta definir la fórmula exacta. Ejemplo: si hay 10 activas y entra una nueva/ascendida, ¿entra #6? Si hay 9 activas, ¿entra #5 o #6?
3. **Tres incumplimientos consecutivos:** al cumplirse los 30 días de sanción/inactividad, ¿la pareja se reactiva automáticamente o debe solicitar volver?
4. **Racha de incumplimientos:** como son “consecutivos”, falta definir qué la reinicia. Propuesta simple: cualquier compromiso real resuelto sin incumplimiento atribuible reinicia el contador a 0.
5. **Confirmación de resultado (reformulada):** si jugás y cargás el resultado el día 8 del assignment, ¿el rival tiene 7 días desde **ese día 8** para confirmar/discutir, y al terminar esos 7 días se auto-valida si no respondió? ¿O querés que esos 7 días recién empiecen al terminar el plazo general de 30?
6. **Fin de fase de formación:** cuando se activa la competencia entre categorías, ¿los #1 arrancan inmediatamente zona de ascenso 0/3 y los últimos de 1ª–6ª período de descenso 0/3?
7. **Umbral poblacional 1/2/3:** ¿se recalcula con la población activa existente al confirmar cada nuevo resultado, en vez de quedar congelado cuando empezó una racha?
8. **Récord de defensas:** si la misma dupla fue #1 de Primera, perdió la punta y meses después vuelve a ser #1, ¿sus nuevas defensas se suman al contador histórico anterior de esa dupla o comienza un nuevo contador para ese nuevo período?
9. **Récord y re-formación:** si esa dupla se disuelve y más adelante vuelve a formarse como pareja competitivamente nueva, ¿sus defensas históricas anteriores siguen perteneciendo al mismo récord histórico de la dupla o la nueva formación arranca un contador nuevo?

## 22. Plan de implementación después de cerrar preguntas
1. Convertir este diseño en reglas definitivas dentro de `PROJECT_RULES.md` y `DECISIONS.md`.
2. Diseñar estado/migración DB mínima.
3. Escribir tests puros/simulaciones antes de tocar el motor.
4. Implementar selección de roles y rival.
5. Implementar cancelación/reasignación concurrente.
6. Implementar formación + equilibrio poblacional.
7. Implementar período de descenso/inactividad.
8. Implementar incumplimientos/no-show.
9. Implementar los 5 movimientos visibles + auditoría.
10. Integración PostgreSQL/concurrencia.
11. Frontend/UX/WhatsApp.
12. Simulación larga para buscar estancamientos, oscilaciones poblacionales y abuso de reglas.
13. Recién después desplegar.
