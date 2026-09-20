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

## PENDIENTES que NO deben inventarse en código

- Fórmula proporcional definitiva de ELO para posiciones normales.
- Posición exacta de entrada del ascendido en la categoría superior.
- Descenso hacia una categoría inferior completamente vacía.
- Regla exacta de deuda al entrar/salir de `paused`.
- Qué ocurre al pedir pausa voluntaria con un partido abierto.
- Mecanismo objetivo para atribuir responsabilidad de un partido mensual no jugado.
- Formato oficial del marcador y tratamiento de super tie-break/abandono.
- Límite temporal para presentar una denuncia respecto del hecho.
- Algoritmo final de selección de rival de la rueda después de la simulación de largo plazo.

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
