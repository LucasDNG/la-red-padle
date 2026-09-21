# LA RED Pádel · San Pedro

Liga continua de pádel por parejas. Estado actual: **candidato wheel-v2 en estabilización**, todavía no release público final.

## Stack
- Node.js 22 objetivo + Express 5
- PostgreSQL / Neon
- React 19 + Vite 7
- Render + Vercel
- Meta WhatsApp Cloud API mediante outbox

## Motor
`wheel-v2` es el único motor competitivo activo.

## Fuente de verdad
1. `PROJECT_RULES.md` — reglas vigentes.
2. `DECISIONS.md` — decisiones vigentes, sin capas reemplazadas.
3. `ARCHITECTURE.md` — construcción técnica.
4. `TEST_SCENARIOS.md` — invariantes/casos.
5. `CHECKPOINT_2026-09-20.md` — estado real probado y próximo paso.
6. `AUDIT_2026-09-20.md` — bugs/hallazgos.
7. `PROJECT_JOURNEY.md` — cómo llegamos a las decisiones actuales.
8. `LEGAL_AND_BUSINESS.md` — requisitos legales/comerciales.

## Estado automatizado confirmado
- Neon nueva creada y conectada.
- Base histórica eliminada accidentalmente antes del corte.
- Backend local funcionando.
- registro con DNI + frente/dorso funcionando.
- Admin privado `/admin-la-red` funcionando.
- verificación de identidad probada correctamente.
- purga de documentación temporal probada.
- reenvío de DNI implementado.
- layout/identidad visual restaurados y páginas internas reorganizadas.
- tests puros/simulación/configuración: 36/36 verdes.
- integración PostgreSQL: 43/43 verde.
- `verify:db`: schema + invariantes verdes en PostgreSQL 16.
- frontend build verde en CI.

## Pendiente principal
El corazón deportivo y sus edge cases principales ya están cubiertos automáticamente. El foco actual es **release hardening y operación real**: preflight de producción, SSL/Neon, TOTP real, WhatsApp Meta real, Render/Vercel, backups/PITR y smoke UX/legal.

## Local
Backend:
```bash
npm install
npm start
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

En desarrollo también existe `npm run dev` con watcher para backend, pero para diagnosticar fallos se prefiere `npm start`.

## Tests
```bash
npm run check
npm test
npm run verify:db
npm run test:integration
```

## Administración
- login reservado: `/admin-la-red`
- guía: `ADMIN_GUIDE.md`
- primer propietario: `npm run admin:promote -- <DNI>`

## Identidad
El alta exige DNI numérico y frente/dorso. La cuenta queda `pending` hasta revisión. Las imágenes viven temporalmente en `identity_documents` y la fila activa se elimina al verificar/rechazar. Si la foto no sirve, Admin pide nuevas fotos y el usuario reenvía sin crear otra cuenta.

## Deploy
Seguir `FINALIZATION_PLAN.md` y `RELEASE_CHECKLIST.md`.

## Simulación longitudinal
```bash
npm run simulate:balance
```
Compara variantes de ascenso/descenso a 5, 10 y 20 años, incluida la hipótesis R5 y las válvulas poblacionales adaptativas.


## Preflight de producción
Con las variables reales de producción cargadas:

```bash
npm run preflight:prod
```

El preflight no modifica datos. Valida secretos/configuración, TLS PostgreSQL, motor/timezone, presencia de Admin y cancha activa, y ejecuta los controles de `database/verify.sql`.


## Deploy automatizado
El backend incluye `render.yaml`. Al arrancar con `NODE_ENV=production`, el backend ejecuta automáticamente las migraciones idempotentes antes de abrir el puerto. La rutina usa un advisory lock PostgreSQL para evitar carreras entre instancias.

`npm run migrate:prod` queda disponible para ejecución manual. Render usa `/api/health` como health check; ese endpoint valida PostgreSQL y que el motor almacenado sea `wheel-v2`. Los secretos de producción no están en el repo y deben cargarse en Render.


## Smoke público de producción
Con backend y frontend desplegados:

```bash
PROD_API_URL=https://la-red-padle-api.onrender.com \
PROD_FRONTEND_URL=https://la-red-padle.vercel.app \
npm run smoke:prod
```

También existe el workflow manual `LA RED production smoke` en GitHub Actions. Es no destructivo y valida health/DB, CORS, endpoints públicos y que el frontend cargue la SPA.


## TOTP de producción
`ADMIN_TOTP_SECRET` debe ser Base32 de al menos 32 caracteres (aprox. 160 bits) y no puede reutilizar `JWT_SECRET`. En producción, si falta ese secreto, el login Admin queda cerrado en lugar de degradar a contraseña sola.

`FRONTEND_URL` debe contener únicamente orígenes HTTPS, sin path/query/fragmento; el backend los normaliza antes de configurar CORS.


## Generar secretos de producción
No inventes ni pegues secretos en chats. Generarlos localmente:

```bash
npm run generate:secrets -- --account=admin
```

El comando imprime:
- `JWT_SECRET` aleatorio;
- `ADMIN_TOTP_SECRET` Base32 de 160 bits;
- un `otpauth://` compatible con apps autenticadoras.

Los valores solo se imprimen en la terminal: no se escriben en archivos ni se commitean.


Un `render.yaml` requiere vincular un Blueprint en Render para gobernar un servicio existente. Si el backend continúa configurado manualmente en Render, la migración sigue siendo segura porque corre dentro del startup de Node antes de abrir tráfico.
