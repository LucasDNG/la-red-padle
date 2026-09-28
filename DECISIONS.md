# LA RED Pádel — Decisiones vigentes

Este archivo contiene **solo decisiones que siguen vigentes**. Las decisiones reemplazadas se documentan en `PROJECT_JOURNEY.md`.

> **Wheel v3 — 2026-09-28:** el diseño funcional nuevo está consolidado en `WHEEL_V3_SPEC.md`. El código productivo continúa en `wheel-v2` hasta cerrar las preguntas abiertas, escribir tests/simulaciones e implementar la migración.

## Ranking y competencia

1. La posición estructural dentro de la categoría es el único ranking competitivo.
2. No existe una puntuación numérica paralela al puesto.
3. Si una pareja ubicada abajo vence a una ubicada arriba en un partido real, intercambian posiciones; el resto no se reordena globalmente.
4. La rueda ordinaria es automática; no existe un flujo normal de buscar rival, desafiar y esperar aceptación.
5. Cada pareja puede tener como máximo un compromiso abierto.
6. El assignment da 30 días corridos para jugar y cargar una primera versión de resultado.
7. No existe extensión extraordinaria de 15 días en Wheel v3.
8. Si el resultado fue cargado dentro del plazo, existe una ventana adicional de 7 días solo para confirmar o discutir esa versión; el detalle final está pendiente de una confirmación de borde en la spec.
9. La selección Wheel v3 usa roles ataque/defensa, prioridad por tiempo sin partido real y ventanas crecientes hacia arriba para el atacante.
10. La repetición de rival se evita cuando existe alternativa, pero nunca debe bloquear la rueda.
11. La fase de formación termina cuando las 7 categorías del circuito alcanzan el mínimo acordado de parejas activas; el alcance exacto por circuito está pendiente de confirmación.
12. Después de la formación, la población activa puede modificar el requisito deportivo 3/2/1, pero la población por sí sola nunca mueve una pareja.
13. Todos los ascensos/descensos entre categorías son adyacentes.
14. Una pareja que desciende entra normalmente #2 en la categoría inferior; si no existe #1 material, entra #1.
15. En 7ª no existe zona/período de descenso.

## Récord histórico de Primera

16. El único récord deportivo histórico especial es la cantidad de defensas exitosas del puesto #1 de Primera.
17. Masculino y Femenino tienen récords separados.
18. Una defensa exitosa exige que la pareja ya sea #1 de Primera, dispute una defensa y conserve el #1.
19. La sección pública histórica se dedica únicamente a este récord.
20. No se muestra un historial estadístico acumulado de partidos/victorias/derrotas por pareja.
21. El jugador puede ver hasta los últimos 5 movimientos reales de ranking/categoría, con fecha y explicación simple.

## Inactividad

22. Una pareja puede avisar que quiere pasar a inactiva.
23. Si ya tiene un partido asignado, primero debe resolverse la situación de ese compromiso.
24. No está obligada físicamente a jugar: si decide no disputar el compromiso, primero se aplica la consecuencia deportiva correspondiente y después pasa a inactiva.
25. La nueva regla indica intercambio de posición con el rival en ese cierre; la semántica exacta para evitar que un atacante se beneficie incumpliendo queda abierta en `WHEEL_V3_SPEC.md`.
26. Una vez inactiva no recibe assignments.
27. Una inactiva no participa del balance ataque/defensa ni del cálculo de población activa.
28. La inactividad por sí sola no genera castigos periódicos, pérdida mensual de puestos ni descenso de categoría.
29. La antigua regla de perder puestos por meses de inactividad queda eliminada.
30. Puede conservarse técnicamente `paused` como inactividad temporal y `inactive` como disolución/archivo si eso simplifica la migración; en la interfaz del jugador se usa “inactiva”.
31. La posición exacta al reactivar y el tratamiento de un período de descenso previo siguen abiertos en la spec.

## No-show, incumplimientos y resultados

32. `No pude jugar` permite reconocer un incumplimiento sin esperar a que venzan los 30 días.
33. Una victoria administrativa no cuenta como victoria real para ascenso ni para salir de período de descenso.
34. Solo un partido real reinicia la antigüedad de “hace cuánto no juega”.
35. Un no-show reconocido expresamente por la pareja reportada se resuelve inmediatamente; no espera las 48 horas.
36. Un no-show unilateral no reconocido o contradicho pasa a Administración después de la ventana de reconsideración acordada.
37. Una disputa real de resultado requiere intervención administrativa.
38. Lesión/abandono conserva un tratamiento deportivo especial sin inventar games; su efecto exacto sobre zonas Wheel v3 está pendiente de confirmación.

## Parejas y categorías individuales

39. Formar pareja requiere invitación + aceptación; Admin no aprueba parejas.
40. Un usuario no puede pertenecer a dos parejas competitivas vigentes.
41. La categoría individual no cambia solo por jugar temporalmente con un compañero más fuerte; cambia por movimiento deportivo real.
42. La categoría inicial de dos jugadores sin categoría previa sigue pendiente de confirmación final en Wheel v3.
43. Disolución nunca borra obligaciones abiertas.
44. La re-formación futura de una misma dupla tiene su tratamiento competitivo pendiente de confirmación.

## Identidad, seguridad y administración

45. DNI es único y privado; login jugador usa DNI + contraseña.
46. Registro exige DNI + frente + dorso para verificación inicial.
47. Las imágenes del DNI son temporales y se eliminan de la base activa al cerrar la revisión.
48. Una foto defectuosa se resuelve con `PEDIR NUEVAS FOTOS`, sin crear otra cuenta.
49. Login Admin está separado: frontend `/admin-la-red`, backend `/api/auth/admin-login`.
50. Una cuenta Admin no puede autenticarse por el endpoint normal de jugadores.
51. Conocer la ruta Admin no otorga acceso: siguen siendo obligatorios rol, contraseña y TOTP cuando corresponda.
52. El primer propietario se promueve explícitamente; no existe alta pública de administradores.
53. Admin es una cola de excepciones: identidad, disputas reales, disciplina, canchas, correcciones, auditoría y contingencias.
54. Admin no elige rivales ni ordena manualmente el ranking.
55. Toda acción administrativa sensible queda auditada.

## Producto, UX y negocio

56. WhatsApp es el canal operativo principal; la app conserva el estado oficial.
57. Los eventos relevantes de un compromiso se notifican a ambos integrantes de las parejas afectadas.
58. La complejidad puede existir en el motor, pero la UX debe centrarse en “qué me toca hacer ahora”.
59. Todo flujo ordinario que requiera una acción humana debe poder completarse desde la web.
60. El lugar de un partido es texto libre acordado por jugadores y no crea vínculo comercial con la sede mencionada.
61. El catálogo de canchas adheridas es una capa comercial separada del motor deportivo.
62. LA RED es continua, sin temporadas ni resets anuales.
63. La primera versión competitiva es 18+ y usa aceptaciones legales versionadas.
64. LA RED no se define como sin fines de lucro ni promete gratuidad permanente.
65. La capa comercial futura de reservas/pagos/comisiones no puede alterar resultados ni ranking.
66. La identidad visual aprobada debe preservarse: hero de cancha real de pádel nocturna, sin referencias a tenis.
67. Los `.md` son la memoria oficial; toda regla implementada debe quedar alineada con código, tests y documentación.

## Preguntas todavía abiertas

Las preguntas de borde que faltan cerrar antes de tocar Wheel v3 están en `WHEEL_V3_SPEC.md`. No deben resolverse por intuición ni por cómo funciona Wheel v2 hoy.
