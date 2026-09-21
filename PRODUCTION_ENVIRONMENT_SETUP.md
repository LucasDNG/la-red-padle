# PRODUCTION_ENVIRONMENT_SETUP.md — LA RED Pádel

## Objetivo
Configurar una sola vez el GitHub Environment `production` para poder ejecutar el workflow manual `LA RED production preflight` contra la infraestructura real sin guardar secretos en Git ni pegarlos en chats.

## Dónde configurarlo
GitHub → repositorio `LucasDNG/la-red-padle` → Settings → Environments → `production`.

Si el Environment todavía no existe, crearlo con el nombre exacto `production`.

## Secrets
Cargar como **Environment secrets**:

| Nombre | Origen |
|---|---|
| `PROD_DATABASE_URL` | Connection string de la Neon final |
| `PROD_JWT_SECRET` | Salida `JWT_SECRET` de `npm run generate:secrets -- --account=admin` |
| `PROD_ADMIN_TOTP_SECRET` | Salida `ADMIN_TOTP_SECRET` del mismo comando |
| `PROD_WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Cloud API |
| `PROD_WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API |

## Variables
Cargar como **Environment variables**:

| Nombre | Valor esperado |
|---|---|
| `PROD_FRONTEND_URL` | `https://la-red-padle.vercel.app` o el dominio final real |
| `PROD_WHATSAPP_TEMPLATE_NAME` | Nombre exacto de la plantilla aprobada |
| `PROD_WHATSAPP_GRAPH_VERSION` | Versión Graph configurada, formato `vN.N` |
| `PROD_WHATSAPP_TEMPLATE_LANGUAGE` | Normalmente `es_AR` |

## TOTP
El comando local:

```bash
npm run generate:secrets -- --account=admin
```

también imprime `ADMIN_TOTP_URI=otpauth://...`.

Cargar ese URI en la app autenticadora. No guardar el URI ni el secreto TOTP en el repositorio.

## Ejecutar el preflight
Desde GitHub: Actions → `LA RED production preflight` → Run workflow.

Desde una terminal que ya tenga cargadas las variables reales:

```bash
npm run preflight:core
npm run preflight:full
```

Los dos comandos son portables y no requieren definir `PREFLIGHT_MODE` manualmente.

El workflow permite elegir:

- `core`: valida Neon/TLS, JWT, frontend/CORS, TOTP, engine/timezone, reloj global, patch, Admin, cancha e invariantes DB. **No exige Meta WhatsApp.**
- `full`: ejecuta todo lo anterior y además exige la configuración completa de WhatsApp. **Este modo es obligatorio antes del release público.**

El primer paso valida solo los inputs requeridos por el modo elegido y, si falta alguno, muestra **solo los nombres faltantes**, nunca sus valores.

Después `npm run preflight:prod` valida de forma read-only:
- configuración productiva;
- TLS de PostgreSQL;
- engine `wheel-v2`;
- timezone;
- reloj global no pausado;
- patch de abandono completo;
- al menos un Admin verificado;
- al menos una cancha activa;
- invariantes de `database/verify.sql`;
- estado del outbox WhatsApp.

## Qué no hace
Este workflow:
- no crea usuarios;
- no aplica migraciones;
- no modifica ranking;
- no mueve parejas;
- no escribe secretos;
- no envía mensajes WhatsApp.

Las migraciones productivas siguen ejecutándose al startup del backend o mediante `npm run migrate:prod`.

## Resultado esperado
Primero puede ejecutarse `core` para destrabar Neon/Render sin esperar Meta. Antes del release debe ejecutarse `full` y quedar verde. Si falla por un input ausente, cargar solo ese input y volver a ejecutarlo. Si falla dentro del preflight, corregir la infraestructura/configuración indicada antes de continuar con smoke de producción.
