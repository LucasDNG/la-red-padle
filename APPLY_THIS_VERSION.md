# Aplicar esta versión — ARCHIVO HISTÓRICO

> Este archivo correspondía al bloque del motor candidato `0c8b7764...` y **no describe las reglas vigentes de la rueda mensual**.
>
> No usar este archivo como guía para nuevos cambios funcionales.

La migración `database/2026-09-20-competition-rules.sql` pertenece a un hito ya aplicado durante el desarrollo del motor candidato.

Para continuar el proyecto leer:

1. `PROJECT_RULES.md`
2. `TEST_SCENARIOS.md`
3. `CHECKPOINT_2026-09-20.md`
4. `AUDIT_2026-09-20.md`
5. `FINALIZATION_PLAN.md`

Regla permanente de base:

- `database/schema.sql` es solo para una instalación nueva.
- Nunca ejecutar `database/schema.sql` sobre la base de producción existente.
- Toda modificación futura de producción debe llegar en una migración fechada nueva.
