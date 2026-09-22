# LA RED Pádel — Decisiones vigentes

Este archivo contiene únicamente decisiones que siguen vigentes. Las decisiones reemplazadas viven en `PROJECT_JOURNEY.md`, no acá.

1. El ranking es una escalera estructural: las estadísticas no gobiernan la posición.
2. Si una pareja ubicada abajo vence a una ubicada arriba, intercambian posiciones; el resto no se reordena.
3. ELO acompaña la posición pero no decide el ranking.
4. La rueda es automática y cada pareja puede tener como máximo un compromiso abierto.
5. Rival nunca enfrentado primero; después, cruce más antiguo; waiting time resuelve categorías impares.
6. El assignment da 30 días corridos para jugar **y cargar** el resultado.
7. Solo existe una programación oficial; una propuesta nueva no reemplaza la anterior hasta que ambas parejas la aceptan.
8. Las propuestas tienen 48 h; una propuesta demasiado tardía no traslada automáticamente toda la responsabilidad al rival.
9. Existe una única extensión extraordinaria de 15 días por causa externa confirmada por ambas parejas.
10. No-show se reporta después de la programación oficial; la pareja reportada tiene 48 h para objetar.
11. Si un no-show se contradice sin evidencia objetiva suficiente, la rueda continúa con penalización operativa a ambas, sin inventar resultado deportivo ni crear trabajo Admin ordinario.
12. Un resultado cargado abre 15 días de confirmación; silencio auto-valida.
13. Dos versiones incompatibles de un partido jugado generan una disputa real para Admin.
14. Lesión/abandono es un resultado deportivo sin inventar games ni aplicar una penalización adicional.
15. Estados competitivo y disciplinario son dimensiones separadas.
16. Disciplina individual sobrevive al cambio de pareja.
17. Pausa voluntaria requiere a ambos; `pause_after_current` evita una asignación nueva después de cerrar el compromiso actual.
18. Disolución tiene salida a 7 días y nunca borra obligaciones ya abiertas.
19. La categoría individual no cambia solo por jugar temporalmente con un compañero más fuerte; cambia por movimiento deportivo real.
20. Formación de pareja requiere invitación + aceptación; Admin no aprueba parejas.
21. Un usuario no puede pertenecer a dos parejas competitivas vigentes.
22. DNI es único y privado; login jugador usa DNI + contraseña.
23. Registro final exige DNI + frente + dorso para verificación inicial.
24. Las imágenes del DNI son temporales, privadas y visibles solo por Admin durante la verificación; la fila activa se elimina al verificar/rechazar.
25. Una foto defectuosa se resuelve con `PEDIR NUEVAS FOTOS`, no con rechazo automático de cuenta.
26. Reenvío de DNI conserva la misma cuenta/DNI y reemplaza frente+dorso como conjunto.
27. El login Admin está separado del login jugador: frontend `/admin-la-red`, backend `/api/auth/admin-login`.
28. Una cuenta Admin no puede autenticarse por el endpoint normal de jugadores.
29. La ruta privada Admin es discreción, no seguridad: siguen siendo obligatorios rol, contraseña y TOTP cuando esté configurado.
30. El primer propietario se crea por promoción explícita de una cuenta existente; no existe alta pública de Admin.
31. Admin es una cola de excepciones: identidad, disputas reales, disciplina, canchas, correcciones excepcionales, auditoría y contingencias globales.
32. Admin no elige rivales, no ordena ranking, no escribe ELO, no resuelve coordinación ordinaria y no aprueba parejas.
33. Toda acción Admin sensible queda auditada.
34. WhatsApp es el canal operativo principal; la app conserva el estado oficial.
35. Eventos relevantes de un compromiso se notifican a ambos integrantes de las parejas afectadas.
36. Próximos partidos solo son públicos cuando fecha/hora/lugar fueron aceptados.
37. Los récords de Primera son separados Masculino/Femenino.
38. LA RED es una liga continua, sin temporadas ni resets.
39. Canchas son administrables y archivables sin borrar historial.
40. La primera versión competitiva es 18+ y usa aceptaciones legales versionadas.
41. LA RED no se define como sin fines de lucro ni promete gratuidad permanente.
42. La capa comercial futura (reservas/pagos/comisiones) queda desacoplada del motor deportivo.
43. El producto final se instala desde un `schema.sql` consolidado; no se reconstruye una instalación nueva encadenando migraciones históricas.
44. La identidad visual aprobada es parte estable del producto y no puede degradarse por una reescritura técnica.
45. Hero oficial: cancha real de pádel nocturna; nunca tenis.
46. Todas las páginas internas comparten un sistema visual coherente de espaciado, cards, títulos, formularios y responsive.
47. `Mi liga` y `Mi pareja` deben explicar el proceso y la próxima acción, no limitarse a mostrar datos técnicos.
48. Login/registro deriva de la URL activa y reacciona a cambios de `location.search`.
49. En SQL crítico se evitan placeholders reutilizados en contextos con inferencias de tipo incompatibles; se usan casts o parámetros separados.
50. En Admin, éxito de la acción y éxito del refresco posterior son estados distintos.
51. Gates técnicos deben comprobar sintaxis, tests y consistencia de imports/exports, no solo `node --check`.
52. Los `.md` son la memoria oficial de LA RED: reglas, arquitectura, decisiones, auditoría y estado deben actualizarse junto con código/tests.

53. El descenso usa una válvula de equilibrio: normalmente exige 3 derrotas consecutivas siendo última; si la categoría tiene al menos 5 parejas activas más que la categoría inferior, exige 2. La regla anterior de población totalmente irrelevante queda reemplazada solo para este umbral de descenso.
54. Cinco derrotas consecutivas no se adopta: matemáticamente haría el descenso mucho menos frecuente y agravaría la acumulación hacia categorías superiores.


## Decisiones de superficie de usuario y canchas — 2026-09-22
48. El rival no se elige mediante un botón de “desafiar”: la rueda automática sigue siendo la única fuente ordinaria de asignación.
49. Todo flujo ordinario que requiera una acción humana debe poder completarse desde la web; no se considera terminado si exige consola, llamada manual a API o conocimiento técnico.
50. El lugar de un partido es texto libre propuesto por una pareja y aceptado por la otra; no depende de una cancha precargada.
51. Una mención de lugar hecha por jugadores no implica vínculo comercial, recomendación ni patrocinio de LA RED.
52. El catálogo de canchas queda reservado a la capa comercial: solo sedes activas marcadas explícitamente como adheridas se publican como “Canchas adheridas a LA RED”.
53. Pausa y disolución muestran en frontend quién pidió la acción, cuándo falta confirmación del compañero y cuál es la siguiente acción disponible.
54. Extensión extraordinaria y no-show se ofrecen en pantalla únicamente cuando la ventana temporal correspondiente está habilitada.
55. Un resultado propio todavía editable se vuelve a mostrar precargado para corregirlo; una disputa incompatible pasa a estado de espera de resolución administrativa.
56. La ventana disciplinaria de 15 días posterior al cierre de un partido debe ser accesible desde Mi liga mediante partidos recientes reportables.
