# Aplicar checkpoint del camino de LA RED

Este paquete es documental. No contiene runtime ni SQL.

Reemplaza al checkpoint de producto anterior si todavía no fue aplicado.

Copiar estos archivos a la raíz del proyecto:

- PROJECT_RULES.md
- PRODUCT_VISION.md
- PROJECT_JOURNEY.md
- LEGAL_AND_BUSINESS.md
- DECISIONS.md
- TEST_SCENARIOS.md
- CHECKPOINT_2026-09-20.md
- AUDIT_2026-09-20.md
- FINALIZATION_PLAN.md
- README.md
- APPLY_THIS_VERSION.md

Después revisar el diff y hacer un único commit documental.

No ejecutar `database/schema.sql` ni ninguna migración por este checkpoint.

A partir de este punto, antes de cambios funcionales importantes se deben releer:
`PROJECT_RULES.md`, `PRODUCT_VISION.md`, `PROJECT_JOURNEY.md`, `LEGAL_AND_BUSINESS.md`, `TEST_SCENARIOS.md` y el checkpoint vigente.
