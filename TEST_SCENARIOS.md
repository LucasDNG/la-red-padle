# LA RED Pádel — Escenarios obligatorios de validación

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
4. Jugador que descendió legítimamente de 2ª a 4ª + nuevo => 4ª.
5. No se usa la mejor categoría histórica.

## Escalera

1. #7 vence a #4 => #7 pasa a #4 y la antigua #4 pasa a #7.
2. #4 vence a #7 => no cambian posiciones.
3. Las estadísticas acumuladas no reordenan por sí solas toda la categoría.
4. Una penalización de posición sí puede mover una pareja sin contar como derrota deportiva.

## Parejas nuevas y actividad

1. Varias parejas con 0 partidos pueden tener ELO 0 simultáneamente.
2. Entre parejas nuevas sin actividad, la más antigua aparece antes.
3. Una pareja que juega su primer partido pasa por delante de parejas que nunca jugaron, incluso si pierde.
4. Ese ajuste inicial no debe destruir posiciones previamente conquistadas por desafíos o penalizaciones.

## ELO

1. Se permiten decimales.
2. Una pareja sin partidos muestra 0.
3. Al cambiar la cantidad de parejas de una categoría, el ELO base se recalcula.
4. El ELO no reordena por sí solo el ranking.
5. Un empate deportivo permitido puede mostrar el mismo ELO.

## Récord de Primera

1. Conquistar el #1 de Primera => ELO base 2000 y 0 defensas.
2. El #1 gana su siguiente partido y conserva la punta => 2001 y 1 defensa.
3. Quince defensas => 2015.
4. Perder la punta detiene la acumulación.
5. El máximo histórico alcanzado sobrevive a futuras derrotas y al archivado.
6. Un #1 de 2ª, 3ª, etc. nunca crea el récord público de Primera.

## Ascenso

1. No ser #1 + 3 victorias => no asciende.
2. Ser #1 + 3 victorias => asciende.
3. #1 de Primera => no asciende.
4. La cantidad de parejas de las categorías no cambia la regla.
5. La racha que produjo el ascenso se reinicia.
6. Auditar después del push que la entrada al fondo de la categoría superior sea la política definitiva.

## Descenso

1. No ser último + 3 derrotas => no desciende.
2. Ser último + 3 derrotas => desciende.
3. 7ª => no desciende.
4. La pareja descendida no desplaza al #1 de la categoría inferior.
5. Sin deuda y con categoría inferior ocupada => entrada #2.
6. Deuda 1 => intenta entrar #3.
7. Deuda 3 => intenta entrar #5.
8. Si no hay suficientes posiciones, entra lo más abajo posible y conserva la deuda sobrante.
9. Auditar el caso extremo de una categoría inferior completamente vacía.

## Desafíos pendientes: 30 días para aceptar

1. Crear desafío => `response_deadline_at = created_at + 30 días`.
2. Aceptar antes del vencimiento => desafío `accepted`.
3. No aceptar a tiempo => `expired`.
4. Solo la pareja desafiada recibe 1 penalización de posición.
5. La penalización es idempotente.
6. Si está última => no se inventa una posición; suma deuda.

## Desafíos aceptados: 90 días

1. Aceptar => `play_deadline_at = accepted_at + 90 días`.
2. Pueden coexistir varios desafíos aceptados con plazos independientes.
3. Si vence sin resolución => ambas parejas reciben 1 penalización de posición.
4. Si una está última => suma deuda.
5. La penalización es idempotente.
6. Una carga de resultado pendiente/disputada congela la expiración automática porque el partido ya fue reportado como jugado.
7. Ya no existe `-10 ELO` por vencimiento.

## Penalización de posición

1. #4 penalizada en una categoría con #5 => pasa a #5; la antigua #5 sube a #4.
2. No suma derrota deportiva.
3. No modifica directamente la racha de derrotas.
4. Última penalizada => deuda +1.
5. Si la #1 de Primera pierde un puesto por sanción, termina su reinado actual; el récord histórico alcanzado se conserva.
6. Si dos parejas adyacentes son penalizadas por el mismo desafío, la aplicación debe ser simultánea: nunca pueden intercambiar dos veces y terminar donde empezaron.
7. Ejemplo con #4 y #5 penalizadas y una #6 no penalizada: #6 sube a #4, la antigua #4 queda #5 y la antigua #5 queda #6.
8. Si un bloque completo de parejas penalizadas ya toca el fondo y no puede bajar sin beneficiar a otra penalizada, sus integrantes conservan posición y cada uno suma deuda.

## Resultados

1. Cargar resultado => `pending`.
2. El cargador no puede auto-confirmar.
3. Confirmar crea el partido oficial.
4. Objetar => `disputed` y no modifica ranking.
5. Confirmación administrativa aplica las mismas reglas competitivas que una confirmación normal.
6. Rechazo administrativo restaura el plazo original del desafío aceptado.

## Disolución

1. La pareja queda `inactive`.
2. Sus miembros quedan libres.
3. Pending/accepted => cancelled.
4. Históricos permanecen.
5. ELO, posición y rachas no se transfieren.
6. Los jugadores conservan categoría vigente.

## Disciplina

1. 3 denunciantes distintos válidos en 180 días => observed.
2. 5 => review.
3. Repeticiones del mismo denunciante cuentan una vez.
4. dismissed no cuenta.
5. Más de 180 días sale del cálculo pero no del historial.

## Simulación de longevidad

Antes de una versión candidata a producción, simular varios años incluyendo:

- altas masivas;
- muchas parejas por categoría;
- disoluciones/recreaciones;
- miles de desafíos;
- pendientes vencidos a 30 días;
- aceptados vencidos a 90 días;
- deuda de posición acumulada;
- ascensos/descensos repetidos;
- defensas prolongadas del #1 de Primera;
- resultados disputados;
- denuncias dentro/fuera de 180 días.

Comprobar al menos:

- ningún jugador está en dos parejas activas;
- no hay posiciones activas duplicadas;
- las penalizaciones se aplican una sola vez;
- las deudas no desaparecen silenciosamente;
- el #1 de la categoría inferior no es desplazado por un descenso;
- el récord de Primera permanece;
- no se reintroduce el viejo `-10 ELO`;
- no existen cupos de categoría.
