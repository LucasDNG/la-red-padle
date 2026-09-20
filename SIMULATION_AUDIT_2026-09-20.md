# Auditoría longitudinal de categorías — 2026-09-20

## Pregunta
¿La regla simétrica `#1 + 3 victorias asciende / última + 3 derrotas desciende` mantiene poblaciones razonablemente estables durante años?

## Hallazgo
No del todo. En simulaciones sin altas/bajas externas apareció una corriente neta hacia categorías superiores. La causa no es una sola fórmula: intervienen el intercambio de posiciones, las rachas y, especialmente, la asimetría de entrada (ascendido al fondo; descendido base #2).

## Por qué no usar 5 derrotas consecutivas
Haría el problema peor. Para una pareja con probabilidad 50% de perder, el tiempo esperado hasta 3 derrotas consecutivas es 14 partidos; hasta 5 consecutivas es 62. Con 60% de probabilidad de perder, pasa aproximadamente de 9,1 a 29,6 partidos. Es decir: cinco consecutivas reduce demasiado el flujo descendente.

## Regla elegida
- normal: última + 3 derrotas consecutivas;
- si la categoría tiene **5 o más parejas activas que la inmediatamente inferior**: última + 2 derrotas consecutivas;
- 7ª no desciende.

Es una válvula de presión local. No fija cupos ni mueve parejas administrativamente: el descenso sigue necesitando derrotas deportivas. Solo acelera el descenso cuando aparece un desnivel grande entre categorías vecinas.

## Prueba Monte Carlo
Modelo reproducible en `scripts/simulate-category-balance.js` (`npm run simulate:balance`).

Configuración:
- 7 categorías;
- 12 parejas iniciales por categoría;
- 120 corridas por escenario;
- 20 años por corrida;
- una rueda aproximada por mes;
- diferencias de habilidad latente 0, 0,7 y 1,0 entre categorías.

Resultados del candidato `5.0.9`:

- skill gap 0,0 — regla base: `[20,3; 15,3; 12,7; 11,9; 10,1; 7,5; 6,2]`; válvula: `[10,9; 11,3; 12,0; 12,0; 12,2; 12,8; 12,7]`.
- skill gap 0,7 — regla base: `[21,7; 15,9; 12,6; 11,3; 9,3; 7,4; 5,8]`; válvula: `[11,4; 11,4; 11,7; 12,1; 12,8; 12,2; 12,4]`.
- skill gap 1,0 — regla base: `[22,6; 15,5; 12,8; 10,3; 9,1; 7,3; 6,4]`; válvula: `[12,1; 11,9; 11,9; 12,2; 11,6; 11,8; 12,4]`.

En esas mismas corridas, la tasa de que alguna categoría quedara vacía al menos una vez bajó de 18,3%/15,0%/11,7% con la regla base a 1,7%/0,0%/0,8% con la válvula. Las promociones y descensos medios también quedaron casi balanceados con la nueva regla.

## Interpretación
No es una predicción de la liga real: no modela altas, bajas, lesiones, pausas, disponibilidad ni comportamiento humano completo. Sí es suficiente como prueba estructural para detectar deriva y comparar reglas bajo las mismas condiciones.

## Decisión
Adoptar la válvula `gap >= 5 => 2 derrotas`; mantener 3 derrotas en condiciones normales. No adoptar 5 derrotas consecutivas.
