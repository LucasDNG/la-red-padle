# LA RED Pádel — Visión de producto y experiencia

> Complementa `PROJECT_RULES.md`. Este archivo guarda decisiones de experiencia pública/administrativa que no deben depender del historial del chat.

## Principio

LA RED debe funcionar con la menor intervención administrativa posible. El administrador gestiona excepciones, disciplina y configuración comercial; el sistema gestiona automáticamente rueda, plazos, sanciones deterministas, auto-validaciones y publicación de información deportiva acordada.

## Página pública

La experiencia pública debe permitir, sin iniciar sesión:

- ver ranking masculino y femenino;
- ver récord histórico de Primera Masculina;
- ver récord histórico de Primera Femenina;
- consultar próximos partidos confirmados;
- con el tiempo, consultar resultados/historial sin exponer datos personales.

## Próximos partidos

La cartelera representa compromisos realmente coordinados, no simples assignments internos.

Publicar: circuito, categoría, nombres de las parejas, fecha, hora y lugar.

No publicar: teléfonos, mensajes, propuestas rechazadas, notas disciplinarias o datos de cuenta.

Fecha/hora/lugar nacen de una propuesta y aceptación de ambas parejas. Toda reprogramación sigue el mismo principio.

## Lugares / canchas

Administración gestiona el catálogo. La lista no se programa en código.

Datos iniciales:

- nombre;
- dirección;
- activo/inactivo;
- sede asociada/recomendada opcional.

Más adelante se pueden sumar logo, Instagram, contacto o enlace de reserva sin cambiar la lógica deportiva.

Retirar un lugar significa sacarlo de futuras selecciones. Si ya fue usado, permanece archivado para historia y auditoría.

## Panel administrativo

El panel no debe convertirse en una consola para hacer manualmente lo que la máquina puede decidir. Debe concentrarse en:

- disputas reales sobre resultados ya jugados;
- disciplina de pareja/jugador;
- verificación y correcciones excepcionales de identidad;
- auditoría/corrección de acciones administrativas;
- administración de lugares/canchas y futuras configuraciones comerciales.

Los no-show y conflictos operativos de coordinación deben resolverse automáticamente siempre que sea posible; una contradicción operativa no debe detener la rueda.

## Pendiente deliberado

La lista real de lugares disponibles se cargará más adelante por el administrador desde el propio sitio.


## Mi Liga: una sola pregunta

La pantalla principal del jugador debe responder primero:

**¿Qué me toca hacer ahora?**

Estados típicos:

- esperando rival;
- nuevo rival asignado;
- proponer fecha;
- responder una propuesta;
- partido confirmado;
- cargar resultado;
- confirmar resultado;
- pareja pausada;
- estás al día.

Debajo aparecen datos secundarios e historial, pero la acción principal debe ser inequívoca.

## WhatsApp

WhatsApp es un canal fundamental de LA RED para avisos importantes. La app sigue siendo la fuente oficial.

El botón `Contactar por WhatsApp` entre rivales solo existe mientras haya un compromiso abierto. El teléfono no se vuelve un dato público ni queda visible permanentemente después del partido.

## Página pública viva

Además de ranking y récords separados de Primera Masculina/Femenina, la portada puede destacar:

- `HOY EN LA RED`;
- `ESTA SEMANA`;
- próximos partidos;
- resultados recientes;
- récord masculino;
- récord femenino.

Los filtros de cartelera deben mantenerse simples: hoy/esta semana, circuito, categoría y lugar.

## Perfiles deportivos

Tocar una pareja abre una ficha deportiva, no social: posición, categoría, ELO, historial, últimos resultados, próximos partidos públicos, evolución y logros.

No hay seguidores, likes, comentarios ni chat público.

## Microexplicaciones

LA RED debe enseñar las reglas dentro del flujo. Una acción compleja debe llevar una explicación corta en el momento justo y un `Ver más` opcional.

Ejemplos:

- “La fecha anterior sigue vigente hasta que ambos acepten otra.”
- “Esta es la única reprogramación extraordinaria disponible.”
- “No podías bajar más; se acumuló 1 de deuda.”
- “Ganaste a la pareja #4; por eso pasaste del #7 al #4.”

## Privacidad

Nunca se muestran públicamente DNI, teléfono, email, mensajes de coordinación, denuncias ni detalles médicos. `LESIÓN / ABANDONO` puede ser público como tipo de resultado, sin diagnóstico.

## Identidad y acceso

Registro simple con DNI, nombre, apellido, teléfono WhatsApp y contraseña. Login con DNI + contraseña. La cuenta puede usarse para completar datos mientras espera verificación, pero no compite hasta ser aprobada.

## Liga continua

No existen resets de temporada. La historia competitiva continúa año tras año; los años son filtros estadísticos, no reinicios.

## Errores administrativos

El panel debe registrar y permitir corregir, cuando sea seguro, verificaciones, lugares y otras acciones administrativas. La corrección también queda auditada.


## Producto multiplataforma

LA RED debe concebirse como un único producto con las mismas reglas y datos en web, Android e iPhone. La app móvil puede sumar push notifications, pero nunca debe tener un motor competitivo distinto.

## Notificaciones a ambos integrantes

Los eventos operativos relevantes se envían por WhatsApp a **ambos integrantes** de la pareja. Esto incluye cambios de horario, lugar, propuestas, confirmaciones, vencimientos, resultados, no-show y movimientos competitivos.

La notificación debe explicar qué cambió y cuál es la acción siguiente, no solo avisar “hubo una actualización”.

## Dirección comercial futura

LA RED no se presenta como “sin fines de lucro” ni promete gratuidad permanente.

La etapa inicial puede ser gratuita para maximizar adopción. La plataforma debe quedar preparada para evolucionar a:

- acuerdos con canchas;
- reservas desde LA RED;
- pago de turnos;
- comisión a la sede;
- patrocinadores/sedes asociadas.

El crecimiento comercial no debe alterar las reglas deportivas ni convertir al administrador en operador diario.

## El camino también es parte del producto

`PROJECT_JOURNEY.md` conserva la evolución y razonamiento del proyecto. El objetivo es que decisiones valiosas no desaparezcan aunque luego cambien nombres, pantallas o implementación.
