# LA RED Pádel — Historial de decisiones

`PROJECT_RULES.md` contiene únicamente las reglas vigentes. Este archivo registra cómo fueron cambiando.

## 2026-09-20

### Categorías ilimitadas

Se eliminan todos los cupos máximos. 1ª a 7ª admiten cualquier cantidad de parejas.

### Categoría vigente individual

- Nuevo + nuevo: eligen categoría.
- Si alguno posee categoría vigente, manda el nivel actual más fuerte.
- No se usa la mejor categoría histórica.

### Parejas archivadas

Una pareja disuelta pasa a `inactive`; conserva historial. No transfiere ELO, posición ni rachas.

### Onboarding

Después del registro: `FORMAR PAREJA` / `MÁS TARDE`. La gestión de pareja debe estar centralizada desde `MI LIGA`.

### Ranking por escalera

Se reafirma que el corazón del ranking no son las estadísticas acumuladas: una pareja de abajo que vence a una de arriba intercambia posición con ella. Si gana la que ya estaba arriba, no hay intercambio.

Principio textual aprobado:

> **Las estadísticas desempatan; no gobiernan el ranking. El ranking se conquista en cancha mediante intercambio de posiciones.**

Los criterios de victorias, diferencia de games y antigüedad son auxiliares y no reordenan globalmente la escalera.

### Corrección sobre parejas nuevas

Se elimina como regla general la idea de que una pareja que juega su primer partido deba saltar automáticamente por encima de todas las parejas sin partidos.

Motivo: ese ajuste puede destruir una posición conquistada legítimamente en cancha. Las parejas nuevas siguen con ELO 0 hasta tener actividad, pero la escalera estructural no se reordena automáticamente por el simple hecho de disputar el primer encuentro.

### ELO posicional

No se usa ELO clásico tipo K-factor. El ELO acompaña la posición y puede usar decimales. Varias parejas pueden compartir ELO 0 y no existe una obligación absoluta de unicidad numérica.

La fórmula proporcional exacta queda abierta a validación final. La fórmula hoy implementada en la versión candidata es una implementación provisional, no una decisión funcional irreversible.

### Defensas del #1 de Primera

Solo el #1 de Primera puede superar 2000. Cada victoria obtenida mientras ya era #1 y conserva la punta suma +1. Conquistar la punta no cuenta como defensa.

El máximo histórico de Primera queda guardado permanentemente y se mostrará en la portada.

### Ascenso y descenso

- #1 + 3 victorias consecutivas => ascenso.
- Último + 3 derrotas consecutivas => descenso.
- La cantidad de parejas por categoría no afecta la regla.
- La pareja que desciende no entra por encima del líder de la categoría inferior.
- Entrada base del descenso: #2; la deuda de posición la empuja más abajo.

Quedan pendientes la posición definitiva de entrada al ascender y el caso de una categoría inferior completamente vacía.

### Penalización de posición y deuda

Las sanciones competitivas relevantes se expresan en puestos, no en `-10 ELO`.

- Si hay un puesto inferior disponible, la pareja baja un lugar.
- Si ya está última, acumula deuda de posición.
- La deuda se utiliza al descender para determinar una entrada más baja en la categoría inferior.
- Una penalización no equivale a derrota deportiva.

### Se descarta el modelo de múltiples desafíos simultáneos 30/90

Se reemplaza el modelo previamente implementado de:

- 30 días para aceptar;
- 90 días después de aceptar para jugar;
- múltiples desafíos aceptados simultáneamente.

La nueva dirección funcional es una **rueda competitiva con un solo partido abierto por pareja**.

### Rueda competitiva mensual

- La rueda asigna un rival automáticamente.
- Cada pareja puede tener un solo partido de rueda abierto.
- Hay 30 días corridos desde la asignación para jugar y cargar resultado.
- Los 30 días son plazo máximo, no frecuencia mínima ni máxima.
- Si un partido se resuelve enseguida, la pareja puede recibir otro rival inmediatamente y jugar nuevamente al día siguiente o incluso el mismo día.

### Incumplimiento mensual

Al vencer los 30 días sin partido:

- si una pareja fue responsable y la otra cumplió, baja un puesto solo la incumplidora;
- si ninguna hizo acciones válidas para jugar, bajan ambas;
- si una sancionada ya está última, acumula deuda.

La atribución objetiva de responsabilidad todavía debe definirse mediante señales de coordinación y/o administración.

### Pausa competitiva

Se crea conceptualmente `paused`, separado de `inactive`.

`paused` significa que la pareja sigue existiendo pero sale temporalmente de la rueda. Pasa al fondo de la categoría, muestra ELO 0, conserva categoría e historial y no sigue recibiendo sanciones mensuales mientras está pausada.

Dos incumplimientos mensuales consecutivos atribuibles a la misma pareja provocan pausa automática. Un cumplimiento posterior corta la secuencia de incumplimientos consecutivos.

También debe existir pausa voluntaria para viajes, vacaciones u otras ausencias previstas.

### Confirmación de resultados y orden cronológico

Se adopta un bloqueo estricto: una pareja no recibe otro partido de rueda mientras el resultado del anterior esté pendiente o disputado.

Flujo acordado:

- una pareja carga resultado;
- la otra tiene 15 días para confirmar u objetar;
- si confirma, se oficializa de inmediato;
- si no responde en 15 días, el único resultado cargado se auto-valida;
- si ambas versiones son incompatibles, el caso pasa a administración;
- mientras exista disputa, ambas parejas permanecen bloqueadas.

Esta regla evita que resultados viejos se confirmen después de partidos nuevos y alteren retrospectivamente el orden competitivo.

### Bandeja administrativa de disputas

Una discrepancia de resultados debe generar un caso visible para administración. El administrador debe poder comparar ambas versiones y decidir cuál validar o rechazar ambas.

No se exige por ahora una notificación externa por WhatsApp/email; la bandeja interna es suficiente como primera implementación.

### Marcadores estructurados

Se detectó que un marcador libre como `6-4 3-6 10-8` puede interpretar incorrectamente un super tie-break como games normales.

Por lo tanto, la diferencia de games oficial requiere un formato estructurado o reglas explícitas de parsing antes de considerarse confiable.

### Auditoría de bugs posterior al push `0c8b7764`

Se identificaron como problemas a corregir:

1. duplicación/spam de desafíos activos entre las mismas parejas;
2. compromisos que pueden sobrevivir a cambios de categoría;
3. reordenamiento incorrecto de una pareja después de su primer partido;
4. resultados pendientes que podían quedar congelados indefinidamente;
5. resultados confirmados fuera de orden cronológico;
6. `src/index.js` y otras rutas todavía conectadas al mantenimiento antiguo;
7. `GET /ranking` recalculando/escribiendo demasiado en cada lectura;
8. textos y componentes viejos con reglas ya reemplazadas;
9. marcador no validado/estructurado;
10. parseo incorrecto potencial de super tie-break;
11. denuncias sin límite temporal respecto del hecho;
12. coexistencia de demasiado motor competitivo viejo y nuevo.

La rueda única y el bloqueo por resultado resuelven conceptualmente varios de estos puntos, pero todavía deben implementarse y simularse.

### Documentación como fuente de verdad

Se mantienen:

- `PROJECT_RULES.md`
- `DECISIONS.md`
- `TEST_SCENARIOS.md`
- `CHECKPOINT_2026-09-20.md`

como referencia obligatoria antes de continuar el desarrollo competitivo.

### Separación definitiva de estado competitivo y disciplinario

Se decide no reutilizar una sola columna para ambas cosas. Competencia (`active/paused/inactive`) y disciplina (`clear/observed/review`) son dimensiones distintas. Cualquier disciplina abierta bloquea la rueda hasta resolución administrativa sin borrar la posición estructural.

### Disolución bloqueada con compromiso abierto

Una pareja no puede desarmarse por autoservicio para hacer desaparecer un partido o resultado pendiente. Mientras exista un compromiso de rueda o un resultado `pending/disputed`, debe cerrarse primero o intervenir administración.

### Dos versiones reales del resultado

Una objeción deja de ser solo una nota. Cada pareja puede registrar su propia versión completa (ganador, fecha jugada y marcador). Si son incompatibles se conservan ambas y administración elige cuál validar o cierra el caso sin resultado.

### Fecha jugada

`matches.played_at` representa la fecha real del partido. La fecha de carga/confirmación se conserva por separado y no debe reemplazarla.

### Rueda por antigüedad del cruce

La selección definitiva prioriza: nunca enfrentados; luego el cruce cuya última fecha es más antigua. Para categorías impares se atiende primero a la pareja que más tiempo lleva libre, de modo que el descanso rote y no exista starvation. No tener rival disponible nunca cuenta como incumplimiento.

### Pausa: decisiones técnicas cerradas

La deuda de posición y las rachas deportivas sobreviven a una pausa. El contador de incumplimientos mensuales se reinicia al reactivar. Las pausadas permanecen debajo del bloque activo; altas/reactivaciones entran al fondo del bloque activo. La pausa voluntaria por autoservicio no puede activarse con compromiso abierto.

### Disciplina persistente

Los umbrales de 180 días pueden abrir/escalar disciplina, pero un estado disciplinario abierto no se borra automáticamente al envejecer una denuncia. Administración debe resolverlo. Mientras tanto no hay nuevos partidos de rueda.

### Calidad técnica a cargo del sistema

Se decide resolver como requisitos técnicos internos: restricciones de base para denuncias, prevención de duplicados concurrentes, tests automáticos del motor y demás invariantes de integridad. No requieren decisiones operativas del usuario salvo que cambien una regla deportiva.


### Autonomía administrativa como principio de diseño

Se fija como objetivo que administración intervenga únicamente en excepciones no deterministas. Asignaciones, vencimientos, penalizaciones, auto-validación, pausas automáticas, movimientos y estadísticas deben resolverse sin intervención humana.

### Consentimiento para formar pareja

Seleccionar a otro jugador ya no debe crear unilateralmente una pareja. El flujo final usa invitación + aceptación. La base debe impedir doble pertenencia concurrente. Si exactamente los mismos dos jugadores vuelven a jugar juntos tras haber archivado su pareja, se reactiva esa identidad histórica en vez de crear una identidad paralela.

### Coordinación objetiva de la rueda

Las propuestas y respuestas de fecha/hora se registran dentro de la app. Esto permite resolver la mayoría de los vencimientos de 30 días sin administrador: ninguno actuó => ambos incumplen; solo uno actuó y el otro nunca respondió => incumple el no respondedor; ambos actuaron pero no acordaron/jugaron => incumplen ambos.

Los no-show sobre una fecha acordada tienen una ventana breve de contestación. Solo una contradicción real pasa a administración.

### Pausa programada después del compromiso

Se incorpora `pausar al terminar este partido`. No cancela ni altera el compromiso actual y evita que la rueda asigne uno nuevo inmediatamente después. Resuelve viajes/vacaciones planificados sin crear una vía de escape.

Una pausa voluntaria no borra un incumplimiento mensual previo. La pausa automática por dos incumplimientos sí inicia un nuevo ciclo de contador al reactivar.

### Disciplina sin reapertura automática

Al resolver un caso disciplinario se registra un punto de corte (`discipline_resolved_at`). Los umbrales futuros se calculan con hechos posteriores a esa resolución, conservando el historial pero evitando que el mismo conjunto de denuncias reabra el caso inmediatamente.

Una pareja con disciplina abierta tampoco puede disolverse por autoservicio para escapar del caso.

### Ascenso, descenso vacío y ELO en pausa

- El ascendido entra al fondo del bloque competitivo activo de la categoría superior.
- Si la categoría inferior está completamente vacía de parejas activas, una pareja descendida entra #1 porque no desplaza a nadie.
- Las parejas `paused` quedan fuera del denominador del ELO y muestran 0.
- Las parejas competitivamente `active` siguen dentro del bloque/ELO aunque tengan disciplina temporalmente bloqueada.
- Se reemplaza la idea de un récord absoluto único: Primera Masculina y Primera Femenina tienen récords históricos independientes.

### Resultado y marcador

La primera versión de resultado puede corregirse hasta que responda el rival, sin reiniciar el reloj de 15 días y dejando auditoría. Si administración rechaza ambas versiones, la asignación se cierra `void`: no crea partido ni sanción deportiva automática.

Los nuevos marcadores se guardan estructurados; un super tie-break se identifica como tal y no suma sus puntos a la diferencia de games.

### Récord de Primera separado por circuito

Se corrige la decisión anterior de un récord absoluto único. Existen dos récords históricos permanentes: Primera Masculina y Primera Femenina. Cada uno guarda su propia pareja, máximo ELO y defensas. La portada muestra ambos por separado.

### Cartelera pública de próximos partidos

La web incorpora una cartelera pública. Un compromiso solo aparece cuando ambas parejas acordaron fecha, hora y lugar. La aceptación de la segunda pareja publica/actualiza automáticamente el partido; no requiere aprobación administrativa. La cartelera no expone contactos ni notas privadas.

### Lugares administrables

Los lugares/canchas se gestionan desde administración y no quedan codificados en el frontend. Administración puede agregar, editar y retirar de disponibilidad. Si un lugar ya tiene historial se archiva en vez de borrarse físicamente. Puede marcarse como sede asociada/recomendada para acuerdos comerciales.

Una desactivación impide nuevas selecciones pero no borra ni cambia silenciosamente partidos históricos o programaciones ya confirmadas.


### Ronda de producto: autonomía, identidad y UX

Se incorporan como decisiones vigentes:

- WhatsApp como canal fundamental de notificación; LA RED sigue siendo la fuente oficial.
- `MI LIGA` se diseña alrededor de “¿Qué me toca hacer ahora?”.
- La liga es continua y no se reinicia por año.
- Zona horaria oficial: `America/Argentina/Buenos_Aires`.
- Registro con DNI único; login con DNI + contraseña; verificación administrativa previa a competir.
- Recuperación de contraseña y cambio de teléfono mediante validación por WhatsApp; DNI modificable solo por administración con auditoría.
- Invitación de formación de pareja única, cancelable y con vencimiento de 10 días.
- El teléfono/WhatsApp del rival solo está disponible mientras existe el compromiso abierto.
- Dentro de los 30 días se pueden cambiar fecha/hora/lugar por acuerdo mutuo sin consumir prórroga; la última programación confirmada sigue vigente hasta que ambos acepten otra.
- Al vencer los 30 días, una causa externa confirmada por ambas parejas habilita una única extensión extraordinaria de 15 días.
- Si la prórroga extraordinaria también vence sin resolución, ambas parejas pierden una posición/deuda; no cuenta como derrota deportiva ni como falta para pausa automática.
- No-show: 48 horas para objetar. Silencio => incumplimiento atribuible; contradicción operativa no debe frenar la liga y se resuelve por penalización de posición según regla automática.
- Resultado `LESIÓN / ABANDONO`: victoria/derrota deportiva normal, sin sets parciales, sin games y sin penalización extra.
- La pausa voluntaria requiere a ambos; la disolución puede iniciarla cualquiera y se resuelve en hasta 7 días, sin borrar obligaciones.
- Una asignación todavía sin jugar que siga abierta al cumplirse el plazo de disolución se resuelve como derrota deportiva de la pareja que se disuelve; un resultado ya cargado sigue su flujo normal.
- Formar pareja con alguien de categoría más fuerte no cambia automáticamente la categoría individual del jugador arrastrado. Solo movimientos deportivos reales cambian categorías individuales.
- Disciplina individual y disciplina de pareja son dimensiones separadas; la individual sigue al jugador al cambiar de compañero.
- Historial explicativo, perfiles deportivos y microexplicaciones pasan a ser parte de la experiencia obligatoria.
- Las acciones administrativas importantes quedan auditadas y, cuando sea seguro, son corregibles sin editar la base manualmente.


### Legal, seguridad y modelo comercial futuro

Se decide que la capa legal y de seguridad forma parte obligatoria del producto, no del acabado final.

- Primera versión: mayores de 18 años.
- Registro con aceptación versionada de términos, riesgos, conducta, privacidad y WhatsApp.
- No se intentará una renuncia absoluta de responsabilidad.
- La versión final será revisada por abogado argentino antes del lanzamiento.
- Se evaluará seguro de responsabilidad civil/accidentes deportivos.
- No se almacenarán diagnósticos médicos.
- LA RED no se definirá como “sin fines de lucro” ni prometerá gratuidad permanente.
- La etapa inicial puede ser gratuita para adopción.
- Dirección comercial futura: acuerdos con canchas, reservas/pagos desde LA RED y comisión B2B a sedes.
- La arquitectura debe evitar custodiar fondos de terceros innecesariamente y deberá apoyarse en un proveedor de pagos apropiado.
- Antes de monetizar: revisión legal, contable, tributaria y contractual.

### Producto multiplataforma y notificaciones

LA RED se diseña como el mismo producto en web, Android e iPhone.

WhatsApp es canal operativo principal y los eventos relevantes de la pareja se notifican a ambos integrantes. Las apps móviles podrán sumar push, sin cambiar la fuente oficial ni el motor competitivo.

### El recorrido del proyecto se documenta

Se crea `PROJECT_JOURNEY.md` para conservar la evolución, problemas descubiertos, principios y decisiones que forman parte del camino de LA RED.
