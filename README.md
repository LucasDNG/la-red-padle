# LA RED Pádel · San Pedro

Liga continua de pádel por parejas. Estado actual: **candidato wheel-v2 técnicamente estabilizado; todavía no release público final**.

## Stack
- Node.js 22 + Express 5
- PostgreSQL / Neon
- React 19 + Vite 7
- Render + Vercel
- Meta WhatsApp Cloud API mediante outbox

## Motor
`wheel-v2` es el único motor competitivo activo.

## Fuente de verdad
Empezar por `START_HERE.md` y `NEXT_CHAT_HANDOFF.md`. Reglas y decisiones viven en `PROJECT_RULES.md` y `DECISIONS.md`; el estado validado en `CHECKPOINT_2026-09-20.md`; hallazgos en `AUDIT_2026-09-20.md`.

## Estado automatizado confirmado
- package `5.0.9`;
- 67/67 tests puros;
- 45/45 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Node 22/PostgreSQL 16 verdes en CI;
- Vercel status `success` en el último checkpoint verificado;
- motor deportivo, concurrencia y edge cases principales cubiertos;
- seguridad HTTP, no-store, request correlation, graceful shutdown, liveness/readiness y migrations startup cubiertos;
- preflight core/full y production smoke preparados.

No asumir un commit nuevo como verde sin consultar GitHub Actions.

## Pendiente principal
Los bloqueos principales ya son operativos: Environment `production`, preflight real contra Neon, Render health, production smoke, TOTP real, recuperación Neon, Meta WhatsApp, smoke UX y revisión legal/seguro.

## Local

Backend:
```bash
npm ci
npm start
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Frontend sigue usando `npm install` porque todavía no existe un `frontend/package-lock.json` generado legítimamente.

## Tests
```bash
npm run check
npm test
npm run verify:db
npm run test:integration
npm run simulate:balance
```

## Administración
- login reservado: `/admin-la-red`;
- guía: `ADMIN_GUIDE.md`;
- primer propietario: `npm run admin:promote -- <DNI>`.

## Producción
Seguir `FINALIZATION_PLAN.md`, `RELEASE_CHECKLIST.md`, `PRODUCTION_ENVIRONMENT_SETUP.md` y `PRODUCTION_RECOVERY.md`.

Preflight:
```bash
npm run preflight:core
npm run preflight:full
```

Smoke público:
```bash
PROD_API_URL=https://la-red-padle-api.onrender.com \
PROD_FRONTEND_URL=https://la-red-padle.vercel.app \
npm run smoke:prod
```

No pegar secretos en Git ni en chats. Generarlos localmente con:
```bash
npm run generate:secrets -- --account=admin
```
