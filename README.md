# LA RED Pádel San Pedro

Liga de pádel por parejas para San Pedro, Buenos Aires.

## Fuente de verdad funcional

Antes de tocar reglas o código competitivo leer, en este orden:

1. `PROJECT_RULES.md`
2. `TEST_SCENARIOS.md`
3. `DECISIONS.md`
4. `CHECKPOINT_2026-09-20.md`
5. `AUDIT_2026-09-20.md`
6. `FINALIZATION_PLAN.md`

Si el runtime viejo contradice `PROJECT_RULES.md`, la regla vigente es la documentada; el código debe corregirse en el próximo bloque.

## Estado actual

El repositorio está en transición entre un motor candidato anterior y la rueda competitiva mensual aprobada.

**Todavía no es una versión funcional final de las nuevas reglas.**

La dirección vigente es:

- categorías 1ª–7ª sin límite;
- ranking por escalera/intercambio de posiciones;
- un solo partido de rueda abierto por pareja;
- rival asignado por la rueda;
- 30 días máximos para jugar y cargar resultado;
- 15 días para confirmar/objetar;
- auto-validación por silencio;
- `paused` después de dos incumplimientos consecutivos atribuibles;
- `inactive` reservado para pareja disuelta;
- #1 de Primera: 2000 + 1 por defensa exitosa;
- récord histórico permanente de Primera.

Los detalles todavía abiertos están listados como `PENDIENTE` en `PROJECT_RULES.md` y `AUDIT_2026-09-20.md`.

## Tecnología

Backend: Node.js + Express + PostgreSQL/Neon.

Frontend: React + Vite + React Router + Axios + PWA.

Producción:

- API: `https://la-red-padle-api.onrender.com`
- Frontend: `https://la-red-padle.vercel.app`

## Migraciones

`database/schema.sql` es solo para instalaciones nuevas.

**Nunca ejecutar `database/schema.sql` sobre producción existente.**

Las bases existentes se modifican exclusivamente mediante migraciones fechadas. En DBeaver se ejecuta una sentencia por vez; una función PL/pgSQL completa constituye una sola sentencia.

## Desarrollo

Backend:

```bash
npm install
npm run check
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Antes de la versión final se agregará una suite `npm test` que valide reglas, concurrencia e invariantes competitivos.

## Variables

Frontend producción:

```text
VITE_API_URL=https://la-red-padle-api.onrender.com/api
```

Render:

```text
FRONTEND_URL=https://la-red-padle.vercel.app
```
