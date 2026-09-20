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
6. Un #1 de 2ª, 3ª, etc. nunca crea el récord público de Primera.

## Ascenso

1. No ser #1 + 3 victorias => no asciende.
2. Ser #1 + 3 victorias => asciende.
3. #1 de Primera => no asciende.
4. La cantidad de parejas de las categorías no cambia la regla.
5. La racha que produjo el ascenso se reinicia.
6. La posición exacta de entrada del ascendido debe permanecer marcada como pendiente hasta decisión definitiva.

## Descenso

1. No ser último + 3 derrotas => no desciende.
2. Ser último + 3 derrotas => desciende.
3. 7ª => no desciende.
4. La pareja descendida no desplaza al #1 de la categoría inferior.
5. Sin deuda y con categoría inferior ocupada => intenta entrar #2.
6. Deuda 1 => intenta entrar #3.
7. Deuda 3 => intenta entrar #5.
8. Si no hay suficientes posiciones, entra lo más abajo posible y conserva la deuda sobrante.
9. El caso de categoría inferior completamente vacía debe mantenerse como pendiente hasta definición.

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
4. Si el formato exacto todavía no está definido, la diferencia de games debe considerarse pendiente/no confiable para desempate automático.

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
