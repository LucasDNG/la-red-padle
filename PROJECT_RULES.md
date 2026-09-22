# LA RED Pádel — Reglas funcionales definitivas

Este archivo es la **fuente de verdad funcional**. Código, base, frontend, tests y documentación deben coincidir con estas reglas.

## 1. Alcance
- Liga continua de pádel por parejas en San Pedro, Buenos Aires.
- Circuitos masculino y femenino.
- Categorías 1ª a 7ª, sin cupos máximos.
- No existen temporadas ni resets anuales.
- Zona horaria oficial: `America/Argentina/Buenos_Aires`.

## 2. Ranking
- La posición estructural manda.
- Si una pareja ubicada más abajo vence a una ubicada más arriba, intercambian posiciones.
- Si gana la que ya estaba arriba, no hay intercambio.
- No existe reordenamiento global por ELO, victorias o games.
- Principio: **Las estadísticas desempatan; no gobiernan el ranking. El ranking se conquista en cancha mediante intercambio de posiciones.**

## 3. Estadísticas y ELO
- Pareja con cero partidos oficiales: ELO 0.
- Pausada: ELO visible 0.
- Pareja activa con actividad: ELO posicional proporcional entre 2000 (#1) y 0 (última): `2000 × (N-pos)/(N-1)`. Si N=1, ELO base 2000.
- Solo #1 de Primera puede superar 2000: +1 por cada victoria oficial obtenida mientras ya era #1 y conserva la punta.
- Conquistar #1 deja base 2000 y no cuenta como defensa.
- Hay dos récords históricos independientes: Primera Masculina y Primera Femenina.

## 4. Ascenso y descenso
- #1 + 3 victorias consecutivas => asciende una categoría, salvo Primera.
- Ascendido entra al fondo del bloque activo de la categoría superior.
- Regla base: última pareja + 3 derrotas consecutivas => desciende, salvo 7ª.
- Válvula de equilibrio: si esa categoría tiene **5 o más parejas activas que la categoría inmediatamente inferior**, la última desciende con 2 derrotas consecutivas. Cuando la diferencia vuelve a ser menor a 5, el requisito vuelve automáticamente a 3.
- La válvula solo modifica el umbral de descenso; no altera ranking, ELO, rival, ascenso ni posición de entrada. No usa un tamaño objetivo fijo de categoría: compara únicamente categorías adyacentes.
- Descenso entra base #2 en la categoría inferior; la deuda empuja posiciones hacia abajo.
- Si la categoría inferior no tiene activos, entra #1.
- Deuda que no puede materializarse se conserva.
- La racha que provoca el movimiento se reinicia.

## 5. Categoría individual y categoría de pareja
- La pareja compite en la categoría individual más fuerte de sus dos jugadores; dos jugadores nuevos pueden elegir 1ª–7ª.
- Formar pareja con alguien más fuerte **no cambia automáticamente** la categoría individual del jugador arrastrado hacia arriba.
- Ascenso real de la pareja mejora la categoría individual de ambos al nuevo nivel.
- Descenso empeora la categoría individual de un jugador solo cuando la pareja cae por debajo de su nivel individual vigente.
- Al disolverse, cada jugador conserva su categoría individual real.

## 6. Identidad y acceso
- Registro: nombre, apellido, DNI, foto del frente y dorso del DNI, WhatsApp, contraseña y circuito.
- Login: DNI + contraseña.
- DNI único, privado y no público. El frente y dorso se usan únicamente para la verificación administrativa inicial.
- Cuenta nueva queda `pending` hasta verificación administrativa.
- Pendiente puede entrar, pero no formar pareja ni competir.
- DNI solo puede corregirse por administración y queda auditado.
- Las imágenes del DNI se purgan de la base activa al verificar o rechazar la identidad; no forman parte del perfil ni del historial deportivo.
- Recuperación de contraseña por código enviado al WhatsApp registrado.
- Cambio de WhatsApp valida el número nuevo y, cuando es posible, avisa al anterior.
- Primera versión competitiva: mayores de 18 años.

## 7. Formación de pareja
- Requiere invitación + aceptación.
- Una invitación saliente activa por jugador.
- Expira a los 10 días y puede cancelarse.
- La invitación muestra la categoría resultante.
- La base impide pertenecer a dos parejas competitivamente vigentes.
- La misma dupla reactivada reutiliza su identidad histórica; vuelve al fondo activo y conserva historial/deuda, pero no rachas corrientes.

## 8. Estados
### Competencia de pareja
- `active`: compite.
- `paused`: existe pero sale temporalmente de la rueda.
- `inactive`: disuelta/archivada.

### Disciplina
- Separada para pareja y jugador: `clear`, `observed`, `review`.
- Disciplina abierta bloquea nuevas asignaciones.
- Disciplina individual acompaña a la persona al cambiar de compañero.

## 9. Pausa
- Requiere confirmación de ambos integrantes.
- Sin compromiso abierto puede aplicarse al confirmarse.
- Con compromiso abierto existe `pausar al terminar este partido`.
- Pausa no cancela la obligación actual.
- Sale de la rueda, queda debajo del bloque activo y ELO visible 0.
- Conserva historial, categoría, deuda y rachas deportivas.
- Pausa voluntaria conserva `monthly_miss_streak`.
- Pausa automática tras dos incumplimientos atribuibles consecutivos inicia un ciclo nuevo al reactivar.
- Reactivación entra al fondo activo.

## 10. Disolución
- Puede iniciarla cualquiera.
- Si ambos confirman y no hay obligaciones, puede cerrarse inmediatamente.
- Si el otro no responde, existe salida a 7 días.
- Obligaciones abiertas se resuelven antes.
- Assignment sin jugar todavía abierto al vencer el plazo => derrota deportiva de la pareja que se disuelve, sin games inventados.
- Resultado ya cargado sigue su flujo normal.
- La disciplina no se borra por disolución.

## 11. Rueda automática
- Máximo un partido abierto por pareja.
- El sistema asigna rival automáticamente.
- Solo misma categoría y parejas habilitadas.
- Prioridad de rival: nunca enfrentado; luego cruce más antiguo.
- En categoría impar, tiene prioridad quien lleva más tiempo esperando.
- Sin rival elegible no corre reloj ni hay sanción.
- Desde la asignación hay 30 días corridos para **jugar y cargar** resultado.
- Resolver rápido libera inmediatamente para una nueva asignación.

## 12. Programación
- Una sola programación oficial vigente: día, hora y **lugar escrito libremente por los jugadores**.
- Proponer un partido no requiere que el lugar exista previamente en el catálogo de canchas de LA RED.
- El texto del lugar puede ser un club, complejo, cancha particular u otra referencia útil para coordinar; se limita a 160 caracteres.
- La mención escrita por un jugador **no crea una cancha adherida, no implica recomendación, patrocinio ni vínculo comercial con LA RED**.
- Una propuesta tiene 48 horas para responder.
- Aceptar la propuesta la convierte en programación oficial y la publica en Próximos partidos.
- Una nueva propuesta no borra la programación oficial anterior hasta que ambas acepten el cambio.
- Para atribuir unilateralmente un vencimiento al rival, la propuesta válida debe haberse hecho al menos 48 horas antes del vencimiento general.
- Propuestas posteriores siguen siendo válidas para acordar, pero no trasladan automáticamente toda la culpa.

## 13. Extensión extraordinaria
- Al vencer los 30 días se abre una ventana técnica de 48 horas únicamente para que ambas parejas confirmen una causa externa. Durante esa ventana no se habilita jugar/cargar salvo que la extensión quede activada.
- Una causa externa confirmada por ambas parejas permite una única extensión de 15 días.
- Si solo una la confirma, no se activa.
- No existe segunda extensión.
- Si la extensión vence sin resolución: ambas pierden una posición/deuda.
- Esa penalización no es derrota deportiva ni suma strike para pausa automática.
- Una caída comprobada de LA RED suspende/compensa plazos sin sancionar jugadores.

## 14. Incumplimientos
- Ninguna pareja coordinó: ambas pierden una posición/deuda.
- Una sola pareja hizo una propuesta válida con margen y la otra nunca respondió: penaliza solo la no respondiente.
- Ambas actuaron pero no resolvieron: ambas penalizadas.
- Si ya había programación oficial y vence sin resultado/no-show atribuible: ambas penalizadas.
- Penalización administrativa no cuenta como derrota deportiva.
- Dos incumplimientos atribuibles consecutivos => pausa automática.

## 15. No-show
- Solo puede reportarse después de la fecha/hora oficial.
- Pareja reportada tiene 48 horas para objetar.
- Silencio => incumplimiento atribuible a la reportada y penalización de posición/deuda.
- Objeción sin evidencia objetiva suficiente => ambas parejas reciben penalización operativa y el compromiso se cierra sin inventar resultado deportivo.
- No-show ordinario no requiere administración.

## 16. Resultados
- Cualquier integrante actúa en nombre de su pareja.
- Una pareja carga ganador, fecha real y resultado estructurado.
- La otra dispone de 15 días para confirmar o cargar su versión.
- Silencio => auto-validación de la única versión.
- Versión idéntica => confirmación automática.
- Versiones incompatibles => disputa administrativa real.
- Primera versión puede editarse hasta que el rival responda; editar no reinicia el plazo.
- Después de respuesta, versiones inmutables.
- Un resultado cargado bloquea nuevas asignaciones hasta cerrar.

## 17. Marcador
- Sets estructurados.
- Super tie-break debe marcarse como tal y solo puede reemplazar al tercer set.
- Sus puntos no cuentan como games.
- Resultado normal debe terminar 2-0 o 2-1.

## 18. Lesión / abandono
- Si el partido comenzó y una pareja abandona: tipo `LESIÓN / ABANDONO`.
- Se registra quién abandona.
- Rival obtiene victoria deportiva; abandonante derrota deportiva.
- No se cargan sets parciales ni games.
- Sí aplica escalera, rachas, ascenso/descenso y defensa de Primera.
- Sin penalización extra.
- No se publican diagnósticos médicos.

## 19. Disciplina
- Reportes: mala conducta, violencia, amenazas, negativa reiterada a coordinar, no-show, otro.
- Un compromiso abierto puede reportarse mientras siga abierto; tras cerrar, ventana ordinaria de 15 días.
- Mismo reporter contra mismo objetivo/assignment cuenta una vez.
- Rolling window de 180 días.
- 3 reporters distintos => `observed`.
- 5 => `review`.
- Violencia o amenazas => `review` inmediato para jugador o pareja.
- Una resolución registra `discipline_resolved_at`; hechos anteriores no reabren automáticamente el caso.

## 20. WhatsApp y notificaciones
- La app es la fuente oficial.
- WhatsApp es canal operativo principal.
- Eventos importantes del compromiso llegan a ambos integrantes de las parejas afectadas.
- Push móvil puede agregarse sin cambiar el motor.
- La outbox es idempotente y reintenta fallos.
- Mensajes comerciales futuros se separan de los operativos.
- El teléfono del rival solo se utiliza/expone mientras existe un compromiso abierto.

## 21. Público
- Ranking, resultados, próximos partidos confirmados, perfiles deportivos y récords de Primera.
- Perfil: jugadores, categoría, posición, ELO, partidos, victorias, resultados e historia deportiva.
- No se publican DNI, teléfono, mensajes, reportes, disciplina ni datos médicos.
- Pausa puede mostrarse como estado neutro; nunca su motivo.

## 22. Canchas y negocio
- El **lugar de un partido** y una **cancha adherida a LA RED** son conceptos separados.
- Los jugadores escriben libremente el lugar al coordinar. Ese texto no crea ni modifica una ficha comercial.
- Las canchas administrables por LA RED son una capa comercial separada: alta, edición, activa/inactiva, adherida, Instagram/web, reservas futuras y orden de aparición.
- Solo una cancha marcada explícitamente por administración como **adherida** y activa puede mostrarse públicamente en la sección de sedes adheridas.
- Una cancha mencionada por jugadores nunca se convierte automáticamente en sede adherida.
- Desactivar una ficha comercial no borra historial ni programaciones ya confirmadas.
- LA RED no se define como “sin fines de lucro” ni promete gratuidad permanente.
- Etapa inicial puede ser gratuita para jugadores.
- Evolución prevista: acuerdos comerciales con sedes, reservas/pagos de cancha y comisión mediante proveedor de pagos adecuado.
- La capa comercial nunca altera resultados, rueda o ranking.

## 23. Administración
Administración es una cola de excepciones, no operación diaria.

Interviene en:
- verificación/corrección de identidad;
- disputa real de resultado;
- disciplina;
- canchas;
- auditoría/correcciones excepcionales;
- pausa global de relojes por incidente general.

No interviene en asignaciones, vencimientos, sanciones deterministas, auto-validación, pausa automática, ascensos/descensos o coordinación ordinaria.

## 24. Seguridad y auditoría
- Acciones importantes generan eventos.
- Acciones admin quedan auditadas con quién/cuándo/qué.
- Admin usa sesión más corta y TOTP cuando se configura.
- Rol admin se valida contra DB en cada endpoint.
- Login/registro/recuperación tienen rate limiting básico.
- Backups/PITR de la base son requisito operativo.
- Código competitivo debe ser idempotente ante retries/concurrencia.

## Administración final
- El primer propietario se promueve desde consola; no existe registro público de administradores.
- Admin verifica identidad, resuelve disputas reales, disciplina, canchas, correcciones y contingencias del sistema.
- Admin no aprueba la formación de una pareja: la invitación y aceptación pertenecen a los dos jugadores.
- Toda acción administrativa sensible queda auditada.


## Acceso administrativo privado
- El login de jugadores no muestra ni acepta código de administrador.
- Las cuentas `admin` no pueden autenticarse por el endpoint normal de jugadores.
- El ingreso administrativo usa `/admin-la-red` en frontend y `/api/auth/admin-login` en backend.
- La ruta privada no se enlaza desde ninguna pantalla pública.
- Conocer la ruta no otorga acceso: siguen siendo obligatorios rol Admin, contraseña y TOTP cuando está configurado.


## Reenvío de DNI
- Una foto borrosa/cortada/incorrecta no rechaza automáticamente la cuenta.
- Admin dispone de `PEDIR NUEVAS FOTOS` con un motivo breve.
- Al pedir reenvío, las imágenes anteriores se eliminan de la base activa y la cuenta sigue `pending`.
- El jugador recibe aviso in-app y WhatsApp cuando esté configurado.
- El jugador reenvía frente + dorso desde `Mi cuenta`; no crea otra cuenta ni cambia DNI.
- Mientras la identidad esté `pending`, el propio jugador puede reemplazar voluntariamente ambas fotos antes de la revisión final.
- `RECHAZAR CUENTA` queda reservado para una identidad que no corresponde o una cuenta que no debe habilitarse.


## 25. Gobernanza de cambios
- Los `.md` son la memoria oficial del producto.
- Un cambio de regla exige actualizar `PROJECT_RULES.md`, `DECISIONS.md` y los tests correspondientes.
- Un bug real descubierto en recorrido se registra en `AUDIT_2026-09-20.md`.
- La evolución/razón del cambio se registra en `PROJECT_JOURNEY.md`.
- Antes de un bloque grande nuevo se hace checkpoint/push para no depender del contexto del chat.
- No se reintroducen módulos legacy ni reglas reemplazadas para resolver un bug local.

## 26. Estado de infraestructura de este checkpoint
- La instalación activa de desarrollo usa una Neon nueva.
- La Neon histórica fue eliminada accidentalmente y no debe asumirse disponible como backup.
- El target de runtime es Node 22 aunque una parte de las pruebas locales se haya realizado con Node 24.
- Antes de producción se debe normalizar Node 22, SSL, backups/PITR, TOTP y WhatsApp.
