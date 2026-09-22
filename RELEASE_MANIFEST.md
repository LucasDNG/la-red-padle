# Release Manifest — estado actual

## Candidato de referencia
- fuente de verdad: repositorio `LucasDNG/la-red-padle`, rama `main`;
- package: `5.0.9`;
- motor: `wheel-v2`;
- estado: **candidato técnicamente estabilizado, no release público final**.

Los ZIPs históricos `v1`…`v11` no son fuente de verdad y no deben reaplicarse sobre `main`.

## Validación automatizada vigente
- 67/67 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Node 22 + PostgreSQL 16;
- Vercel `success` en el último checkpoint verificado.

## Bloques cerrados
- motor deportivo `wheel-v2`;
- escalera/ELO/ascenso/descenso y válvula poblacional;
- pareja/rueda/programación/resultados;
- no-show/extensión/pausa/disolución/disciplina;
- lesión/abandono;
- concurrencia/idempotencia PostgreSQL;
- schema/patch/verify;
- identidad DNI + reenvío/purga;
- Admin privado + TOTP fail-closed en código;
- outbox WhatsApp con dedupe/retry y errores sanitizados;
- TLS/config preflight;
- migrations startup con advisory lock;
- liveness/readiness;
- graceful shutdown y pool errors;
- headers/no-store/request correlation;
- smoke público automatizado;
- backend/preflight/smoke con `npm ci`;
- workflows least-privilege/timeouts;
- caché generada `frontend/.vite/` fuera del repo.

## Pendientes de release
- secrets/variables core del Environment `production`;
- `preflight:core` real contra Neon;
- Render startup + `/api/health`;
- production smoke real;
- TOTP con autenticador real;
- restore window/RPO/RTO + drill Neon;
- Meta WhatsApp + mensaje real;
- `preflight:full`;
- smoke UX autenticado;
- revisión legal/seguro Argentina.

## Deuda no bloqueante
Generar legítimamente `frontend/package-lock.json` y después migrar el job frontend a `npm ci`.

Antes de declarar release, verificar el HEAD actual y sus checks; no reutilizar el estado de un commit anterior.
