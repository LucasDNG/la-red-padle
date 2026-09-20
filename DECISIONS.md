# LA RED Pádel — Historial de decisiones

`PROJECT_RULES.md` contiene las reglas vigentes. Este archivo registra cómo fueron cambiando.

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

Los criterios de victorias, diferencia de games y antigüedad son auxiliares de desempate/inicialización y no reordenan globalmente la escalera.

### Nuevas parejas y ELO 0

Las parejas sin partidos oficiales quedan al fondo con ELO 0. La antigüedad ordena inicialmente a las parejas todavía sin actividad. Jugar el primer partido, incluso perderlo, permite dejar atrás a quienes nunca jugaron.

Se admite ELO repetido cuando existe un empate deportivo definido por las reglas; varias parejas sin partidos pueden compartir ELO 0.

### ELO porcentual

No se usa ELO clásico tipo K-factor. El ELO acompaña la posición y se recalcula proporcionalmente según la cantidad de parejas de la categoría. Se permiten decimales.

### Defensas del #1 de Primera

Solo el #1 de Primera puede superar 2000. Cada victoria obtenida mientras ya era #1 y conserva la punta suma +1. Conquistar la punta no cuenta como defensa.

El máximo histórico de Primera queda guardado permanentemente y se mostrará en la portada.

### Ascenso y descenso

- #1 + 3 victorias seguidas => ascenso.
- Último + 3 derrotas seguidas => descenso.
- La cantidad de parejas por categoría no afecta la regla.
- La pareja que desciende no entra por encima del líder de la categoría inferior.

La versión candidata inserta al ascendido al fondo de la categoría superior. Se auditará luego del siguiente push.

### Nuevos plazos de desafío

Se reemplaza el esquema anterior de 30 días desde la aceptación y `-10 ELO`.

Nuevo esquema:

- 30 días para aceptar el desafío;
- no aceptar => la pareja desafiada pierde 1 puesto;
- después de aceptar => 90 días para jugar/resolver;
- vencer el plazo aceptado => ambas parejas pierden 1 puesto;
- si una pareja ya está última, la pérdida se convierte en deuda de posición.

### Deuda de posición

Las penalizaciones que no pueden materializarse por estar último se guardan. Al descender, la entrada base es #2 y la deuda empuja hacia #3, #4, #5, etc. Si no hay suficientes puestos, la deuda no consumida continúa guardada.

### Transición de desafíos ya existentes

La migración no aplica plazos nuevos de forma retroactiva. Los desafíos que ya estaban pendientes reciben 30 días desde la migración y los que ya estaban aceptados reciben 90 días desde la migración.

### Documentación como fuente de verdad

Se mantienen:

- `PROJECT_RULES.md`
- `DECISIONS.md`
- `TEST_SCENARIOS.md`

como documentación obligatoria del comportamiento vigente.
