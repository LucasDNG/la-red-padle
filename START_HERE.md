# START_HERE.md — LA RED Pádel

Este archivo es el punto de entrada obligatorio para cualquier chat nuevo, sesión nueva o handoff.

## 1. Estado de referencia

- Repo: `LucasDNG/la-red-padle`
- Branch: `main`
- Commit de checkpoint confirmado: `05fc27e1511d7bfcd4df6d3ea18c41f280b4ea5b`
- Commit: `Consolida checkpoint wheel-v2 e identidad`
- CI de ese commit: backend + frontend OK en Node 22
- Candidato local/documental de referencia: `v10`
- package: `5.0.8`
- motor competitivo: `wheel-v2`
- DB activa: Neon nueva
- DB histórica: eliminada, no asumir recuperable

## 2. Regla de continuidad

En un chat nuevo NO reconstruir el proyecto desde memoria ni desde mensajes antiguos.

Orden obligatorio:
1. leer este archivo;
2. leer `PROJECT_RULES.md`;
3. leer `DECISIONS.md`;
4. leer `CHECKPOINT_2026-09-20.md`;
5. leer `AUDIT_2026-09-20.md`;
6. leer `TEST_SCENARIOS.md`;
7. si el trabajo toca arquitectura: `ARCHITECTURE.md`;
8. si toca historia/por qué: `PROJECT_JOURNEY.md`.

Si chat y archivos difieren, los `.md` vigentes mandan hasta que se haga una corrección explícita.

## 3. Qué ya está probado

- registro;
- DNI frente/dorso;
- identidad pending;
- Admin privado `/admin-la-red`;
- verificación `pending -> verified`;
- purga documental;
- reenvío de DNI;
- frontend/backend CI verde;
- tests actuales 14/14.

## 4. Qué NO debe asumirse probado

- formación de pareja completa;
- rueda real de punta a punta;
- programación;
- resultado;
- ranking real con DB;
- ascenso/descenso longitudinal definitivo;
- no-show completo;
- pausa/disolución;
- disciplina real;
- WhatsApp Meta real;
- TOTP Admin real;
- deploy final.

## 5. Hallazgos abiertos

### A. Deriva de categorías
La simulación longitudinal detectó posible acumulación de parejas en categorías altas.

No cambiar producción por intuición.

Próximo análisis:
- comparar reglas de descenso alternativas;
- medir población estable por categoría;
- medir tiempo medio de permanencia;
- medir flujo ascenso/descenso;
- medir probabilidad de categorías vacías.

Hipótesis a probar:
- ascenso: #1 + 3 victorias consecutivas;
- descenso candidato: último + 5 derrotas consecutivas;
- otras variantes si 5 no compensa matemáticamente.

La regla final debe salir de simulación, no de preferencia estética.

### B. No-show objetado
Existe una posible inconsistencia:
un no-show objetado/indeterminado suma `monthly_miss_streak` a ambas parejas en código, pero la regla dice que la auto-pausa debe depender de incumplimientos atribuibles.

No corregir sin actualizar:
- código;
- `PROJECT_RULES.md`;
- `DECISIONS.md`;
- tests;
- auditoría.

## 6. Regla de cambios

Todo cambio significativo debe actualizar en el mismo lote:
- código;
- tests;
- `PROJECT_RULES.md` si cambia una regla;
- `DECISIONS.md` si se toma una decisión;
- `AUDIT_2026-09-20.md` si corrige un bug;
- `PROJECT_JOURNEY.md` si cambia el rumbo;
- este `START_HERE.md` si cambia el checkpoint o el próximo paso.

## 7. Qué NO hacer

- no reintroducir runtime legacy;
- no volver a aplicar ZIPs viejos;
- no cambiar reglas deportivas sin simulación previa;
- no usar Admin para tareas que debe resolver el sistema;
- no cambiar identidad visual aprobada;
- no asumir que una prueba manual reemplaza stress tests;
- no depender del resumen automático del chat como única memoria.

## 8. Próximo paso exacto

Antes de más UI o features:

**simular variantes de descenso para corregir la deriva hacia arriba y elegir una regla estable a largo plazo.**

Después:
1. fijar regla;
2. actualizar docs/tests;
3. corregir bug de no-show atribuible;
4. stress test integral;
5. recién después continuar con pruebas reales de pareja/rueda.
