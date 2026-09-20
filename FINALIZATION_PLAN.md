# Plan actual de estabilización y salida a web

Este documento reemplaza el plan anterior que suponía conservar la Neon histórica. Esa base fue eliminada accidentalmente y ya no forma parte del plan.

## 1. Estado de infraestructura
- Neon final nueva: creada y en uso local.
- Neon histórica: eliminada; no existe backup histórico disponible.
- Backend local: conecta a la Neon nueva.
- Frontend local: conecta al backend por proxy.
- Producción Render/Vercel: todavía no debe considerarse migrada/final hasta completar gates.

## 2. Checkpoint/push actual
1. Copiar los `.md` de este checkpoint sobre el repo local.
2. `git add -A`
3. revisar `git status`
4. `git commit -m "Consolida checkpoint wheel-v2 e identidad"`
5. `git push origin main`
6. esperar GitHub Actions
7. verificar que el árbol remoto corresponda al candidato actual.

No hacer más cambios funcionales antes de este push.

## 3. Después del push: auditoría real
Recorrer en orden:
1. registro/login;
2. identidad y reenvío;
3. formación de pareja;
4. rueda automática;
5. programación;
6. resultados;
7. ranking/perfil;
8. pause/disolución;
9. disciplina;
10. Admin;
11. PWA/responsive.

Cada hallazgo se registra primero en `AUDIT_2026-09-20.md` / `PROJECT_JOURNEY.md`; si cambia una regla, también `PROJECT_RULES.md` y `DECISIONS.md`. La corrección debe agregar/actualizar tests.

## 4. Gates antes de producción
- Node 22 real;
- `npm run check`;
- `npm test`;
- imports/exports resueltos;
- GitHub Actions verde;
- build Vercel verde;
- Render health verde;
- `database/verify.sql` limpio;
- pruebas de integración PostgreSQL/concurrencia;
- TOTP Admin configurado/probado;
- WhatsApp Meta configurado/probado;
- al menos una cancha activa;
- backups/PITR de la Neon nueva confirmados;
- textos legales revisados profesionalmente en Argentina;
- seguro/RC/accidentes evaluado.

## 5. Variables Render
- `NODE_ENV=production`
- `DATABASE_URL=<Neon nueva>`
- `JWT_SECRET=<secreto largo aleatorio>`
- `FRONTEND_URL=https://la-red-padle.vercel.app`
- `ADMIN_TOTP_SECRET=<secreto TOTP>`
- variables Meta WhatsApp cuando la plantilla esté aprobada.

Start:
`npm start`

Health esperado:
```json
{"ok":true,"name":"LA RED Pádel","engine":"wheel-v2","timezone":"America/Argentina/Buenos_Aires"}
```

## 6. Vercel
Root: `frontend`

Variable:
`VITE_API_URL=https://la-red-padle-api.onrender.com/api`

## 7. Smoke final
Antes de abrir públicamente:
registro → verificación → invitación → pareja → assignment → propuesta → aceptación → resultado → confirmación → ranking.

Luego repetir con edge cases: no-show, disputa, lesión, pausa, disolución, disciplina y reenvío de DNI.

## 8. Corte
Solo después de gates verdes y smoke completo, considerar LA RED lista para lanzamiento público.
