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

## Estado local confirmado
- Neon nueva creada y conectada.
- Base histórica eliminada accidentalmente antes del corte.
- Backend local funcionando.
- registro con DNI + frente/dorso funcionando.
- Admin privado `/admin-la-red` funcionando.
- verificación de identidad probada correctamente.
- purga de documentación temporal probada.
- reenvío de DNI implementado.
- layout/identidad visual restaurados y páginas internas reorganizadas.
- tests del candidato: 15/15 verdes.

## Pendiente principal
El siguiente bloque es auditoría funcional del deporte:
**pareja → rueda → programación → resultado → ranking**, y luego edge cases.

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
Compara 20 años de la regla antigua de descenso contra la válvula 2/3 actual.
