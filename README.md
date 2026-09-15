# LA RED Pádel San Pedro

Versión 3 limpia. Proyecto exclusivo de pádel por parejas. No contiene lógica de tenis, singles, placement matches ni migraciones históricas.

## Estructura
- `database/schema.sql`: esquema completo desde cero. Es el único SQL que hay que ejecutar en una base vacía.
- `src/`: API Node/Express/PostgreSQL.
- `frontend/`: React/Vite + PWA.

## Reglas incorporadas
- Categorías 1ª-3ª: 10 parejas; 4ª-6ª: 30; 7ª ilimitada.
- Alta al último puesto de la categoría.
- Ascenso: puntero con 3 victorias consecutivas intercambia con último de la categoría superior.
- Descenso: último con 3 derrotas consecutivas intercambia con puntero de la inferior.
- Desafío aceptado: 30 días. Si vence sin partido: -10 ELO a ambas parejas, una sola vez.
- Aceptar un desafío no bloquea el siguiente de la rueda.
- Denuncias: no quiso coordinar, no se presentó u otro.
- 3 denuncias de parejas distintas en 90 días: observación. 5 en 180 días: revisión administrativa y bloqueo para crear nuevos desafíos.

## Producción
Backend: `npm install && npm start`. Frontend: Vercel con Root Directory `frontend` y `VITE_API_URL=https://TU-BACKEND/api`.
