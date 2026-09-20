# Aplicar esta versión

## Orden seguro

1. Copiar el contenido del ZIP sobre la raíz del proyecto y reemplazar los archivos indicados.
2. Antes de hacer `git push`, aplicar en la base existente:
   - `database/2026-09-20-competition-rules.sql`
3. En DBeaver ejecutar una sentencia SQL por vez.
   - Una función `CREATE OR REPLACE FUNCTION ... $$ ... $$;` completa cuenta como una sola sentencia.
4. No ejecutar `database/schema.sql` sobre la base existente.
5. Desde la raíz:

```bash
npm run check
```

6. Luego:

```bash
cd frontend
npm run build
```

7. Si ambos terminan bien:

```bash
cd ..
git status
git add -A
git commit -m "Actualiza motor competitivo de La Red"
git push origin main
```

## Por qué la migración va antes del push

Render puede desplegar automáticamente el commit nuevo. El backend de esta versión usa columnas nuevas (`position_penalty_debt`, `first_place_defenses` y nuevos plazos de desafíos), por lo que la base debe estar preparada antes de que el código llegue a producción.
