# LA RED Pádel — Checkpoint funcional 2026-09-20

## Propósito

Este archivo congela el estado de decisiones alcanzado después del push:

`0c8b7764ce275a3c42ad06b08c306c0535011cf0` — `Actualiza motor competitivo de La Red`

A partir de este checkpoint, el desarrollo competitivo debe partir de los documentos actuales del repositorio y no de recuerdos parciales del chat.

## Documentos que mandan

1. `PROJECT_RULES.md` — reglas vigentes.
2. `TEST_SCENARIOS.md` — invariantes y casos que deben sobrevivir cualquier cambio.
3. `DECISIONS.md` — historial de cómo se llegó a las reglas actuales.
4. `CHECKPOINT_2026-09-20.md` — foto de control de este hito.
5. `PRODUCT_VISION.md` — experiencia pública/administrativa y alcance de producto.

Si hay contradicción entre código viejo y `PROJECT_RULES.md`, manda `PROJECT_RULES.md` hasta que el código sea corregido.

## Núcleo aprobado en este hito

### Ranking

- Escalera por intercambio de posiciones.
- Una pareja de abajo que gana a una de arriba ocupa su puesto y la derrotada ocupa el puesto anterior del ganador.
- Las estadísticas no reordenan globalmente el ranking.

### Categorías

- 1ª a 7ª, todas ilimitadas.
- Alta de nueva pareja al fondo de su categoría.

### ELO

- ELO posicional, no ELO clásico.
- Pareja sin partidos: ELO 0.
- #1 de Primera: 2000 base +1 por cada defensa exitosa mientras ya era #1.
- Récord histórico permanente exclusivo de Primera.
- Fórmula proporcional exacta normal todavía sujeta a validación final.

### Ascenso/descenso deportivo

- #1 + 3 victorias consecutivas => ascenso, salvo Primera.
- Último + 3 derrotas consecutivas => descenso, salvo 7ª.
- Descenso no desplaza al #1 de la categoría inferior.
- Entrada base de descenso #2, modificada por deuda de posición.

### Nueva rueda competitiva

- Se abandona el diseño de muchos desafíos simultáneos.
- Máximo un partido de rueda abierto por pareja.
- La rueda asigna rival.
- 30 días máximos desde la asignación para jugar y cargar resultado.
- Resolver rápido libera inmediatamente a la pareja; puede volver a jugar enseguida.

### Incumplimiento mensual

- Responsable único => baja un puesto solo el responsable.
- Ninguno actuó => penalización para ambos.
- Último sin puesto para bajar => deuda de posición.
- Dos incumplimientos mensuales consecutivos atribuibles => `paused` automático.

### Estados

- `active`: compite.
- `paused`: pareja existente, fuera de rueda temporalmente, al fondo, ELO 0.
- `inactive`: pareja disuelta/archivada.

### Resultado

- Cargar resultado bloquea a ambas parejas para un nuevo partido.
- 15 días para confirmar u objetar.
- Sin respuesta => auto-validación del único resultado cargado.
- Versiones incompatibles => `disputed` + bandeja de administración.
- Mientras está en disputa no hay nuevo partido de rueda.

## Bugs confirmados que el próximo bloque debe corregir

1. Evitar compromisos/desafíos activos duplicados entre las mismas parejas.
2. Evitar que un compromiso siga vivo después de un cambio de categoría incompatible.
3. Eliminar el reordenamiento automático incorrecto tras el primer partido.
4. Implementar vencimiento/auto-validación del resultado pendiente.
5. Garantizar un solo partido abierto para preservar orden cronológico.
6. Cambiar el mantenimiento horario para que use el motor nuevo, no `league.js` antiguo.
7. Evitar que `GET /ranking` recalculе/escriba toda la base en cada lectura.
8. Eliminar o desconectar textos/componentes viejos con reglas 30/90, cupos o `-10 ELO`.
9. Estructurar/validar marcadores.
10. No contar un super tie-break como games normales.
11. Definir ventana temporal para denuncias tardías.
12. Reducir/eliminar el motor competitivo viejo para que no pueda reactivarse por error.

## Pendientes vigentes que no deben inventarse en código

- Fórmula proporcional definitiva de ELO para posiciones normales.
- Entrega externa de notificaciones (push/email) como mejora de release; la notificación interna sí es obligatoria.
- Cualquier formato excepcional de partido que no pueda expresarse con sets normales + super tie-break estructurado.

Todo lo demás que antes aparecía en esta lista quedó cerrado en las decisiones posteriores a la auditoría.

## Próximo bloque de trabajo

No agregar nuevas reglas durante este bloque salvo que aparezca un caso imposible de resolver sin decisión humana.

Orden recomendado:

1. actualizar base/modelo para `paused`, rueda única, incumplimientos y reloj de confirmación;
2. reemplazar desafíos múltiples por una asignación única compatible;
3. implementar resultado con 15 días + auto-validación + disputa administrativa;
4. conectar mantenimiento automático exclusivamente al motor nuevo;
5. eliminar caminos viejos peligrosos;
6. optimizar ranking para que la lectura no escriba toda la base;
7. ejecutar simulación de varios años y atacar bugs encontrados;
8. recién después hacer limpieza visual/final.

## Regla de trabajo

Antes de tocar código competitivo en el próximo bloque, releer estos cuatro archivos completos.

## Auditoría posterior al checkpoint

Después de publicar este checkpoint se realizó una auditoría integral del árbol `main` en el commit `4340a18b93ff27919457248e6f829c46af312bd2`.

La auditoría y el plan de finalización quedan registrados en:

- `AUDIT_2026-09-20.md`
- `FINALIZATION_PLAN.md`

Estos archivos no reemplazan `PROJECT_RULES.md`; registran bugs confirmados, riesgos técnicos, brechas regla/código y el orden de trabajo hacia la versión final.

## Decisiones cerradas después de la auditoría

- Estado competitivo y disciplinario se separan.
- Cualquier disciplina abierta bloquea la rueda hasta resolución administrativa.
- Disolución por autoservicio queda bloqueada con partido/resultado abierto.
- Las disputas conservan dos versiones completas del resultado.
- `played_at` es la fecha real jugada.
- Categoría impar: esperar rival no genera sanción y la prioridad rota por tiempo de espera.
- Selección de rival: nunca jugado primero; luego cruce más antiguo.
- Deuda y rachas deportivas sobreviven a `paused`; el contador de incumplimientos se reinicia al reactivar.
- Pausa voluntaria no puede usarse para escapar de un compromiso ya abierto.
- Problemas de restricciones SQL, concurrencia y tests se resuelven técnicamente sin inventar reglas deportivas nuevas.

## Siguiente bloque congelado

Construir el núcleo de datos y rueda definitiva con estas decisiones. No hacer todavía limpieza visual ni borrar historial. El motor viejo puede permanecer físicamente durante la transición, pero debe quedar desconectado antes del release.


## Revisión de autonomía posterior al push `65cd63dda05d736290045b32420aaa046c42b1a6`

Se verificó que ese push fue documental y que Vercel reportó despliegue exitoso. El runtime competitivo continúa siendo transitorio hasta el bloque funcional definitivo.

Nuevos cierres para evitar depender del chat:

- formación de pareja por invitación + aceptación;
- restricción de base contra doble pareja vigente;
- coordinación de fecha/hora registrada para atribuir incumplimiento automáticamente;
- `pause_after_current` para viajes planificados;
- pausa voluntaria no borra una falta previa;
- pausa automática cumplida reinicia el contador al reactivar;
- disciplina resuelta usa `discipline_resolved_at` para no reabrirse con los mismos hechos;
- disciplina abierta bloquea también la disolución por autoservicio;
- ascendido entra al fondo activo de la categoría superior;
- descenso a categoría inferior sin activos => #1;
- `paused` no participa del ELO proporcional; `active` disciplinariamente bloqueada conserva lugar;
- récord de Primera separado por circuito masculino y femenino;
- resultado editable solo antes de respuesta rival, sin extender plazo;
- rechazo administrativo de ambas versiones => `void`;
- marcador nuevo estructurado, con super tie-break separado de games;
- administración trabaja como cola de excepciones, no como operador cotidiano.

## Hallazgos nuevos incorporados

- el flujo actual permite crear una pareja sin consentimiento del compañero;
- la base actual no garantiza por constraint que un jugador no quede en dos parejas vigentes bajo concurrencia;
- una pausa voluntaria después de una primera falta podía usarse para resetear el contador;
- una disciplina limpiada podía reabrirse inmediatamente por los mismos reportes del período móvil;
- resolver un partido y asignar el siguiente instantáneamente dejaba sin ventana a quien quería comenzar vacaciones después del partido.

## Consolidación posterior — récords, cartelera y sedes

Este checkpoint consolidado parte del último push realmente aplicado `65cd63dda05d736290045b32420aaa046c42b1a6` e incorpora además todas las decisiones del checkpoint de autonomía que todavía no había sido copiado al repositorio.

Se corrige una decisión: no existe un récord absoluto único entre hombres y mujeres. Hay dos récords históricos independientes, Primera Masculina y Primera Femenina.

Se agrega producto público:

- sección pública `PRÓXIMOS PARTIDOS`;
- solo aparecen partidos con fecha, hora y lugar aceptados por ambas parejas;
- la cartelera se alimenta y actualiza automáticamente;
- no se publican contactos ni coordinación privada.

Se agrega administración de lugares/canchas:

- alta y edición desde panel;
- retirar/desactivar de disponibilidad;
- conservación histórica en vez de borrado destructivo;
- marca opcional de sede asociada/recomendada;
- la lista de lugares no requiere deploy de código.

La lista concreta de lugares se cargará más adelante desde el panel administrativo.


## Checkpoint de producto y autonomía — conversación consolidada

Este checkpoint incorpora todas las decisiones aprobadas después del checkpoint anterior. A partir de aquí no deben recuperarse del chat: deben leerse de `PROJECT_RULES.md`, `PRODUCT_VISION.md`, `DECISIONS.md` y `TEST_SCENARIOS.md`.

### Identidad

- DNI único y privado.
- Login con DNI + contraseña.
- Verificación administrativa única antes de competir.
- Recuperación/cambio de teléfono por WhatsApp.
- Disciplina individual separada de disciplina de pareja.

### Parejas

- Invitación para formar pareja: una activa, cancelable, vence a los 10 días.
- La categoría de pareja puede arrastrar a un jugador hacia arriba sin cambiar automáticamente su categoría individual.
- Categoría individual solo cambia por movimientos deportivos reales.
- Pausa voluntaria requiere a ambos.
- Disolución puede iniciarla cualquiera; plazo de salida 7 días y las obligaciones se resuelven antes.

### Partido y coordinación

- Una programación oficial vigente.
- Cambios consensuados ilimitados dentro de los 30 días.
- La programación anterior sigue vigente hasta aceptar una nueva.
- Una sola extensión extraordinaria de 15 días por causa externa confirmada por ambas.
- Si la extensión falla: ambas pierden una posición/deuda, sin derrota deportiva ni strike de pausa.
- No-show: 48 horas para objetar.
- WhatsApp disponible solo entre rivales con compromiso abierto.
- `LESIÓN / ABANDONO`: derrota deportiva normal, sin sets/games parciales.

### Producto

- Liga continua, sin temporadas/reset.
- Zona horaria `America/Argentina/Buenos_Aires`.
- `MI LIGA` responde “¿Qué me toca hacer ahora?”.
- Historial explicativo y línea de tiempo.
- Perfil deportivo de pareja, sin funciones de red social.
- Página pública con próximos partidos, filtros simples y dos récords separados de Primera.
- Microexplicaciones contextuales para no obligar a leer el reglamento.
- Auditoría/corrección de acciones administrativas.
- Administración como cola de excepciones, no como operador diario.

### Siguiente tramo de conversación

Continuar pantalla por pantalla: partido/coordinación → resultado → ranking → perfil → panel admin → notificaciones/WhatsApp → accesibilidad/seguridad. No empezar todavía limpieza visual ni el motor final hasta que esta ronda quede congelada y subida.


## Checkpoint del camino de LA RED

A partir de esta ronda se incorpora `PROJECT_JOURNEY.md` como memoria narrativa del proyecto y `LEGAL_AND_BUSINESS.md` como registro de requisitos legales/comerciales.

Nuevas decisiones consolidadas:

- WhatsApp notifica a ambos integrantes.
- LA RED se diseña para web, Android e iPhone con un único motor.
- La primera versión competitiva es para mayores de 18 años.
- El registro tendrá aceptación versionada de términos, riesgos, conducta, privacidad y comunicaciones.
- Se evita recolectar datos médicos innecesarios.
- Revisión legal profesional y evaluación de seguros antes del lanzamiento.
- LA RED no se presenta como “sin fines de lucro”.
- No se promete gratuidad permanente.
- Estrategia comercial futura: reservas y pagos de canchas, acuerdos con sedes y comisión B2B.
- El recorrido y razonamiento del proyecto quedan documentados para no depender del chat.
