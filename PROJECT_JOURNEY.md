# LA RED Pádel — Camino del proyecto

## Propósito

Este archivo conserva el recorrido del proyecto: no solo qué reglas quedaron vigentes, sino **por qué fueron apareciendo** y qué problemas fueron resolviendo.

No reemplaza a `PROJECT_RULES.md`.  
- `PROJECT_RULES.md` = fuente de verdad funcional actual.
- `DECISIONS.md` = historial de decisiones concretas.
- `PROJECT_JOURNEY.md` = evolución del producto, principios y razonamiento acumulado.
- `PRODUCT_VISION.md` = cómo debe sentirse y funcionar LA RED.
- `TEST_SCENARIOS.md` = invariantes que deben sobrevivir cualquier cambio.

El objetivo es que el proyecto nunca dependa de recordar el chat.

---

## 1. De una liga simple a un sistema autónomo

LA RED comenzó como una liga de pádel por parejas con ranking y resultados. A medida que se revisó el motor aparecieron riesgos: múltiples desafíos, reglas antiguas 30/90, ELO usado de formas contradictorias, resultados fuera de orden, mantenimiento viejo, cupos y estados mezclados.

La dirección se corrigió hacia una idea central:

> **La liga debe poder funcionar casi sola.**

El administrador no debe ser quien empareja, persigue jugadores, aplica sanciones o valida silencios. Solo debe aparecer cuando existe una excepción humana real.

---

## 2. Ranking: la escalera manda

Se consolidó que el ranking no es un ranking estadístico tradicional.

- La posición estructural es la autoridad.
- Una pareja de abajo que vence a una de arriba intercambia posiciones.
- Si gana la que ya estaba arriba, no hay intercambio.
- Estadísticas y ELO no reordenan globalmente la escalera.
- Las estadísticas sirven como contexto o desempate auxiliar, no como gobierno del ranking.

Principio permanente:

> **Las estadísticas desempatan; no gobiernan el ranking. El ranking se conquista en cancha mediante intercambio de posiciones.**

---

## 3. De desafíos manuales a una rueda automática

El modelo anterior de múltiples desafíos fue descartado.

La rueda final:

- asigna automáticamente un rival;
- permite un solo compromiso abierto por pareja;
- da 30 días para jugar y cargar resultado;
- libera inmediatamente a la pareja cuando el compromiso se cierra;
- prioriza rivales nunca enfrentados;
- después prioriza el cruce más antiguo;
- evita dejar siempre esperando a la misma pareja cuando la cantidad es impar;
- no penaliza a quien no tiene rival elegible.

Esto convirtió el sistema en una liga continua, no en un tablero de desafíos.

---

## 4. Autonomía administrativa como principio

Se decidió que el panel admin debe ser una **cola de excepciones**, no una consola operativa diaria.

El sistema resuelve por sí solo:

- asignaciones;
- vencimientos;
- penalizaciones deterministas;
- auto-validación por silencio;
- pausas automáticas;
- reactivaciones normales;
- ascensos y descensos;
- ELO y estadísticas;
- categorías impares;
- esperas sin rival;
- reprogramación extraordinaria única;
- no-show ordinario;
- publicación de próximos partidos.

El administrador participa principalmente en:

- disputas reales sobre un partido que sí se jugó;
- disciplina;
- verificación/corrección excepcional de identidad;
- correcciones administrativas importantes.

Principio:

> **Si el sistema puede resolver algo objetivamente, no debe enviarlo al administrador.**

---

## 5. Estados separados

Se detectó que mezclar `active`, `observed`, `review`, `inactive` en un solo campo hacía imposible representar el mundo real.

Se separaron:

### Estado competitivo de la pareja
- `active`
- `paused`
- `inactive`

### Estado disciplinario de la pareja
- `clear`
- `observed`
- `review`

### Estado disciplinario del jugador
También existe a nivel persona, para evitar que una conducta desaparezca al cambiar de compañero.

La disciplina bloquea la rueda pero no borra posiciones ni historial.

---

## 6. Pausa, incumplimiento y continuidad

La pausa existe para viajes, vacaciones o inactividad temporal.

- `paused` conserva pareja, categoría, historial, deuda y rachas.
- queda fuera de la rueda;
- ELO visible 0;
- vuelve al fondo del bloque activo al reactivar;
- no libera jugadores para formar otra pareja;
- no recibe sanciones mensuales mientras está pausada.

Dos incumplimientos atribuibles consecutivos provocan pausa automática.

Una pausa voluntaria no puede usarse para borrar una falta previa ni escapar de un compromiso.

Se agregó `PAUSAR AL TERMINAR ESTE PARTIDO` para que una pareja pueda cumplir el compromiso actual y luego salir de la rueda sin quedar atrapada en una nueva asignación inmediata.

---

## 7. Coordinación, fecha y una única programación oficial

Cada compromiso tiene una única programación oficial vigente:

- día;
- hora;
- lugar.

Dentro de los 30 días se puede cambiar todas las veces que sea necesario, siempre que ambas parejas acepten.

Pedir cambio **no cancela la fecha anterior**. La fecha anterior sigue siendo válida hasta que ambas acepten una nueva.

WhatsApp sirve para conversar, pero el acuerdo oficial queda registrado en LA RED.

---

## 8. Reprogramación extraordinaria

Si los 30 días se agotan por una causa externa y ambas parejas lo confirman:

- el mismo partido recibe una única extensión extraordinaria de 15 días;
- no se crea otro compromiso;
- no hay sanción por esa primera causa externa.

Si tampoco se resuelve durante esa extensión:

- ambas parejas pierden una posición;
- si ya están últimas, acumulan deuda;
- la penalización no cuenta como derrota deportiva;
- no suma un strike para la pausa automática.

No existe una segunda prórroga extraordinaria.

---

## 9. No-show sin administrador

Si había fecha confirmada y una pareja denuncia que la otra no se presentó:

- la denunciada tiene 48 horas para objetar;
- si no responde, se considera incumplimiento atribuible;
- si contradice y el sistema no puede determinar objetivamente quién tuvo razón, la liga no se frena: se aplica la regla automática de penalización operativa y se cierra el compromiso.

La contradicción operativa no equivale automáticamente a una falta disciplinaria.

---

## 10. Resultados, silencio y disputa

La primera pareja puede cargar resultado real con fecha jugada.

- la otra dispone de 15 días para confirmar o responder;
- si confirma, se oficializa;
- si guarda silencio, el resultado se auto-valida;
- si presenta una versión distinta, se guardan dos versiones completas;
- administración puede validar una, la otra o cerrar `void`.

La primera versión puede corregirse antes de que la otra pareja responda, sin reiniciar el plazo de 15 días y dejando auditoría.

La fecha oficial del partido es la fecha en que realmente se jugó.

---

## 11. Lesión / abandono

Se descartó cargar sets incompletos.

Si un partido comenzó y una pareja abandona:

- el resultado se marca `LESIÓN / ABANDONO`;
- la otra pareja recibe victoria deportiva;
- la que abandona recibe derrota deportiva;
- no se cargan sets ni games;
- no hay penalización extra;
- sí se aplica el motor normal de escalera, rachas, ascenso/descenso y defensa del #1.

No se publican diagnósticos ni detalles médicos.

---

## 12. Disolución sin borrar obligaciones

Una pareja no puede borrar un partido o resultado disolviéndose.

- cualquiera de los integrantes puede iniciar disolución;
- si ambos aceptan y no hay obligaciones, puede cerrarse de inmediato;
- si no hay acuerdo, existe una salida de 7 días para no dejar a una persona cautiva de un compañero ausente;
- si al final del plazo queda una asignación sin jugar, la pareja que se disuelve recibe derrota deportiva y luego se archiva;
- si ya existe resultado cargado, ese resultado termina su flujo normal antes del archivo;
- la disciplina individual o de pareja no se borra por disolución.

---

## 13. Categoría de pareja versus categoría individual

Se detectó que copiar la categoría de la pareja a ambos jugadores podía dejar atrapado a quien solo había aceptado jugar por encima de su nivel.

La regla final distingue:

- **categoría de pareja** = dónde compite la dupla;
- **categoría individual** = nivel propio vigente del jugador.

Ejemplo:
- jugador A = 5ª;
- jugador B = 2ª;
- la pareja juega en 2ª;
- A sigue individualmente en 5ª;
- B sigue en 2ª.

Solo movimientos deportivos reales cambian la categoría individual.

- Si ascienden 2ª → 1ª, ambos adquieren 1ª.
- Si descienden 2ª → 3ª, el jugador que era 2ª pasa a 3ª; el que era 5ª sigue 5ª.
- Si la pareja llega a 6ª, ambos quedan en 6ª.

Esto permite probar competir hacia arriba sin quedar atrapado y evita bajar artificialmente de nivel cambiando de compañero.

---

## 14. Formación de pareja

La pareja no se forma unilateralmente.

- un jugador invita a otro;
- la invitación muestra quién invita y qué categoría resultaría;
- existe una sola invitación saliente activa;
- puede cancelarse;
- vence a los 10 días;
- aceptar crea/reactiva la pareja de forma transaccional;
- la base impide pertenecer a dos parejas vigentes por concurrencia.

---

## 15. Identidad: DNI y verificación

Se incorporó DNI para evitar cuentas duplicadas.

- DNI único;
- login con DNI + contraseña;
- DNI nunca público;
- registro con nombre, apellido, DNI, teléfono WhatsApp y contraseña;
- cuenta nueva queda `pending_verification`;
- administración verifica una sola vez que corresponde a una persona real;
- hasta entonces puede acceder a su cuenta pero no competir;
- correcciones de DNI requieren administración y auditoría;
- recuperación de contraseña usa DNI + validación por WhatsApp.

La falta de uso de la app por sí sola no cambia ningún estado competitivo.

---

## 16. WhatsApp como canal principal

WhatsApp es fundamental para la operación.

Los avisos relevantes llegan a **ambos integrantes** de la pareja:

- nuevo rival;
- nueva propuesta;
- cambio de horario;
- fecha confirmada;
- cambio de cancha;
- resultado pendiente;
- recordatorios;
- auto-validación;
- reprogramación;
- no-show;
- pausa;
- movimientos competitivos.

La app sigue siendo la fuente oficial. WhatsApp es el canal de aviso.

El teléfono del rival solo es accesible durante un compromiso abierto y nunca se vuelve público.

Más adelante, Android/iPhone pueden sumar push notifications, pero sin reemplazar la lógica oficial de LA RED.

---

## 17. Mi Liga: “¿Qué me toca hacer ahora?”

Se decidió que la pantalla del jugador no debe obligarlo a entender el motor.

Debe responder primero:

> **¿Qué me toca hacer ahora?**

Ejemplos:

- Esperando rival.
- Proponé una fecha.
- Respondé esta propuesta.
- Jugás el sábado 19:30.
- Cargá el resultado.
- Confirmá el resultado.
- Estás al día.
- Tu pareja está pausada.

Debajo aparecen datos e historial, pero la acción prioritaria debe ser inequívoca.

---

## 18. Reglamento integrado en la experiencia

LA RED no debe exigir leer un reglamento para entenderla.

Las reglas se explican dentro del flujo con microexplicaciones:

- por qué una fecha anterior sigue vigente;
- qué significa deuda;
- por qué una pareja subió o bajó;
- qué implica la prórroga extraordinaria;
- por qué una pareja quedó pausada;
- por qué un ascenso/descenso ocurrió.

También existe un historial explicativo:

- qué pasó;
- cuándo;
- quién hizo qué;
- qué consecuencia produjo.

---

## 19. Página pública y cartelera

LA RED también debe sentirse como una liga que la comunidad puede seguir.

La parte pública puede mostrar:

- Próximos partidos;
- Hoy en LA RED;
- Esta semana;
- Ranking;
- Resultados recientes;
- Récord Primera Masculina;
- Récord Primera Femenina;
- perfiles deportivos de parejas.

Los próximos partidos aparecen cuando ambas parejas aceptaron fecha, hora y lugar.

Filtros simples:
- hoy / esta semana;
- masculino / femenino;
- categoría;
- lugar.

No se publican teléfonos, DNI, emails, mensajes de coordinación ni disciplina.

---

## 20. Lugares / canchas

Administración puede:

- agregar lugares;
- editar;
- activar/desactivar;
- marcarlos como sede asociada/recomendada;
- conservarlos históricamente aunque dejen de estar disponibles.

Una cancha desactivada:

- no aparece para nuevas programaciones;
- no borra partidos históricos;
- no cancela automáticamente partidos ya confirmados allí.

La lista real de lugares se incorporará más adelante.

---

## 21. Récord de Primera

Se corrigió la idea inicial de un récord absoluto único.

Debe haber dos récords independientes:

- **Primera Masculina**
- **Primera Femenina**

Cada uno conserva:
- pareja;
- máximo ELO;
- defensas asociadas;
- fecha del récord.

---

## 22. Liga continua

LA RED no tiene temporadas que reinicien nada.

El cambio de año no reinicia:

- ranking;
- ELO;
- rachas;
- deuda;
- récords;
- historial.

Los años pueden existir como filtros estadísticos, nunca como resets.

Zona horaria oficial:
`America/Argentina/Buenos_Aires`.

---

## 23. Legal y seguridad como parte del producto

Se reconoció que LA RED organiza una actividad deportiva real y debe tratar seguridad/legal como parte central del lanzamiento.

Al registrarse, el usuario debe aceptar de forma clara y versionada:

- Términos y Condiciones;
- reglas de participación;
- asunción informada de riesgos;
- Código de Conducta;
- Política de Privacidad;
- comunicaciones operativas por WhatsApp.

Principios:

- solo mayores de 18 años en la primera versión;
- pádel implica riesgos físicos propios de actividad deportiva;
- LA RED no publica ni solicita diagnósticos médicos;
- violencia, amenazas y conductas graves se tratan como disciplina individual y, si corresponde, por vías externas;
- ninguna cláusula debe intentar prometer una exención absoluta de responsabilidad;
- la versión final debe ser revisada por abogado argentino antes del lanzamiento;
- también debe evaluarse seguro de responsabilidad civil / accidentes deportivos adecuado al rol real de LA RED.

Este documento no sustituye asesoramiento legal profesional.

---

## 24. Dirección comercial

Se decidió **no definir LA RED como “sin fines de lucro”**.

La estrategia es:

- lanzar gratis para facilitar adopción;
- no prometer gratuidad permanente;
- convertir la comunidad y el volumen de partidos en valor comercial;
- negociar con canchas/sedes;
- en el futuro permitir reservar y pagar turnos desde LA RED;
- cobrar una comisión B2B a la cancha o sede por reservas originadas en la plataforma.

Ejemplo conceptual:
- jugador paga el turno;
- proveedor de pagos procesa;
- cancha recibe su parte;
- LA RED recibe su comisión.

La dirección técnica debe evitar que LA RED se convierta innecesariamente en custodio de fondos de terceros.

Futuras reglas de pago deberán contemplar:
- reserva;
- pago;
- cancelación;
- reintegro;
- políticas por sede;
- comisión;
- liquidación;
- facturación;
- chargebacks;
- precio final informado.

Antes de activar monetización habrá que revisar términos legales, tributarios y contractuales con profesionales locales.

---

## 25. Android, iPhone y web

LA RED debe pensarse como un mismo producto disponible en:

- web;
- Android;
- iPhone.

El motor, reglas, cuenta e historial son los mismos en todas las plataformas.

La experiencia puede evolucionar desde PWA/web hacia apps móviles, pero no deben existir motores competitivos distintos por plataforma.

---

## 26. Auditoría y explicabilidad

Cada acción importante debe dejar un evento:

- asignación;
- propuesta;
- aceptación;
- cambio de fecha;
- cambio de lugar;
- prórroga;
- no-show;
- resultado;
- penalización;
- movimiento de categoría;
- disciplina;
- verificación de identidad;
- acción administrativa.

El objetivo es que un jugador pueda entender “por qué pasó esto” y que administración pueda reconstruir los hechos sin tocar la base manualmente.

---

## 27. Filosofía que queda al final de este tramo

LA RED debe ser:

- competitiva sin ser arbitraria;
- autónoma sin ser opaca;
- simple para el jugador aunque internamente sea rigurosa;
- transparente en cada movimiento;
- segura con los datos;
- apta para crecer a negocio;
- útil tanto para quien juega como para quien sigue la liga;
- capaz de funcionar durante años sin depender de decisiones manuales constantes.

La conversación puede seguir evolucionando, pero este recorrido ya forma parte de la identidad del proyecto.
