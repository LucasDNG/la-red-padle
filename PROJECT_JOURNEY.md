# LA RED Pádel — El camino hasta la versión final

LA RED empezó como una liga con desafíos manuales y fue transformándose al detectar contradicciones reales: múltiples compromisos simultáneos, reglas 30/90, ELO mezclado con ranking, estados de disciplina y competencia superpuestos, resultados fuera de orden y demasiada intervención administrativa.

La conclusión fue construir una liga **autónoma, explicable y continua**.

El ranking se convirtió en una escalera: la posición se gana en cancha. La rueda dejó de depender de que alguien desafíe. Cada pareja tiene un solo compromiso, un reloj claro y un rival asignado por variedad histórica. La coordinación se volvió estructurada, pero WhatsApp sigue siendo el canal humano natural.

La identidad pasó a ser seria: DNI único, verificación antes de competir, privacidad estricta y recuperación por WhatsApp. La pareja dejó de poder formarse unilateralmente y apareció la diferencia entre categoría individual y categoría temporal de la dupla.

También se separó la disciplina de la competencia. Una persona no puede “lavar” una conducta cambiando de compañero. Una pausa no borra historia ni obligaciones. Una disolución tampoco.

La experiencia se centró en una pregunta: **“¿Qué me toca hacer ahora?”**. Las reglas importantes se explican en el momento en que afectan al jugador.

Más adelante apareció el horizonte comercial: primero comunidad y adopción; luego acuerdos con canchas, reservas y pagos. Esa capa se diseñó separada del motor deportivo para que monetizar nunca cambie quién ganó ni quién ocupa una posición.

La parte legal también pasó a formar parte del producto: mayores de 18, aceptación versionada, riesgos deportivos, conducta, privacidad, WhatsApp, auditoría y revisión profesional antes del lanzamiento.

Finalmente se decidió dejar de apilar migraciones sobre el runtime histórico y reconstruir LA RED de forma limpia. La versión final conserva el aprendizaje, no la deuda técnica: un único `wheel-v2`, un único esquema PostgreSQL, un frontend/PWA único, tests, CI y documentación consolidada.

A partir de esta versión, cualquier cambio futuro debe modificar en el mismo commit: regla vigente, implementación, tests y documentación.


## Recuperación de la identidad visual final

Durante la reconstrucción limpia se detectó una regresión visual: el primer frontend consolidado conservaba la funcionalidad nueva, pero había reemplazado el diseño aprobado por un layout genérico y había dejado afuera los assets de identidad ya seleccionados.

La corrección no revierte el motor nuevo. Se mantiene `wheel-v2`, sus rutas, DNI, rueda, resultados, perfiles, próximos partidos, administración y seguridad; solamente se vuelve a colocar por encima la identidad visual que el proyecto ya había alcanzado.

Queda nuevamente como sistema visual oficial:
- cancha real de pádel nocturna como hero;
- azul marino, azul eléctrico y verde brillante;
- transparencias/glassmorphism;
- encabezado y espaciados responsive;
- tarjeta Top 10;
- bloques públicos de cartelera, resultados y récords;
- assets PWA aprobados.

Regla de trabajo: una reconstrucción técnica no autoriza a rediseñar silenciosamente la identidad visual aprobada. Backend/reglas y presentación deben evolucionar sin destruirse entre sí.


## Verificación documental de identidad

Durante el recorrido real del alta se detectó que la cuenta pedía el número de DNI pero no permitía adjuntar frente y dorso. Se corrigió el flujo para que la verificación administrativa tenga evidencia suficiente sin convertir la documentación en un dato permanente.

La decisión final equilibra identidad y privacidad: se solicita frente + dorso, administración los revisa y las imágenes se eliminan automáticamente al cerrar la verificación. El número de DNI continúa como usuario único de acceso.

## Administración operativa final
Al recorrer el alta real se detectó que existía lógica administrativa pero faltaba cerrar el acceso práctico del propietario y hacer visible el panel como producto. Se consolidó el bootstrap del primer admin, la auditoría visible y el tablero de excepciones. La autonomía deportiva se mantiene: el administrador no reemplaza el consentimiento de los jugadores ni el motor competitivo.


## Entrada administrativa separada

Durante la primera prueba del propietario se detectó que el formulario público mostraba un campo “Código admin”, exponiendo innecesariamente la existencia del acceso administrativo. Se separó completamente el ingreso: el jugador ve solo DNI + contraseña y la administración entra por una ruta reservada no enlazada. El backend también separa ambos endpoints para impedir que una cuenta Admin use el login público.


## Corrección de navegación Login / Registro

En la prueba manual del alta apareció un bug propio de navegación SPA: cambiar entre `/ingresar` y `/ingresar?registro=1` modificaba la URL pero no siempre el formulario porque React mantenía montado el mismo componente. Se corrigió sincronizando el estado visual con `location.search`, de modo que header, botón interno, historial del navegador y recarga muestran siempre el modo correcto.


## Orden visual de todas las pantallas

Las pruebas reales mostraron que conservar los colores y el hero no era suficiente: varias pantallas nuevas de `wheel-v2` seguían pareciendo formularios técnicos. Se hizo una pasada transversal de diseño para dar un mismo ritmo a toda LA RED: títulos con aire, cards separadas, textos legibles, secciones reconocibles y acciones con jerarquía.

La regla queda fijada: una pantalla funcional no se considera terminada si el usuario no puede entender visualmente qué bloque está leyendo, qué sigue y cuál es la acción principal.


## Reenvío de documentación de identidad

Al probar la revisión real apareció un caso cotidiano que faltaba modelar: una foto puede estar borrosa, cortada o mal tomada sin que la identidad sea inválida. Se separó entonces “pedir nuevas fotos” de “rechazar cuenta”.

Admin puede pedir un reenvío con motivo; LA RED elimina las imágenes anteriores, mantiene la cuenta pendiente y avisa al jugador. El usuario vuelve a cargar frente y dorso desde Mi cuenta, sin registrarse nuevamente.


## Integración del reenvío documental

La prueba local encontró un error que la validación de sintaxis aislada no detectaba: una ruta nueva importaba una función todavía no exportada. A partir de este hallazgo, el release incorpora también un control estático de imports/exports relativos entre módulos del backend.


## Verificación real de identidad y tipado PostgreSQL

La prueba administrativa encontró un error de tipado que no aparecía en los tests puros: reutilizar el mismo parámetro SQL para una columna `varchar` y una comparación con literal `text` hacía que PostgreSQL rechazara la consulta. Se separó la decisión booleana de “es verificación” del valor textual del estado y se reforzó la transacción completa.


## Primer checkpoint de estabilización real

Después de reconstruir LA RED se hizo una primera recorrida manual como usuario y como propietario. Esa recorrida fue deliberadamente más valiosa que seguir agregando funciones: expuso fallas de identidad, navegación, estilos, acceso Admin, integración de módulos y tipado SQL.

El circuito **registro → documentación → Admin → verificación** finalmente quedó funcionando de punta a punta. En este punto se decidió frenar los cambios, pushear y fijar la memoria del proyecto en `.md` antes de entrar al corazón deportivo.

La próxima etapa no es “seguir construyendo por construir”; es buscar inconsistencias y bugs de forma ordenada empezando por **pareja → rueda → programación → resultado → ranking**.

## Ajuste longitudinal de descenso
Después del primer push limpio se dejó de depender de pruebas manuales largas y se empezó a simular años completos. La regla 3/3 mostró una deriva de población hacia arriba. Se consideró bajar con 5 derrotas, pero el cálculo de rachas demostró que cinco consecutivas harían el descenso mucho más raro. Se adoptó una válvula más conservadora: 3 derrotas por defecto y 2 únicamente cuando la categoría superior inmediata acumula una diferencia de cinco o más parejas activas sobre la inferior.


## Validación longitudinal ampliada
La primera válvula de equilibrio no se dio por buena solo por una corrida a 20 años. Se amplió el modelo para medir 5/10/20 años, conservar las mismas semillas y comparar alternativas de ascenso/descenso. La hipótesis de cinco derrotas quedó descartada con matemática de rachas y Monte Carlo; endurecer el ascenso a cuatro victorias mostró la sobrecorrección opuesta. Entre gaps 4/5/6, el gap 5 vigente quedó como el compromiso más estable a largo plazo. La regla no cambió: cambió la calidad de la evidencia y quedaron regresiones automáticas para impedir que una futura edición reintroduzca la deriva.


## Cierre automatizado del corazón deportivo
La estabilización dejó de depender de recorridas manuales largas. El ciclo pareja → rueda → programación → resultado → ranking → movimiento de categoría → vencimientos → pausa/disolución quedó cubierto por PostgreSQL real en CI, incluyendo concurrencia e idempotencia. Los tests automáticos encontraron y corrigieron problemas que una simulación pura no podía revelar: orden de locks, posiciones transitorias, atribución tardía, ventana de extensión, strikes de no-show y ELO stale al pausar.

El checkpoint alcanza 20/20 tests puros y 29/29 tests PostgreSQL en Node 22/PostgreSQL 16. Desde aquí el trabajo cambia de foco: hardening de módulos laterales y operación real, seguido por smoke UX en vez de años de liga manuales.


## Hardening lateral automatizado
Después de cerrar el corazón deportivo, se extendió el gate a disciplina, pausa global del reloj, deduplicación de notificaciones/WhatsApp, TOTP y coherencia de identidad. También se convirtió `database/verify.sql` en un gate ejecutable sobre una base de prueba reconstruida desde cero, evitando depender de inspección manual del schema.

El checkpoint alcanza 20/20 tests puros, 35/35 integración PostgreSQL, `verify:db` y frontend build verdes. Desde aquí lo pendiente es principalmente configuración y operación real de producción más smoke UX/legal.
