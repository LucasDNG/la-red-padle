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
