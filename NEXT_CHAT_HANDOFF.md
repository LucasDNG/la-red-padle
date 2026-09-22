# NEXT_CHAT_HANDOFF.md — LA RED Pádel

## Instrucción obligatoria

Continuar desde el repositorio `LucasDNG/la-red-padle`, rama `main`. No reconstruir el proyecto desde memoria del chat ni desde ZIPs históricos.

Primera acción en un chat nuevo: obtener el HEAD real de `main` y comprobar GitHub Actions + status Vercel de ese HEAD. No afirmar CI verde antes de verificarlo.

Después leer, como mínimo:

1. `CHECKPOINT_2026-09-20.md`
2. `PROJECT_RULES.md`
3. `DECISIONS.md`
4. `SIMULATION_AUDIT_2026-09-20.md`
5. `AUDIT_2026-09-20.md`
6. `TEST_SCENARIOS.md`
7. `ARCHITECTURE.md`
8. `PROJECT_JOURNEY.md`
9. `RELEASE_MANIFEST.md`
10. `RELEASE_CHECKLIST.md`
11. `FINALIZATION_PLAN.md`
12. `PRODUCTION_ENVIRONMENT_SETUP.md`
13. `PRODUCTION_RECOVERY.md`

## Estado consolidado

- package: `5.0.9`.
- motor activo: `wheel-v2`.
- Neon histórica: eliminada; no asumir recuperable.
- Neon nueva: base de referencia actual.
- runtime objetivo: Node 22.
- 65/65 tests puros verdes en el último checkpoint verificado.
- 45/45 integración PostgreSQL verdes.
- `verify:db` verde.
- frontend build verde.
- Vercel `success` en el último checkpoint verificado.
- el corazón deportivo, concurrencia, edge cases y lesión/abandono están cubiertos automáticamente.
- liveness/readiness, migrations startup, shutdown, pool errors, seguridad HTTP, no-store, request correlation, preflight y production smoke están implementados y testeados.
- backend/preflight/smoke usan `npm ci`.
- workflows tienen `contents: read` y timeouts.
- `frontend/.vite/` ya no está versionado.

El último commit de código/higiene verificado antes de esta normalización documental fue `5ad90c16f2e000d3ceb2f6bfed4d7e737563402b` (`Limpia cache generada de Vite`): GitHub Actions y Vercel terminaron `success`. Si `main` está más adelante, verificar el HEAD nuevo en lugar de reutilizar ese estado.

## Regla deportiva congelada de equilibrio

No reabrir por intuición.

- ascenso: #1 + 3 victorias consecutivas;
- descenso: última + 3 derrotas consecutivas;
- válvula: si la categoría tiene al menos 5 parejas activas más que la inferior, el umbral de descenso baja a 2;
- el cambio de población por sí solo no mueve parejas;
- R5 fue descartado matemática y longitudinalmente.

La evidencia está en `SIMULATION_AUDIT_2026-09-20.md`.

## Metodología

- `.md` > memoria informal del chat.
- No cambiar reglas por fallas de tests sin compararlas con docs.
- Primero tests/simulaciones automáticas, después PostgreSQL, manual solo para UX/smoke.
- Distinguir fixture/test debt de bugs reales.
- Push directo a `main`.
- Actualizar checkpoint/handoff después de cambios importantes.
- No tocar ni imprimir secretos reales.
- Avanzar autónomamente todo lo posible.
- No agregar hardening especulativo si no responde a evidencia.
- No interpretar DNS bloqueado del entorno del chat como caída de Render/Vercel.

## Pendientes externos reales

1. cargar secrets/vars core del Environment `production`;
2. ejecutar `preflight:core` contra Neon real;
3. confirmar startup productivo Render y `/api/health`;
4. ejecutar production smoke real contra Render/Vercel;
5. probar TOTP con autenticador real;
6. confirmar plan/restore window Neon, definir RPO/RTO y completar drill aislado;
7. configurar Meta WhatsApp + mensaje real;
8. ejecutar `preflight:full`;
9. smoke UX autenticado final;
10. revisión legal/seguro Argentina.

## Deuda técnica no bloqueante

Generar legítimamente `frontend/package-lock.json` con npm y solo después cambiar el frontend de CI de `npm install` a `npm ci`. No fabricar el lock manualmente.

## Nota de continuidad

La cronología extensa está en `AUDIT_2026-09-20.md`, `CHECKPOINT_2026-09-20.md` y `PROJECT_JOURNEY.md`. Este handoff debe mantenerse corto y representar únicamente el estado vigente.
