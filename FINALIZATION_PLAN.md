# Plan actual de estabilización y salida a web

Este documento reemplaza el plan anterior que suponía conservar la Neon histórica. Esa base fue eliminada accidentalmente y ya no forma parte del plan.

## 1. Estado de infraestructura
- Neon final nueva: creada y en uso local.
- Neon histórica: eliminada; no existe backup histórico disponible.
- Backend local: conecta a la Neon nueva.
- Frontend local: conecta al backend por proxy.
- Producción Render/Vercel: todavía no debe considerarse migrada/final hasta completar gates.

## 2. Checkpoint actual
El checkpoint deportivo y de hardening automatizado ya está en `main`.

Estado:
- 30/30 tests puros;
- 42/42 integración PostgreSQL;
- `verify:db` verde;
- frontend build verde;
- Node 22 + PostgreSQL 16 verdes en GitHub Actions.

El bloque deploy-health también quedó verde en CI. Estado actual antes del generador de secretos: 34/34 tests puros, 42/42 integración PostgreSQL, `verify:db`, frontend build y Vercel verdes. El trabajo restante es preflight/configuración real de producción y smoke final.

## 3. Auditoría funcional automatizada
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

El recorrido deportivo principal y sus edge cases críticos ya tienen integración PostgreSQL automática. Cada hallazgo nuevo sigue registrándose primero en `AUDIT_2026-09-20.md` / `PROJECT_JOURNEY.md`; si cambia una regla, también `PROJECT_RULES.md` y `DECISIONS.md`. Toda corrección debe agregar/actualizar tests.

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
- TOTP Admin fail-closed en código; falta cargar/probar el secreto real con autenticador;
- WhatsApp Meta configurado/probado;
- al menos una cancha activa;
- backups/PITR de la Neon nueva confirmados;
- textos legales revisados profesionalmente en Argentina;
- seguro/RC/accidentes evaluado.

Antes de deploy final ejecutar con variables reales:
```bash
npm run preflight:prod
```
Debe validar TLS, configuración, Admin, cancha activa y `verify.sql` sin modificar datos.

## 4.1 Generación local de secretos
Antes de cargar Render:
```bash
npm run generate:secrets -- --account=admin
```
Copiar `JWT_SECRET` y `ADMIN_TOTP_SECRET` directamente desde la terminal a Render. Cargar el URI `otpauth://` en el autenticador. No almacenar esos valores en Git ni en documentación.

## 5. Variables Render
- `NODE_ENV=production`
- `DATABASE_URL=<Neon nueva>`
- `JWT_SECRET=<secreto largo aleatorio>`
- `FRONTEND_URL=https://la-red-padle.vercel.app`
- `ADMIN_TOTP_SECRET=<secreto TOTP>`
- variables Meta WhatsApp cuando la plantilla esté aprobada.

Start:
`npm start`

## 5.1 Blueprint Render
El repo incluye `render.yaml`:
- runtime Node;
- build con `npm ci --ignore-scripts`;
- autodeploy solo cuando los checks de la rama pasan;
- migración automática al arrancar el backend, antes de escuchar tráfico;
- health HTTP en `/api/health`;
- secretos declarados como `sync: false`, nunca hardcodeados.

La migración de abandono queda automatizada para el próximo arranque productivo del backend. No se considera aplicada a Neon hasta que Render haya arrancado exitosamente esta versión o se ejecute `npm run migrate:prod` con variables reales. La rutina usa advisory lock y es idempotente.

Health esperado:
```json
{"ok":true,"name":"LA RED Pádel","engine":"wheel-v2","timezone":"America/Argentina/Buenos_Aires"}
```

## 6. Vercel
Root: `frontend`

Variable:
`VITE_API_URL=https://la-red-padle-api.onrender.com/api`

## 6.1 Smoke público automatizado
Existe un workflow manual `.github/workflows/production-smoke.yml` que ejecuta `npm run smoke:prod` contra orígenes HTTPS configurables.

Valida sin mutar datos:
- health DB-aware y engine `wheel-v2`;
- CORS backend -> frontend;
- legal/ranking/canchas/resultados/próximos;
- respuesta HTML del frontend SPA.

Vercel ya reporta status `success` a GitHub sobre el último commit. Render todavía no reporta status/check al repo y debe validarse por separado.

## 7. Smoke final
Antes de abrir públicamente:
registro → verificación → invitación → pareja → assignment → propuesta → aceptación → resultado → confirmación → ranking.

Luego repetir con edge cases: no-show, disputa, lesión, pausa, disolución, disciplina y reenvío de DNI.

## 8. Corte
Solo después de gates verdes y smoke completo, considerar LA RED lista para lanzamiento público.
