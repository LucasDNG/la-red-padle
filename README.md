# LA RED Pádel San Pedro

Liga de pádel por parejas para San Pedro, Buenos Aires.

## Tecnología

### Backend

- Node.js
- Express
- PostgreSQL
- Neon
- JWT
- Render

### Frontend

- React
- Vite
- React Router
- Axios
- PWA
- Vercel

## Estructura

- `database/schema.sql`: esquema completo para una base nueva.
- `database/2026-09-19-match-confirmation.sql`: migración para bases existentes que todavía no tengan `match_submissions`.
- `src/app.js`: rutas HTTP de la API.
- `src/league.js`: reglas centrales de la liga.
- `src/playerArea.js`: área y consultas del jugador.
- `src/matchResults.js`: carga, confirmación y disputa de resultados.
- `src/adminReports.js`: moderación de denuncias.
- `frontend/src/App.jsx`: aplicación pública y Mi Liga.
- `frontend/src/Results.jsx`: confirmación de resultados.
- `frontend/src/AdminReports.jsx`: administración.
- `frontend/src/styles.css`: identidad visual global.

## Reglas de categorías

- 1ª a 3ª: máximo 10 parejas por categoría.
- 4ª a 6ª: máximo 30 parejas por categoría.
- 7ª: sin límite.
- Una pareja nueva ocupa la última posición disponible.
- No existen partidos de ubicación.

## Ascensos

La pareja líder de una categoría que consiga 3 victorias consecutivas intercambia su lugar con la última pareja de la categoría inmediatamente superior.

La pareja #1 de Primera no asciende.

Después del intercambio se reinicia la racha que produjo el movimiento.

## Descensos

La última pareja de una categoría que acumule 3 derrotas consecutivas intercambia su lugar con la líder de la categoría inmediatamente inferior.

Si no existe una categoría inferior con una pareja disponible, no se produce descenso.

Después del intercambio se reinicia la racha que produjo el movimiento.

## Desafíos

- Se pueden tener varios desafíos aceptados simultáneamente.
- Cada desafío aceptado tiene su propio plazo de 30 días.
- La aceptación de un desafío no bloquea la aceptación de otro.
- La rueda prioriza historial de cruces y antigüedad.

## Vencimientos

Si pasan 30 días desde la aceptación y el partido no fue jugado:

- el desafío vence;
- cada pareja recibe -10 ELO;
- la penalización se aplica una sola vez;
- no se asigna culpa automáticamente.

## Resultados

Una pareja puede cargar el resultado de un desafío aceptado.

El resultado queda pendiente hasta que la otra pareja:

- lo confirme; o
- indique que no coincide.

Al confirmar:

- se crea el partido oficial;
- se actualizan las rachas;
- se comprueban ascensos y descensos;
- el desafío pasa a `played`.

Si existe desacuerdo:

- el resultado no afecta ranking ni rachas;
- queda pendiente de resolución administrativa.

El administrador puede validar el resultado presentado o rechazarlo.

## Denuncias

Motivos admitidos:

- negativa para coordinar;
- no se presentó;
- otro motivo con detalle.

La disciplina automática utiliza una sola ventana móvil de 180 días.

- 3 parejas denunciantes distintas en 180 días: `observed`.
- 5 parejas denunciantes distintas en 180 días: `review`.

Los reportes descartados no cuentan para esos umbrales.

El historial nunca se elimina después de 180 días.

Administración conserva:

- denuncias recibidas históricas;
- denuncias recibidas de los últimos 180 días;
- denunciantes distintos;
- denuncias realizadas históricas;
- denuncias realizadas de los últimos 180 días;
- parejas denunciadas distintas;
- historial completo de cada reporte.

## Base de datos existente

Antes de desplegar el flujo de confirmación de resultados:

```sql
SELECT to_regclass('public.match_submissions');
```

Si devuelve `NULL`, ejecutar una sola vez:

```text
database/2026-09-19-match-confirmation.sql
```

No ejecutar `database/schema.sql` sobre una base que ya contiene datos.

## Desarrollo backend

```bash
npm install
npm run check
npm start
```

## Desarrollo frontend

```bash
cd frontend
npm install
npm run build
```

## Producción

Backend:

```text
https://la-red-padle-api.onrender.com
```

Health:

```text
https://la-red-padle-api.onrender.com/api/health
```

El resultado esperado es:

```json
{
  "ok": true,
  "name": "LA RED Pádel"
}
```

En Vercel usar:

```text
Root Directory: frontend
```

y la variable:

```text
VITE_API_URL=https://la-red-padle-api.onrender.com/api
```
