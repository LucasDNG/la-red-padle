# LA RED Pádel — Escenarios obligatorios de validación

Estos escenarios son invariantes. El objetivo de las simulaciones es intentar romperlos.

## Alta y onboarding

1. Registrarse no obliga a formar pareja.
2. Después del registro aparecen FORMAR PAREJA y MÁS TARDE.
3. MÁS TARDE mantiene la sesión.
4. MI LIGA permite volver a la gestión de pareja.
5. No deben coexistir dos experiencias distintas para gestionar la pareja.

## Categorías ilimitadas

1. Una categoría puede tener 10, 30, 100 o más parejas.
2. Nunca se cierra por capacidad.
3. Una pareja nueva entra al fondo.
4. No existe espera por cupo.

## Categoría de una nueva pareja

1. Nuevo + nuevo => pueden elegir 1ª–7ª.
2. 3ª + nuevo => 3ª.
3. 2ª + 4ª => 2ª.
4. Jugador que descendió legítimamente de 2ª a 4ª + nuevo => nueva pareja en 4ª.
5. No se usa la mejor categoría histórica.

## Escalera

1. #7 vence a #4 => #7 pasa a #4 y la antigua #4 pasa a #7.
2. #4 vence a #7 => no cambian posiciones.
3. #5 y #6 no se mueven cuando #7 intercambia con #4.
4. Las estadísticas acumuladas no reordenan por sí solas toda la categoría.
5. Una penalización puede mover una pareja sin contar como derrota deportiva.
6. Ningún ajuste por “primer partido” puede deshacer una posición conquistada en cancha.

## Parejas nuevas y ELO 0

1. Varias parejas con 0 partidos pueden tener ELO 0 simultáneamente.
2. Entre parejas nuevas equivalentes, la más antigua puede mostrarse antes.
3. Jugar el primer partido no reordena automáticamente toda la cohorte de parejas sin partidos.
4. Una pareja que gana una posición en su primer partido conserva esa posición.

## ELO

1. Se permiten decimales.
2. Una pareja sin partidos oficiales muestra 0.
3. El ELO no reordena por sí solo el ranking.
4. Pueden existir ELO repetidos cuando las reglas lo permitan.
5. La fórmula proporcional exacta debe poder cambiar sin alterar la autoridad de la posición estructural.

## Récord de Primera

1. Conquistar el #1 de Primera => ELO base 2000 y 0 defensas.
2. El #1 gana el siguiente partido y conserva la punta => 2001 y 1 defensa.
3. Quince defensas => 2015.
4. Perder la punta detiene la acumulación.
5. El máximo histórico sobrevive a futuras derrotas y al archivado.
6. Un #1 de 2ª, 3ª, etc. nunca crea un récord público de Primera.
7. Primera Masculina y Primera Femenina conservan récords independientes.
8. Un nuevo máximo masculino no reemplaza ni altera el máximo femenino y viceversa.
9. La portada puede mostrar simultáneamente ambos récords.

## Ascenso

1. No ser #1 + 3 victorias => no asciende.
2. Ser #1 + 3 victorias => asciende.
3. #1 de Primera => no asciende.
4. La cantidad de parejas de las categorías no cambia la regla.
5. La racha que produjo el ascenso se reinicia.
6. La pareja ascendida entra al fondo del bloque competitivo activo de la categoría superior.

## Descenso

1. No ser último + 3 derrotas => no desciende.
2. Ser último + 3 derrotas => desciende.
3. 7ª => no desciende.
4. La pareja descendida no desplaza al #1 de la categoría inferior.
5. Sin deuda y con categoría inferior ocupada => intenta entrar #2.
6. Deuda 1 => intenta entrar #3.
7. Deuda 3 => intenta entrar #5.
8. Si no hay suficientes posiciones, entra lo más abajo posible y conserva la deuda sobrante.
9. Si la categoría inferior no tiene parejas activas, la descendida entra #1; si tiene al menos una, nunca desplaza al líder y parte desde #2 ajustado por deuda.

## Rueda: un solo partido abierto

1. Una pareja `active` nunca puede tener dos partidos de rueda abiertos simultáneamente.
2. Dos parejas no pueden tener duplicado el mismo compromiso activo.
3. Resolver oficialmente el partido libera inmediatamente a ambas parejas para una nueva asignación.
4. Una pareja puede jugar varios partidos en el mismo mes si va cerrando cada uno antes de recibir el siguiente.
5. Los 30 días son plazo máximo por asignación, no límite de frecuencia.
6. Un rival asignado debe pertenecer a la misma categoría al momento de asignación.

## Rueda: plazo de 30 días

1. Asignación el día 1 => fecha límite día 31 según timestamp exacto de 30 días.
2. Si juegan/cargan antes del límite, no hay penalización mensual.
3. Si A demuestra cumplimiento y B incumple => solo B baja un puesto.
4. Si ninguna realiza acciones válidas => ambas bajan un puesto simultáneamente.
5. Si una sancionada está última => deuda +1.
6. La sanción mensual no modifica directamente la racha deportiva de derrotas.
7. Una penalización se aplica una sola vez por vencimiento.

## Incumplimiento consecutivo y pausa automática

1. Primer incumplimiento atribuible => contador consecutivo = 1.
2. Segundo incumplimiento atribuible consecutivo => pareja pasa a `paused`.
3. Un partido de rueda cumplido entre ambos incumplimientos reinicia el contador.
4. Al pasar a `paused`, la pareja queda al fondo de su categoría.
5. En `paused`, ELO visible = 0.
6. En `paused`, no recibe nuevos partidos de rueda.
7. En `paused`, no sigue acumulando sanciones mensuales por ausencia.
8. Reactivar no cambia la categoría; vuelve desde el fondo.
9. `paused` nunca debe liberar a los jugadores para formar otra pareja; eso corresponde a `inactive`/disolución.

## Resultado: bloqueo y 15 días

1. Cargar un resultado bloquea a ambas parejas para una nueva asignación.
2. La otra pareja dispone de 15 días para confirmar u objetar.
3. Confirmación dentro del plazo => resultado oficial inmediato.
4. Sin respuesta al día 15 => el único resultado cargado se auto-valida una sola vez.
5. Después de la auto-validación tardía no puede reabrirse por la vía normal.
6. Mientras el resultado esté pendiente ninguna de las dos parejas puede jugar otro partido oficial de rueda.
7. El orden de confirmación nunca debe permitir que un partido posterior se oficialice antes que el anterior para la misma pareja.

## Resultado disputado

1. Versiones incompatibles => estado `disputed`.
2. `disputed` no cambia ranking, rachas, ELO ni categorías.
3. Ambas parejas siguen bloqueadas mientras la disputa esté abierta.
4. Administración ve las dos versiones.
5. El administrador puede validar una versión o rechazar ambas.
6. La resolución oficial usa exactamente el mismo motor competitivo que una confirmación normal.

## Marcador y diferencia de games

1. Un marcador oficial debe permitir calcular games sin ambigüedad.
2. Un super tie-break `10-8` no debe sumar diez y ocho games si reglamentariamente representa puntos.
3. Un marcador libre inválido no debe contaminar estadísticas oficiales.
4. Los nuevos partidos usan marcador estructurado; un `match_tiebreak` no suma sus puntos a la diferencia de games.

## Penalización simultánea

1. #4 penalizada con #5 debajo => #4 pasa a #5 y la antigua #5 sube a #4.
2. Dos parejas adyacentes penalizadas por el mismo evento no pueden intercambiar dos veces y terminar donde empezaron.
3. Si #4 y #5 son penalizadas y #6 no, #6 debe subir por encima del bloque sancionado según la regla simultánea.
4. Si un bloque penalizado toca el fondo y no puede bajar sin beneficiar artificialmente al propio bloque, la deuda debe conservarse de forma consistente.

## Pausa voluntaria

1. Una pareja puede solicitar pausa por viaje/vacaciones.
2. Pausarse la saca de futuras asignaciones.
3. La pausa no equivale a disolución.
4. Conserva categoría e historial.
5. Debe existir una regla explícita antes de implementar qué sucede si solicita pausa con un partido abierto.

## Disolución

1. La pareja queda `inactive`.
2. Sus miembros quedan libres.
3. Históricos permanecen.
4. ELO, posición y rachas no se transfieren.
5. Los jugadores conservan categoría vigente.
6. `inactive` no debe confundirse con `paused`.

## Disciplina

1. 3 denunciantes distintos válidos en 180 días => `observed`.
2. 5 => `review`.
3. Repeticiones del mismo denunciante cuentan una vez.
4. `dismissed` no cuenta.
5. Más de 180 días sale del cálculo móvil pero no del historial.
6. Debe probarse el caso de una denuncia presentada mucho tiempo después del hecho; hasta definir límite temporal no debe automatizarse una interpretación no aprobada.

## Integridad y concurrencia

1. Ningún jugador puede pertenecer a dos parejas competitivamente vigentes incompatibles.
2. No hay posiciones activas duplicadas en una categoría.
3. Dos confirmaciones simultáneas no pueden crear dos partidos oficiales para el mismo compromiso.
4. Dos procesos de mantenimiento simultáneos no pueden aplicar dos veces la misma penalización.
5. Una pareja no puede recibir una nueva asignación mientras todavía esté bloqueada por partido o resultado anterior.
6. Un cambio de categoría debe invalidar/cerrar cualquier compromiso heredado que ya no sea compatible con la nueva categoría.

## Rendimiento y longevidad

Simular varios años incluyendo:

- altas masivas;
- 100+ parejas por categoría;
- miles de partidos;
- asignaciones frecuentes;
- parejas que juegan diariamente;
- parejas que usan todo el plazo de 30 días;
- incumplimientos consecutivos;
- pausas y reactivaciones;
- deuda de posición;
- ascensos/descensos repetidos;
- defensas prolongadas del #1 de Primera;
- resultados auto-validados a 15 días;
- disputas administrativas;
- denuncias dentro/fuera de 180 días;
- disoluciones y recreaciones.

Comprobar como mínimo:

- no hay posiciones duplicadas;
- no hay compromisos dobles por pareja;
- las penalizaciones son idempotentes;
- las deudas no desaparecen silenciosamente;
- las parejas pausadas no bloquean la rueda;
- el #1 de la categoría inferior no es desplazado por un descenso;
- el récord de Primera permanece;
- no reaparece el viejo `-10 ELO`;
- no reaparecen cupos de categoría;
- abrir el ranking no produce una cantidad de escrituras proporcional a todo el historial;
- el mantenimiento automático utiliza solo el motor vigente;
- ninguna regla vieja de 30/90 días o múltiples desafíos activos queda conectada por accidente.

## Regresiones adicionales de auditoría integral

### Estados competitivos y disciplina

1. Una pareja `paused` no puede volver a `active` solo porque el mantenimiento disciplinario recalculó sus denuncias.
2. Una pareja puede conservar su estado competitivo y su estado disciplinario sin que uno sobrescriba al otro.
3. `paused` no libera a sus jugadores para formar otra pareja.
4. `inactive` sí representa disolución/archivo y no debe confundirse con sanción disciplinaria.

### Disolución / pausa como vía de escape

1. Una pareja que tiene resultado pendiente no puede hacer desaparecer ese resultado mediante disolución normal.
2. Una pareja que tiene resultado disputado no puede hacer desaparecer la disputa mediante disolución normal.
3. Una pausa voluntaria no puede borrar un compromiso ya asignado sin una regla explícita de cierre.
4. Una excepción administrativa debe dejar traza/auditoría y nunca producir dos cierres del mismo compromiso.

### Dos versiones de resultado

1. Cada pareja puede tener como máximo una versión vigente del resultado de una asignación.
2. Si ambas versiones coinciden, se confirma una sola vez.
3. Si difieren en ganador o marcador oficial, administración puede ver ambas completas.
4. Una nota libre no sustituye a la segunda versión estructurada.
5. Resolver una disputa no puede crear dos filas oficiales en `matches`.

### Fecha real del partido

1. Partido jugado el día 1 y confirmado el día 10 conserva día 1 como fecha real de juego.
2. La fecha de confirmación/resolución se guarda separada de la fecha de juego.
3. Auto-validar a los 15 días no debe alterar retroactivamente la fecha declarada del partido.

### Parejas sin rival y categorías impares

1. Una pareja sin rival elegible no recibe penalización por no jugar.
2. El reloj de 30 días no empieza hasta que existe una asignación real.
3. Con 3 parejas libres, la que queda esperando no suma incumplimiento.
4. Repetir muchas rondas con cantidad impar no debe dejar sistemáticamente esperando a la misma pareja.
5. Cuando aparece un rival elegible, la pareja con mayor tiempo de espera debe ser considerada prioritariamente según el algoritmo final.

### Revancha inmediata / farming

1. Si A acaba de jugar con B y A/B tienen alternativas libres, la rueda no debe emparejarlos de nuevo de forma inmediata si la regla final de variedad lo prohíbe.
2. Una pareja muy activa no debe poder inflar defensas/rachas simplemente repitiendo infinitamente contra el mismo rival cuando existen alternativas elegibles.
3. En una categoría de solo 2 parejas, el comportamiento de revancha debe seguir la excepción que finalmente se apruebe y quedar probado explícitamente.

### Administración de disputa

1. Una disputa muestra antigüedad y ambas versiones al administrador.
2. Confirmar una versión aplica el motor competitivo una sola vez.
3. Rechazar ambas no debe dejar un estado huérfano; debe seguir la regla que se defina antes de implementación.
4. Una disputa abierta no genera penalización mensual automática a las parejas por el mero paso del tiempo.

### Integridad de reportes

1. Dos requests concurrentes de la misma pareja para denunciar el mismo compromiso producen como máximo un reporte válido.
2. `reason = other` con `details = NULL`, vacío o solo espacios es rechazado también por la base.
3. Una denuncia tardía se trata según la ventana que se defina y no por una interpretación accidental de `created_at`.

### Integridad relacional

1. Una pareja no puede quedar asociada a una categoría de otra liga/circuito por un bug de aplicación.
2. `winner_pair_id` de un partido oficial debe ser uno de sus dos participantes.
3. Una asignación nunca puede unir parejas de categorías distintas.

### Automatización de calidad

1. `npm test` debe fallar si se reintroduce cualquiera de los bugs competitivos críticos.
2. Un push no debe considerarse candidato final si solo pasó `node --check` y build visual.
3. La suite debe probar concurrencia/idempotencia de confirmación, mantenimiento y penalizaciones.
4. La simulación de longevidad debe poder repetirse con una semilla fija para reproducir fallas.

### Documentación

1. `README.md`, instrucciones de aplicación y textos visibles no pueden describir simultáneamente reglas 30/90 y rueda mensual.
2. Una búsqueda final del repositorio no debe encontrar instrucciones activas de `-10 ELO`, cupos, múltiples desafíos simultáneos o 90 días salvo en historial claramente marcado como histórico.

## Estado competitivo vs disciplina

1. Pareja `active + clear` => elegible para rueda si no tiene compromiso abierto.
2. Pareja `active + observed` => conserva posición, pero no recibe partido.
3. Pareja `active + review` => conserva posición, pero no recibe partido.
4. El envejecimiento de reportes no limpia por sí solo un estado disciplinario abierto.
5. Resolver disciplina a `clear` vuelve a hacerla elegible sin alterar silenciosamente su posición.
6. Si entra disciplina con partido aún no jugado, se cancela ese compromiso y el rival queda libre sin penalización.
7. Si ya hay resultado pendiente/disputado, disciplina no lo borra.

## Disolución anti-evasión

1. Pareja con asignación abierta no puede disolverse por autoservicio.
2. Pareja con resultado `pending` no puede disolverse.
3. Pareja con resultado `disputed` no puede disolverse.
4. Una vez cerrado/cancelado administrativamente el compromiso, la disolución vuelve a estar disponible.

## Rueda por antigüedad del cruce

1. Si A nunca jugó contra C pero sí contra B, C tiene prioridad como rival de A.
2. Si A ya jugó con B y C, se elige aquel cuya última fecha contra A sea más antigua.
3. Si A-B acaba de jugar y existe C elegible con cruce más antiguo, no se repite A-B.
4. Con 3 parejas elegibles, la que queda libre mantiene su antigüedad de espera y debe ser priorizada en la siguiente oportunidad.
5. Una pareja sin rival disponible no suma incumplimiento ni deuda.
6. Con una sola pareja elegible, no se crea asignación ficticia ni empieza un reloj de 30 días.

## Dos versiones de resultado

1. Primera versión guarda ganador, `played_at` real y marcador.
2. Confirmar la misma versión oficializa de inmediato.
3. Segunda versión idéntica normalizada oficializa de inmediato.
4. Segunda versión diferente crea `disputed` conservando ambas versiones completas.
5. Administración puede escoger versión A o B; el `played_at` oficial debe ser el de la versión elegida.
6. Administración puede cerrar sin resultado sin inventar ganador.
7. No se pueden crear más de dos versiones, una por pareja.

## Pausa y orden del fondo

1. Pausar preserva deuda de posición y rachas deportivas.
2. Pausar mueve a la pareja debajo de todas las parejas competitivamente activas.
3. Varias pausadas conservan posiciones únicas y permanecen al fondo.
4. Una nueva pareja activa entra al fondo del bloque activo y por encima del bloque pausado.
5. Reactivar entra al fondo del bloque activo y reinicia `monthly_miss_streak` en 0.
6. Pausa voluntaria con compromiso abierto es rechazada salvo intervención administrativa.


## Formación de pareja con consentimiento

1. A selecciona a B => se crea invitación, no pareja.
2. B rechaza/ignora => no cambia ninguna categoría/posición.
3. B acepta => la pareja se crea/reactiva exactamente una vez.
4. Dos aceptaciones concurrentes no pueden dejar a un jugador en dos parejas vigentes.
5. Mismos dos integrantes que vuelven juntos => se reactiva la identidad archivada, no aparece una segunda identidad paralela.

## Coordinación autónoma

1. Ninguno propone fecha en 30 días => ambos reciben incumplimiento.
2. A propone y B nunca responde/contrapropone => solo B recibe incumplimiento.
3. A y B realizan propuestas válidas pero no acuerdan/juegan => ambos reciben incumplimiento.
4. Existe fecha acordada y A marca no-show de B; B no contesta en la ventana => B recibe incumplimiento sin intervención admin.
5. B contradice el no-show => caso excepcional para administración.
6. Toda propuesta/respuesta conserva timestamps y actor.

## Pausa sin abuso

1. Pareja con `monthly_miss_streak=1` hace pausa voluntaria y reactiva => conserva 1.
2. Pareja pasa a pausa automática al segundo incumplimiento y luego reactiva => comienza nuevo ciclo con 0.
3. `pausar al terminar este partido` no cancela ni modifica el partido actual.
4. Al cerrarse el partido con `pause_after_current=true`, no recibe nueva asignación y pasa a `paused`.
5. #1 de Primera que pasa a `paused` deja de defender la punta; su récord histórico permanece.

## Disciplina persistente y resoluble

1. Administración limpia una disciplina => los mismos reportes antiguos no la reabren en el siguiente mantenimiento.
2. Reportes nuevos posteriores a `discipline_resolved_at` sí pueden volver a alcanzar umbral.
3. Pareja con disciplina abierta no puede disolverse por autoservicio.
4. Un compromiso aún no jugado se cancela neutralmente al abrirse disciplina; un resultado ya cargado continúa hasta cierre.

## Resultado editable y cierre void

1. Primera pareja corrige su versión antes de respuesta rival => permitido y auditado.
2. Esa corrección no reinicia `confirmation_deadline_at`.
3. Después de respuesta rival no se puede editar por autoservicio.
4. Admin rechaza ambas versiones => assignment `void`, cero partido oficial, cero cambio de ranking/racha/ELO.
5. Cierre `void` libera a ambas parejas si no existe otro bloqueo.

## Integridad adicional

1. Un usuario nunca puede quedar en dos parejas vigentes por carrera de requests.
2. Una pareja nunca puede tener dos assignments abiertos por carrera de maintenance/requests.
3. Toda sanción automática tiene un source/event id idempotente.
4. Una lectura de ranking no crea eventos ni modifica filas competitivas.
5. Paused no participa del denominador ELO; active disciplinariamente bloqueada sí conserva su lugar en el bloque.

## Próximos partidos públicos

1. Assignment sin fecha/lugar acordados => no aparece públicamente.
2. A propone fecha/hora/lugar => todavía no se publica.
3. B acepta exactamente esa programación => aparece automáticamente en Próximos partidos.
4. La cartelera muestra circuito, categoría, parejas, fecha, hora y lugar, pero nunca contactos privados.
5. Cambiar la programación requiere aceptación de ambas; una modificación unilateral no reemplaza lo ya publicado.
6. Cancelar el compromiso antes de jugar => desaparece de la cartelera.
7. Al superar la hora programada deja de listarse como futuro sin cerrar por sí solo el assignment competitivo.
8. Resultado oficial => queda fuera de Próximos y disponible en historial/resultados.
9. Dos actualizaciones concurrentes no pueden publicar dos horarios vigentes para el mismo assignment.

## Lugares administrables

1. Admin agrega un lugar activo => puede elegirse en una nueva programación.
2. Admin lo desactiva => deja de ofrecerse para nuevas programaciones.
3. Desactivar un lugar con historial no borra el nombre/dirección de partidos pasados.
4. Desactivar un lugar con un futuro ya acordado no cancela automáticamente ese assignment.
5. Editar nombre/dirección no debe deformar el snapshot histórico de partidos ya jugados.
6. Un lugar puede marcarse como sede asociada/recomendada sin alterar la rueda ni el ranking.
7. La lista de lugares puede cambiar desde administración sin cambio de código/despliegue.


## Identidad y acceso

1. Dos registros con el mismo DNI no crean dos usuarios.
2. El login correcto usa DNI + contraseña.
3. Cuenta pendiente de verificación puede entrar a su cuenta pero no formar pareja ni competir.
4. DNI nunca aparece en endpoints/pantallas públicas.
5. Recuperar contraseña exige control del WhatsApp registrado.
6. Cambiar DNI no es autoservicio y deja auditoría.
7. No iniciar sesión durante meses no pausa ni archiva por sí solo al jugador.

## Invitación de pareja

1. Una invitación muestra invitante y categoría resultante.
2. Vence a los 10 días si no se acepta.
3. Quien la envió puede cancelarla antes.
4. No puede dejar a un jugador en dos parejas por concurrencia.
5. Aceptarla no modifica automáticamente la categoría individual del jugador arrastrado hacia arriba.

## Categoría individual versus pareja

1. 5ª + 2ª => la pareja compite en 2ª; individuales siguen 5ª y 2ª.
2. Si esa pareja se disuelve sin movimiento deportivo, vuelven a usar 5ª y 2ª para futuras formaciones.
3. Si asciende 2ª→1ª, ambos pasan individualmente a 1ª.
4. Si 5ª + 2ª desciende 2ª→3ª, el jugador originalmente 2ª pasa a 3ª y el originalmente 5ª sigue 5ª.
5. Si luego cae a 6ª, ambos quedan individualmente en 6ª.
6. Cambiar compañero nunca permite bajar por debajo del nivel individual vigente sin descenso deportivo.

## Programación y reprogramación

1. Solo existe una programación oficial vigente por assignment.
2. Pedir cambio no elimina la fecha confirmada anterior.
3. Dentro de los 30 días pueden cambiar fecha/hora/lugar múltiples veces si ambos aceptan.
4. Si no acuerdan antes del vencimiento y no hay responsable único, ambos reciben penalización de posición/deuda.
5. Causa externa confirmada por ambas al agotarse el plazo habilita una única extensión de 15 días.
6. Una segunda causa externa no crea otra extensión.
7. Si vence la extensión, ambos reciben penalización de posición/deuda, sin derrota deportiva ni incremento de la racha de incumplimientos para pausa automática.
8. Una caída registrada del sistema no sanciona a los jugadores y extiende/suspende neutralmente el plazo.

## WhatsApp y privacidad

1. Rival asignado => aparece acceso privado a WhatsApp para los integrantes.
2. Assignment cerrado => ese acceso desaparece.
3. Visitante público nunca ve teléfono.
4. Fallo de entrega de WhatsApp no modifica el estado oficial del assignment.
5. Notificaciones repetidas/reintentos no deben generar mensajes duplicados por el mismo evento.

## No-show

1. Fecha confirmada + A denuncia no-show de B => B dispone de 48 horas.
2. B no responde => se registra incumplimiento atribuible a B y se aplica una sola penalización.
3. B contradice => la rueda no queda bloqueada indefinidamente; se aplica la regla automática para ambigüedad operativa.
4. Un conflicto de no-show no inventa un resultado deportivo ni games.

## Lesión / abandono

1. Partido iniciado y A abandona => B victoria deportiva, A derrota.
2. El tipo público es `LESIÓN / ABANDONO`.
3. No se cargan sets parciales ni games.
4. Si B estaba debajo de A y gana por abandono, se aplica el intercambio normal de escalera.
5. La derrota cuenta para rachas y puede producir descenso.
6. Si B ya era #1 de Primera, la victoria puede contar como defensa según las reglas normales.
7. No existe -1 posición adicional por abandono.

## Disolución con obligaciones

1. Cualquiera de los integrantes puede iniciar disolución.
2. Sin obligaciones y con acuerdo de ambos => cierre inmediato.
3. Sin acuerdo => el vínculo puede cerrarse al día 7.
4. Assignment no jugado que continúa abierto al día 7 => derrota deportiva de la pareja que se disuelve, luego archivo.
5. Resultado ya cargado no se borra ni se sustituye por derrota automática; termina su flujo y luego se archiva.
6. Disolver no limpia disciplina individual ni de pareja.

## Liga continua y tiempo

1. Cambio de 31 de diciembre a 1 de enero no reinicia posiciones, ELO, rachas, deuda ni récords.
2. Estadísticas por año son filtros, no temporadas.
3. Todos los vencimientos usan `America/Argentina/Buenos_Aires`.

## Disciplina individual

1. Jugador con disciplina abierta cambia de pareja => su expediente sigue existiendo.
2. La nueva pareja no hereda el historial disciplinario como propio.
3. Mientras el jugador siga bloqueado, su pareja no recibe assignment.
4. Limpiar disciplina de pareja no limpia la individual y viceversa.

## UX explicativa y transparencia

1. Cada estado de `MI LIGA` produce una acción principal o `ESTÁS AL DÍA`.
2. Todo movimiento de posición tiene una explicación visible.
3. Toda deuda muestra por qué se creó.
4. La línea de tiempo del compromiso coincide con los eventos reales de auditoría.
5. Ninguna microexplicación contradice `PROJECT_RULES.md`.
6. Perfil público de pareja no expone DNI, teléfono, email, disciplina ni mensajes.


## Legal / consentimiento / privacidad

1. Un jugador no puede competir si no aceptó la versión vigente de los documentos obligatorios.
2. Cada aceptación guarda versión y timestamp.
3. DNI, teléfono, email y disciplina nunca aparecen en vistas públicas.
4. `LESIÓN / ABANDONO` no almacena ni expone diagnóstico médico.
5. Cambiar términos obliga a registrar aceptación de la nueva versión cuando corresponda.
6. La primera versión no permite competir a menores de 18 años.

## WhatsApp a ambos integrantes

1. Un cambio de horario genera aviso a los dos integrantes de ambas parejas.
2. Un cambio de lugar genera aviso a los dos integrantes.
3. Un resultado pendiente genera aviso a ambos integrantes de la pareja que debe responder.
4. Reintentos no duplican mensajes por el mismo evento.
5. Un fallo de WhatsApp no cambia el estado oficial de LA RED.

## Multiplataforma

1. Web, Android e iPhone leen/escriben los mismos estados competitivos.
2. No existe una regla deportiva distinta por plataforma.
3. Push móvil puede fallar sin modificar el estado oficial.
4. La misma cuenta e historial se ven en todas las plataformas.

## Preparación comercial

1. Una sede puede existir sin pagos habilitados.
2. Activar reservas/pagos no cambia la lógica de rueda ni ranking.
3. Una comisión comercial no modifica el resultado deportivo.
4. Desactivar pagos de una sede no borra partidos históricos.
5. El sistema puede distinguir lugar acordado, reserva pendiente, pagada, cancelada y reintegrada cuando esa fase se implemente.
