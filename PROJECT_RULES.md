# LA RED Pádel — Reglas vigentes del proyecto

> **Fuente de verdad funcional.** Antes de cambiar reglas, backend, base o frontend, revisar este archivo, `TEST_SCENARIOS.md` y, para experiencia pública/administrativa, `PRODUCT_VISION.md`.
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

## 1A. Continuidad y zona horaria

- LA RED es una **liga continua**: no existen temporadas que reinicien ranking, ELO, rachas, historial ni récords al cambiar de año.
- Pueden existir filtros/estadísticas por año, pero son vistas del historial y nunca un reset competitivo.
- La zona horaria oficial para fechas, vencimientos, cartelera y notificaciones es **America/Argentina/Buenos_Aires**.

## 2. Alta de jugadores y parejas

- Registrarse no obliga a formar pareja inmediatamente.
- Después del registro se ofrece `FORMAR PAREJA` / `MÁS TARDE`.
- `MÁS TARDE` mantiene la sesión iniciada.
- `MI LIGA` debe llevar a una única gestión de pareja.
- Dos jugadores completamente nuevos pueden elegir libremente la categoría inicial.
- Si uno o ambos ya tienen categoría vigente, la nueva pareja entra en la categoría vigente más fuerte de los dos.
- Menor número = categoría más fuerte. Ejemplo: 2ª + 4ª => 2ª.
- La categoría individual vigente representa el nivel actual, no la mejor categoría histórica.
- Una pareja nueva entra al fondo del bloque competitivo activo de su categoría.
- Formar pareja requiere aceptación de ambos jugadores: seleccionar a una persona crea una invitación, no una pareja definitiva.
- Una invitación pendiente no modifica ranking, categoría ni disponibilidad competitiva.
- Solo puede existir una invitación de formación de pareja activa por jugador a la vez. Puede cancelarse por quien la envió y vence automáticamente a los **10 días** si no fue aceptada.
- La invitación debe mostrar quién invita y en qué categoría competiría la pareja si se acepta.
- Al aceptar se crea/reactiva la pareja de forma transaccional; cualquier invitación incompatible queda inválida.
- La base debe impedir que un jugador quede en dos parejas competitivamente vigentes aunque lleguen requests concurrentes.
- Si los mismos dos jugadores vuelven a jugar juntos después de haber disuelto su pareja, se reactiva la misma identidad de pareja archivada en lugar de crear una identidad paralela; vuelve al fondo del bloque activo y conserva historial/deuda pendiente. Las rachas corrientes siguen las reglas de disolución vigentes.
- No existe espera por cupo.
- Formar una pareja en una categoría más fuerte por el nivel del compañero **no cambia por sí solo la categoría individual** del jugador arrastrado hacia arriba.
- La categoría individual cambia por movimientos deportivos reales:
  - si la pareja asciende a una categoría más fuerte, ambos jugadores adquieren esa categoría individual;
  - si la pareja desciende, cada jugador empeora su categoría individual solo cuando el descenso lleva a la pareja por debajo de su propio nivel individual vigente.
- Al disolverse la pareja, cada jugador conserva la categoría individual resultante de esos movimientos deportivos; no adopta automáticamente la categoría de pareja solo por haber jugado temporalmente más arriba.

## 2A. Identidad, DNI y acceso

- El registro exige DNI, nombre, apellido, teléfono con WhatsApp y contraseña.
- El **DNI es único** en toda LA RED y es el identificador de inicio de sesión junto con la contraseña.
- Si ya existe una cuenta con ese DNI, no se crea otra; el flujo debe ofrecer recuperación de acceso.
- Una cuenta nueva queda `pending_verification` hasta que administración confirme que corresponde a una persona real.
- Mientras esté pendiente puede acceder a su cuenta, pero no formar pareja ni competir.
- El DNI nunca es público y no se usa en ranking, perfiles, cartelera ni mensajes públicos.
- El jugador no puede modificar su DNI por autoservicio. Una corrección de DNI requiere administración y deja auditoría.
- La recuperación de contraseña se realiza con DNI + verificación por WhatsApp al teléfono registrado.
- Cambiar el teléfono exige validar el nuevo número por WhatsApp y deja aviso de seguridad al número anterior cuando sea posible.
- Si el jugador perdió también el acceso al teléfono registrado, la recuperación pasa a verificación excepcional de identidad.
- La falta de inicio de sesión por sí sola no cambia estado competitivo ni desactiva la cuenta; la rueda y sus incumplimientos son los mecanismos que regulan la inactividad deportiva.

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

### Estado disciplinario del jugador

- El jugador también tiene un estado disciplinario propio, separado del de la pareja.
- Una conducta individual no desaparece al cambiar de compañero.
- La nueva pareja no hereda como historial propio las faltas del jugador, pero una disciplina individual abierta bloquea competitivamente al jugador y por lo tanto impide que su pareja reciba nuevos partidos hasta resolución.
- Resolver disciplina de pareja no limpia disciplina individual, ni viceversa.

### Pareja disuelta (`inactive`)

Al disolver una pareja:

- pasa a `inactive` y queda archivada;
- no se elimina físicamente;
- conserva el historial existente;
- ELO, posición y rachas de la pareja no se transfieren a una composición futura distinta;
- cada jugador conserva su categoría individual vigente;
- cualquiera de los dos integrantes puede iniciar una solicitud de disolución;
- si ambos confirman y no hay obligaciones abiertas, la disolución puede cerrarse de inmediato;
- si no hay acuerdo, la solicitud vence/cierra el vínculo a los **7 días**, pero las obligaciones competitivas se resuelven primero;
- una asignación aún no jugada que siga abierta al terminar esos 7 días se cierra como **derrota deportiva de la pareja que se disuelve**, con victoria para el rival y aplicación normal del motor deportivo; no se inventa marcador ni games;
- si ya existe un resultado cargado, ese resultado no se borra ni se reemplaza por la disolución: debe terminar su flujo normal de confirmación, auto-validación o disputa antes del archivo;
- una disciplina abierta de pareja o de alguno de sus integrantes no se borra por disolución y sigue asociada a su sujeto correspondiente.

Una composición futura distinta empieza con identidad competitiva propia. Si vuelven exactamente los mismos dos integrantes, se reactiva la identidad histórica archivada según las reglas de reactivación.

### Pareja pausada (`paused`)

- Sigue existiendo como la misma pareja.
- Conserva categoría, historial, deuda de posición y rachas deportivas.
- Sale de la rueda y no recibe nuevos partidos.
- Se ubica al fondo de su categoría.
- Su ELO visible pasa a 0 mientras está pausada.
- No acumula nuevas sanciones mensuales por ausencia.
- Al reactivarse entra al fondo del bloque competitivo activo de su categoría.
- Una pausa voluntaria no borra un incumplimiento mensual previo: conserva `monthly_miss_streak`.
- Cuando la pausa fue automática por haber alcanzado dos incumplimientos consecutivos, la reactivación comienza un nuevo ciclo con `monthly_miss_streak = 0`.
- La pausa voluntaria requiere confirmación de **ambos integrantes** y solo puede activarse cuando no existe un partido/resultado abierto. Durante un partido abierto puede pedirse `PAUSAR AL TERMINAR ESTE PARTIDO`, que no altera el compromiso actual y evita una nueva asignación al cerrarse.

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
- Las parejas `paused` quedan fuera del denominador competitivo del ELO y muestran 0.
- Las parejas con `competition_state = active` siguen perteneciendo al bloque posicional y al denominador aunque su disciplina las tenga temporalmente bloqueadas para jugar.

> **Pendiente funcional:** la fórmula proporcional exacta para posiciones normales todavía debe validarse definitivamente. La fórmula actualmente implementada en el código candidato no debe considerarse inmutable por estar implementada.

## 7. #1 de Primera y récord histórico

- Conquistar el #1 de Primera deja a la pareja en ELO base 2000.
- La victoria con la que conquista el #1 no cuenta como defensa.
- Cada victoria oficial obtenida cuando la pareja ya era #1 de Primera y conserva esa posición suma `+1` ELO.
- 2015 ELO = 15 defensas exitosas del #1 de Primera.
- Si pierde la punta, deja de acumular defensas.
- El máximo histórico de Primera alcanzado por cualquier pareja se conserva permanentemente.
- Existen dos récords históricos independientes de Primera: uno del circuito masculino y otro del circuito femenino.
- El récord masculino nunca compite ni se compara para reemplazar al femenino, y viceversa.
- La portada debe mostrar ambos récords por separado, cada uno con pareja, máximo ELO y cantidad de defensas asociadas.

## 8. Ascensos y descensos deportivos

### Ascenso

- #1 de una categoría + 3 victorias consecutivas => asciende a la categoría inmediatamente superior.
- El #1 de Primera no asciende.
- La cantidad de parejas de las categorías no modifica esta regla.
- La racha que produjo el ascenso se reinicia después del movimiento.

**Regla cerrada:** la pareja ascendida entra al fondo del bloque competitivo activo de la categoría superior.

### Descenso

- Última pareja de una categoría + 3 derrotas consecutivas => desciende a la categoría inmediatamente inferior.
- La 7ª no desciende.
- La cantidad de parejas de las categorías no modifica esta regla.
- La racha que produjo el descenso se reinicia después del movimiento.
- Una pareja que desciende nunca desplaza al #1 de la categoría inferior.
- Entrada base al descender: #2.
- Cada unidad de deuda de posición empuja la entrada un puesto adicional: deuda 1 => #3, deuda 2 => #4, etc.
- Si no existen suficientes puestos para materializar toda la deuda, entra lo más abajo posible y la deuda sobrante se conserva.

**Regla cerrada:** si la categoría inferior no tiene ninguna pareja competitivamente activa, la descendida entra #1 porque no existe un líder al que desplazar. Si existe al menos una pareja activa, se mantiene la entrada base #2 y la deuda puede empujarla más abajo.

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

### Programación, cambios y WhatsApp

- Cada asignación puede tener **una sola programación oficial vigente**: fecha, hora y lugar.
- Dentro de los 30 días originales, las parejas pueden proponer y cambiar fecha/hora/lugar todas las veces que quieran si ambas aceptan.
- Pedir un cambio no cancela la programación vigente. La fecha anterior sigue siendo oficial hasta que ambas parejas acepten una nueva.
- Si no logran acordar una nueva programación y vence el plazo, se aplica la regla de incumplimiento correspondiente; cuando no existe un responsable único determinable, ambas parejas pierden una posición simultáneamente.
- Una vez asignado el partido, los integrantes pueden usar un botón privado para **Contactar por WhatsApp** con el rival. Ese acceso existe solo mientras el compromiso esté abierto y nunca se publica en perfiles/ranking/cartelera.
- Cualquier integrante puede proponer/aceptar horarios, lugar, cargar o confirmar resultado en nombre de su pareja.
- Las acciones de coordinación quedan auditadas con actor y timestamp.

### Reprogramación extraordinaria por causa externa

- Al agotarse los 30 días, ambas parejas pueden confirmar una causa externa real que impidió jugar.
- Si ambas la confirman, el mismo compromiso obtiene **una única extensión extraordinaria de 15 días**; no se crea otro partido.
- Si solo una pareja alega la causa externa, no se concede automáticamente la extensión.
- No existe una segunda extensión extraordinaria para ese mismo compromiso.
- Si al finalizar los 15 días extraordinarios el partido sigue sin resolverse, ambas parejas reciben una penalización simultánea de una posición; si alguna ya está última, suma deuda.
- Esta penalización por agotamiento de la prórroga no cuenta como derrota deportiva ni suma un incumplimiento para la pausa automática.
- Una caída/incidencia comprobada del propio sistema que impida actuar suspende o extiende de manera neutral los plazos afectados; no genera sanción a los jugadores.

### Plazo de juego

- Desde la asignación existen **30 días corridos** para jugar y cargar resultado.
- Es un plazo máximo, no un límite de frecuencia.
- Un partido resuelto libera inmediatamente a ambas parejas para volver a entrar en la rueda.
- Una pareja puede jugar muchos partidos dentro del mismo mes si va cerrando cada compromiso antes de recibir el siguiente.

### Evidencia de coordinación e incumplimiento

Para reducir al mínimo la intervención administrativa, la coordinación se registra dentro de la app:

- cualquiera de las dos parejas puede proponer fecha/hora;
- la otra puede aceptar o contrapropone; una aceptación deja una fecha acordada;
- las propuestas, respuestas y cambios quedan auditados;
- no responder a propuestas queda registrado objetivamente;
- una pareja puede marcar `PAUSAR AL TERMINAR ESTE PARTIDO`: no cancela el compromiso actual, pero evita que la rueda le asigne otro cuando este se cierre.

Resolución automática al vencer los 30 días:

- ninguna pareja hizo una propuesta válida => incumplimiento para ambas;
- solo una pareja propuso y la otra nunca respondió/contrapropuso => incumplimiento solo para la que no respondió;
- ambas propusieron/contrapropusieron pero nunca acordaron ni jugaron => incumplimiento para ambas;
- una fecha acordada seguida de una denuncia de `no_show` abre un plazo breve de contestación; si no hay contestación, el no-show se considera aceptado; si se contradice, pasa a la cola de excepciones del administrador.

La app debe registrar señales simples de coordinación (`disponible`, `no puedo este período`, `rival no responde` y nota opcional). Al vencer 30 días:

- si una sola pareja aparece objetivamente como incumplidora, solo esa baja un puesto;
- si ninguna realizó acciones válidas, ambas bajan un puesto;
- si ambas dejaron evidencia incompatible de haber intentado coordinar pero no hubo partido, el caso pasa a revisión administrativa en vez de inferir culpa;
- si la sancionada ya está última del bloque competitivo activo, suma deuda de posición;
- la penalización no cuenta como derrota deportiva.

### No-show

- Si existía una programación oficial y una pareja informa que la otra no se presentó, la pareja denunciada dispone de **48 horas** para objetar.
- Si guarda silencio, el no-show se considera aceptado y se aplica al responsable la consecuencia de incumplimiento atribuible: penalización de posición/deuda y actualización del contador de incumplimientos.
- Si lo contradice y el sistema no puede determinar objetivamente un responsable, el caso operativo no bloquea la liga: ambas parejas reciben la penalización de una posición/deuda correspondiente y el compromiso se cierra sin resultado deportivo.
- Esa contradicción operativa no prueba automáticamente una falta disciplinaria individual.
- El administrador no debe intervenir en un no-show ordinario salvo que exista además un expediente disciplinario excepcional.

## 10. Inactividad competitiva y pausa automática

- Cada vencimiento mensual atribuible a una pareja suma un incumplimiento competitivo consecutivo.
- Si una pareja cumple su siguiente partido de rueda, la secuencia de incumplimientos consecutivos se reinicia.
- Si A tenía un incumplimiento previo y en la siguiente asignación A actuó correctamente pero B fue la incumplidora, A también reinicia su contador: no se exige que el partido se haya jugado cuando la imposibilidad fue atribuible al rival.
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
- Quien carga primero puede corregir su propia versión mientras la otra pareja todavía no haya respondido; el plazo de 15 días no se reinicia y las revisiones quedan auditadas.
- Una vez que la otra pareja responde, ambas versiones quedan inmutables para los jugadores.
- Si la segunda pareja carga exactamente la misma versión normalizada, el resultado se confirma.
- Si ganador, fecha o marcador no coinciden, se conservan **las dos versiones completas** y el caso pasa a `disputed`.
- Administración ve ambas versiones lado a lado y puede validar la versión A, validar la versión B o cerrar el caso como `void` sin resultado oficial.
- Un cierre `void` libera a ambas parejas, no crea partido, no modifica ranking/rachas/ELO y no genera por sí solo una sanción mensual. Cualquier conducta sancionable se trata por la vía disciplinaria.
- Una disputa no modifica ranking, rachas, ELO ni categorías hasta su resolución.
- Mientras exista `pending` o `disputed`, ninguna de las dos parejas recibe otro partido de rueda.

Este bloqueo garantiza el orden cronológico competitivo: una pareja no puede acumular un partido posterior mientras el anterior todavía puede modificar su posición.

### Lesión / abandono

- Si un partido comenzó pero una pareja no puede continuar por lesión u otro abandono, se carga como resultado especial **`LESIÓN / ABANDONO`**.
- Se identifica la pareja que abandona; la otra obtiene victoria deportiva y la que abandona, derrota deportiva.
- No se cargan sets parciales ni se inventa un marcador.
- Ese partido no suma games ganados/perdidos para diferencia de games.
- Sí aplica exactamente el motor deportivo habitual: intercambio de escalera si corresponde, rachas, ascenso/descenso y defensa del #1 de Primera.
- No existe penalización adicional de posición por haber abandonado.
- La información pública solo indica `Lesión / abandono`; no publica diagnósticos ni detalles médicos.

## 12. Marcadores y diferencia de games

- La diferencia de games es auxiliar; nunca reordena por sí sola la escalera.
- El marcador debe almacenarse de forma suficientemente estructurada como para calcular `games ganados - games perdidos` sin interpretar incorrectamente un super tie-break como games normales.

**Regla técnica cerrada para nuevos partidos:** el marcador se guarda estructurado por parciales. Un parcial normal registra games; un super tie-break se identifica explícitamente como `match_tiebreak` y sus puntos no se suman como games. Los nuevos resultados oficiales no usan texto libre como fuente de estadísticas. El runtime no crea W.O. automáticos; un `no_show` se resuelve como incumplimiento/disciplinario, no como partido ganado.

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
- Para evitar reaperturas instantáneas después de una resolución, se guarda `discipline_resolved_at`: los umbrales automáticos posteriores solo consideran hechos nuevos desde esa resolución, sin borrar el historial anterior.
- Una denuncia ordinaria debe presentarse mientras el compromiso está abierto o dentro de los 15 días posteriores a su cierre/hecho relacionado. Fuera de esa ventana solo administración puede incorporar una incidencia excepcional.
- Al abrirse un bloqueo disciplinario, un partido todavía no jugado se cancela y el rival queda liberado sin sanción.
- Si ya existe un resultado cargado o disputado, no se borra: debe concluir por confirmación, auto-validación o administración.


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

## 18. Pendientes funcionales todavía abiertos

Después de esta ronda de producto, los pendientes deportivos principales son mínimos:

- fórmula proporcional definitiva del ELO normal;
- detalles de integración técnica/proveedor de WhatsApp (sin cambiar que WhatsApp es canal fundamental y la app es la fuente oficial);
- cualquier formato excepcional de partido que no pueda expresarse con resultado normal, super tie-break estructurado o `LESIÓN / ABANDONO`.

### Requisitos técnicos derivados

- El estado competitivo y el disciplinario son columnas/lógicas separadas.
- La base debe garantizar una sola pareja vigente por jugador y un solo compromiso abierto por pareja.
- Los eventos automáticos importantes (asignación, propuesta, sanción, pausa, resultado, movimiento de categoría, disciplina y resolución administrativa) deben dejar un registro de auditoría.
- Todas las notificaciones críticas deben existir al menos dentro de la app, aunque posteriormente se agregue entrega push/email.
- La falta de rival nunca genera sanción.

## 19. Principio de autonomía administrativa

El sistema debe resolver automáticamente todos los casos deterministas. La bandeja del administrador debe contener solo excepciones que realmente requieren criterio humano.

Intervención administrativa esperada:

1. dos versiones incompatibles de un resultado **ya jugado**;
2. resolver estados disciplinarios de pareja o jugador;
3. verificación/corrección excepcional de identidad;
4. corrección de una acción administrativa importante cuando corresponda.

No deben requerir administrador:

- asignación de rivales;
- coordinación normal de fechas;
- vencimientos;
- no-show ordinario;
- ambigüedades operativas de coordinación: si no hay responsable único determinable, se aplica la penalización automática prevista y la rueda continúa;
- penalizaciones deterministas;
- auto-validación de resultado por silencio;
- pausas automáticas;
- reactivaciones normales;
- ascensos/descensos;
- ELO/estadísticas;
- categorías impares o espera por falta de rival;
- reprogramación extraordinaria única;
- publicación/despublicación de próximos partidos.

La regla de producto es: **si el sistema puede resolverlo objetivamente, no debe enviarlo al administrador.**

## 20. Próximos partidos y cartelera pública

- La web debe tener una sección pública de `PRÓXIMOS PARTIDOS`, visible sin iniciar sesión.
- Un partido asignado por la rueda no se publica por el solo hecho de existir: debe tener **fecha, hora y lugar acordados por ambas parejas**.
- La cartelera pública muestra como mínimo circuito, categoría, parejas, fecha, hora y lugar.
- Nunca publica teléfonos, notas de coordinación ni datos privados.
- Una propuesta unilateral de fecha/lugar no se publica. La publicación ocurre automáticamente cuando la otra pareja acepta la misma programación.
- Cambiar una programación ya acordada requiere nueva aceptación de ambas parejas. Hasta entonces sigue vigente la última programación confirmada.
- Si el compromiso se cancela antes de jugarse, la cartelera se actualiza automáticamente.
- Cuando llega la hora programada deja de considerarse un partido futuro; el compromiso interno sigue abierto hasta resultado/cierre según las reglas competitivas.
- Cuando el partido queda oficial, pasa al historial/resultados y ya no forma parte de próximos partidos.
- La publicación y despublicación son automáticas; no requieren aprobación cotidiana del administrador.

## 21. Lugares y canchas administrables

- Los lugares disponibles para jugar no se hardcodean en el código. Administración los gestiona desde su panel.
- Administración puede agregar y editar un lugar y quitarlo de la lista de lugares disponibles.
- Internamente, quitar un lugar que ya tiene historial significa **archivarlo/desactivarlo**, no borrar sus referencias históricas.
- Datos mínimos: nombre público, dirección y estado activo/inactivo.
- Puede existir una marca opcional `sede asociada/recomendada` para acuerdos comerciales de LA RED.
- Solo los lugares activos pueden seleccionarse para nuevas programaciones.
- Si un lugar se desactiva después de que un partido ya fue acordado allí, ese partido conserva su programación hasta que las parejas la cambien o administración haga una excepción; desactivar un lugar no reescribe el pasado ni cancela silenciosamente compromisos existentes.
- Cada programación/partido debe conservar un snapshot suficiente del nombre/dirección acordados para que cambios futuros del lugar no deformen el historial.
- La lista concreta de lugares se cargará más adelante desde administración y puede cambiar sin desplegar código.


## 22. Notificaciones y WhatsApp

- La app es la **fuente oficial de verdad** para asignaciones, plazos, propuestas, resultados y sanciones.
- WhatsApp es un canal fundamental de notificación, pero un fallo de entrega de WhatsApp no modifica por sí solo el estado oficial guardado en LA RED.
- Eventos mínimos a notificar: invitación de pareja, nuevo rival, propuesta de fecha, fecha confirmada, cambio de programación, cambio de lugar, recordatorios de vencimiento, resultado pendiente de confirmar, auto-validación, reprogramación extraordinaria, no-show, pausa y movimientos competitivos relevantes.
- Las notificaciones operativas de pareja se envían a **ambos integrantes** por WhatsApp.
- La app también debe mantener una bandeja/centro interno de notificaciones.
- Los avisos deben ser idempotentes y registrar intento/estado de entrega para evitar mensajes duplicados.

## 23. Categoría individual versus categoría de pareja

- La categoría de la pareja determina dónde compite la dupla.
- La categoría individual representa el nivel propio vigente de cada jugador.
- Al formar pareja se usa la categoría individual más fuerte de los dos para ubicar la dupla, pero esto no eleva automáticamente al compañero de nivel más bajo.
- Ejemplo: jugador A individual 5ª + jugador B individual 2ª => la pareja compite en 2ª; A sigue individualmente en 5ª y B en 2ª.
- Si esa pareja asciende de 2ª a 1ª, ambos pasan individualmente a 1ª porque el ascenso fue ganado en cancha.
- Si esa pareja desciende de 2ª a 3ª, B pasa individualmente a 3ª; A puede seguir individualmente en 5ª porque todavía no descendió por debajo de su propio nivel.
- Si la pareja luego cae a 6ª, ambos quedan individualmente en 6ª.
- Esta regla permite jugar voluntariamente hacia arriba sin quedar atrapado para siempre y evita bajar artificialmente cambiando de compañero.

## 24. Acciones dentro de la pareja

- Cualquiera de los dos integrantes puede realizar acciones operativas ordinarias en nombre de la pareja: coordinación, propuestas, aceptación de programación, carga y confirmación de resultado.
- La pausa voluntaria requiere confirmación de ambos.
- La disolución puede ser iniciada por cualquiera, con el flujo de 7 días y resolución previa de obligaciones definido en este documento.
- Toda acción fuerte queda auditada.

## 25. Historial explicativo y transparencia

- Cada cambio relevante debe tener una explicación visible en lenguaje humano: por qué subió/bajó una posición, por qué recibió deuda, por qué quedó pausada, por qué ascendió/descendió o cómo se resolvió un resultado.
- Cada compromiso tiene una línea de tiempo de hechos: asignación, propuestas, aceptación, lugar, cambios, reprogramación, no-show, resultado y cierre.
- El registro técnico y el historial visible deben provenir de los mismos eventos para evitar versiones contradictorias.

## 26. Privacidad pública

- La parte pública puede mostrar nombre de jugadores, pareja, circuito, categoría, posición, ELO, resultados, próximos partidos, evolución y logros deportivos.
- Nunca publica DNI, teléfono, email, mensajes de coordinación, códigos de verificación ni detalles disciplinarios/identitarios.
- El estado disciplinario no se expone como etiqueta pública.
- WhatsApp/telefono del rival solo está disponible a los integrantes mientras exista un compromiso abierto entre esas parejas.

## 27. Perfil deportivo de pareja

- Desde ranking/resultados debe poder abrirse una ficha deportiva de la pareja.
- Puede mostrar jugadores, categoría, posición, ELO, partidos, victorias, rachas, últimos resultados, próximos partidos públicos, ascensos/descensos, evolución de posición y récords/logros.
- No incorpora seguidores, likes, comentarios ni funciones de red social.

## 28. UX explicativa

- El usuario no debe necesitar leer el reglamento completo para operar LA RED.
- `MI LIGA` responde primero **“¿Qué me toca hacer ahora?”** con una acción principal o `ESTÁS AL DÍA`.
- Cada acción sensible muestra microexplicaciones contextuales, por ejemplo por qué una fecha anterior sigue vigente, qué significa una deuda o qué consecuencia tiene una prórroga extraordinaria.
- Conceptos como ELO, deuda, racha o movimiento de ranking deben tener un `¿Por qué?`/`Ver más` breve.
- Después de eventos relevantes, la app muestra **“Qué acaba de pasar”** con una explicación concreta.
- El objetivo es explicar la regla en el momento en que importa, no saturar la interfaz con el reglamento completo.

## 29. Auditoría y corrección administrativa

- Toda acción administrativa importante conserva quién, cuándo y qué cambió.
- Cuando una corrección es segura, el panel debe ofrecer una forma explícita de revertir/corregir sin editar directamente la base.
- Las correcciones no pueden borrar historial ni reescribir silenciosamente consecuencias deportivas ya consolidadas; si una corrección afecta competencia, debe crear un nuevo evento de corrección auditable.


## 30. Plataforma, legal y evolución comercial

- LA RED debe mantener una única lógica competitiva compartida por web, Android e iPhone.
- La app móvil puede sumar push notifications, pero WhatsApp sigue siendo canal operativo principal y la app sigue siendo la fuente oficial.
- El lanzamiento competitivo inicial es para mayores de 18 años.
- Antes de competir, cada jugador debe aceptar términos/versiones vigentes de participación, riesgos, conducta, privacidad y comunicaciones.
- DNI, teléfono, email, mensajes y disciplina nunca son información pública.
- No almacenar diagnósticos médicos; `LESIÓN / ABANDONO` es suficiente para el resultado deportivo.
- La versión final de términos, privacidad, riesgos, conducta y acuerdos con sedes requiere revisión profesional local antes del lanzamiento.
- LA RED no se define como “sin fines de lucro” ni promete gratuidad permanente.
- La arquitectura debe permitir en el futuro reservas y pagos de cancha mediante un proveedor de pagos apropiado, comisiones a sedes y acuerdos comerciales sin alterar el motor deportivo.
- La monetización futura debe tener términos, políticas de cancelación/reintegro, facturación/liquidación y revisión legal/contable específicas antes de activarse.
