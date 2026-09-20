# LA RED Pádel — Historial de decisiones

Este archivo registra cambios de criterio. `PROJECT_RULES.md` contiene únicamente las reglas vigentes.

## 2026-09-20

### Categorías sin límite

Se eliminan los cupos máximos anteriores de 1ª–3ª y 4ª–6ª. Todas las categorías 1ª a 7ª pasan a admitir una cantidad ilimitada de parejas.

Motivo funcional: evitar que un jugador con categoría vigente quede bloqueado esperando una vacante al formar una nueva pareja.

### Categoría de una nueva pareja

- Dos jugadores sin categoría previa: eligen libremente la categoría inicial.
- Si alguno posee categoría vigente, la nueva pareja entra en la categoría vigente más fuerte de los dos.
- La categoría vigente es el nivel actual, no el mejor nivel histórico.

### Parejas archivadas

Una pareja disuelta se archiva como `inactive`; no se elimina. Conserva historial y récords. Se cancelan desafíos pendientes/aceptados y no se transfieren ELO, posición ni rachas a una nueva pareja.

### Onboarding

Después del registro se debe ofrecer FORMAR PAREJA / MÁS TARDE. Elegir MÁS TARDE no bloquea la navegación. La gestión de pareja debe estar centralizada en una sola experiencia desde MI LIGA.

### ELO posicional

Se reafirma que no se utilizará ELO clásico tipo K-factor ni una base fija de 1500.

El ELO es una representación de la posición y se distribuye porcentualmente en una escala base 0–2000 dentro de cada categoría. Debe ser estrictamente único entre posiciones y puede usar decimales. Al cambiar la cantidad de parejas, se recalcula la distribución.

El líder tiene base 2000 y puede acumular por encima de 2000 mientras conserva la punta. El máximo alcanzado forma parte del récord histórico permanente.

Cuando el líder pierde la punta, no puede copiar el ELO de otra posición. En el caso definido de pasar a la posición que ocupaba el segundo, queda 1 punto por debajo del ELO que tenía ese segundo antes del cambio.

Quedan pendientes de definición cerrada antes de implementar esta parte:

- mecanismo exacto de acumulación del líder por encima de 2000;
- convivencia de la penalización -10 por vencimiento con la distribución posicional sin producir duplicados ni invertir el orden.

### Documentación como fuente de verdad

A partir de esta fecha, las decisiones del proyecto deben quedar reflejadas en:

- `PROJECT_RULES.md` — reglas vigentes;
- `DECISIONS.md` — historial de decisiones;
- `TEST_SCENARIOS.md` — escenarios obligatorios de validación.

Antes de cambios funcionales se deben revisar estos archivos.
