# LA RED Pádel San Pedro

Liga de pádel por parejas para San Pedro, Buenos Aires.

## Fuente de verdad funcional

Antes de tocar reglas revisar:

- `PROJECT_RULES.md`
- `DECISIONS.md`
- `TEST_SCENARIOS.md`

## Tecnología

Backend: Node.js + Express + PostgreSQL/Neon.

Frontend: React + Vite + React Router + Axios + PWA.

Producción:

- API: `https://la-red-padle-api.onrender.com`
- Frontend: `https://la-red-padle.vercel.app`


## Núcleo de esta versión

- `src/competition.js`: escalera, ELO, plazos, penalizaciones, deuda, ascensos/descensos y récord de Primera.
- `src/matchResolution.js`: confirmación oficial de resultados usando el motor competitivo nuevo.
- `src/pairManagement.js`: lectura consolidada de pareja y récord de Primera.
- `frontend/src/LeagueV2.jsx`: Mi Liga sin formulario duplicado de pareja.
- `frontend/src/HomeRecord.jsx`: récord histórico de Primera en la portada.

## Reglas principales actuales

- Categorías 1ª a 7ª sin límite de parejas.
- El ranking es una escalera: si una pareja de abajo vence a una de arriba, intercambian posiciones.
- Parejas sin partidos: ELO 0 y fondo de categoría.
- #1 + 3 victorias consecutivas: asciende, salvo Primera.
- Último + 3 derrotas consecutivas: desciende, salvo 7ª.
- El descenso no desplaza al líder de la categoría inferior; entra desde #2 y puede caer más abajo por deuda de posición.
- Desafío pendiente: 30 días para aceptar. No aceptar => la pareja desafiada pierde un puesto.
- Desafío aceptado: 90 días para jugar/resolver. Vencer => ambas parejas pierden un puesto.
- Si una penalización no puede bajar a una pareja porque ya está última, se acumula como `position_penalty_debt`.
- Solo el #1 de Primera puede superar 2000: suma +1 por cada defensa exitosa.
- El récord histórico de Primera se conserva permanentemente.

## Migraciones

`database/schema.sql` es solo para una base nueva.

**Nunca ejecutar `database/schema.sql` sobre producción existente.**

Para la base existente, aplicar las migraciones fechadas en orden. La migración de esta versión es:

`database/2026-09-20-competition-rules.sql`

En DBeaver, ejecutarla una sentencia por vez. Una función PL/pgSQL completa cuenta como una sola sentencia.

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

## Variables

Producción frontend:

```text
VITE_API_URL=https://la-red-padle-api.onrender.com/api
```

Render:

```text
FRONTEND_URL=https://la-red-padle.vercel.app
```
