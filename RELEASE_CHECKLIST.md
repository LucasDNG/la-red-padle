# Release checklist

## Checkpoint actual
- [x] Neon nueva creada.
- [x] Backend local conectado a Neon.
- [x] Registro DNI + frente/dorso.
- [x] Admin privado.
- [x] Verificación de identidad real.
- [x] Purga documental al verificar.
- [x] Reenvío documental implementado.
- [x] Layout/identidad visual recuperados.
- [x] Tests puros actuales 40/40 verdes.
- [x] Simulación longitudinal 5/10/20 años con variantes y válvula 2/3 validada.
- [x] Push del checkpoint actual.
- [x] CI del checkpoint actual verde.

## Funcional deportivo pendiente
- [x] dos jugadores verificados;
- [x] invitación/aceptación;
- [x] pareja única;
- [x] categoría/posición;
- [x] primera asignación de rueda;
- [x] propuesta/aceptación de programación;
- [x] carga de resultado;
- [x] confirmación/auto-validación;
- [x] movimiento de ranking;
- [x] ascenso/descenso;
- [x] no-show;
- [x] extensión extraordinaria;
- [x] lesión/abandono;
- [x] pausa/reactivación;
- [x] disolución;
- [x] disciplina.

## Seguridad/operación
- [x] probar con Node 22 real;
- [x] eliminar bypass `rejectUnauthorized:false` y validar TLS por configuración; conexión Neon final todavía debe pasar preflight real;
- [x] TOTP fail-closed y requisitos de secreto automatizados;
- [x] generador local de secretos JWT/TOTP preparado;
- [ ] TOTP Admin real configurado y probado con autenticador;
- [x] WhatsApp sender con retries/dedupe y Graph version configurable;
- [ ] WhatsApp Meta real configurado y mensaje de prueba entregado;
- [x] retries/outbox probados;
- [x] rate limiting revisado; contador por IP + endpoint en auth, con limitación conocida de memoria local por instancia;
- [x] procedimiento `PRODUCTION_RECOVERY.md` preparado;
- [ ] plan + restore window real de Neon confirmados;
- [ ] RPO/RTO de recuperación acordados;
- [ ] prueba de recuperación aislada completada;
- [ ] backup externo definido si se necesita más retención que Instant Restore;
- [x] pruebas PostgreSQL/concurrencia 45/45 verdes;
- [x] logs de errores sanitizados para no persistir PII/SQL/details en producción;
- [x] CORS de producción validado como orígenes HTTPS puros.

## Migración producción
- [x] migración de abandono automatizada al startup, idempotente y serializada con advisory lock; `npm run migrate:prod` disponible manualmente;
- [ ] confirmar startup productivo exitoso contra la Neon real y patch presente;

## Preflight
- [x] preflight bloquea reloj global pausado y patch de abandono incompleto;
- [x] workflow manual de preflight productivo preparado y validado en CI con GitHub Environment `production`;
- [x] modo `core`/`full` validado en CI;
- [x] comandos `preflight:core` / `preflight:full` preparados y verdes en CI;
- [x] guía exacta `PRODUCTION_ENVIRONMENT_SETUP.md` y validación de inputs preparadas y verdes en CI;
- [ ] secrets/variables core cargados en el Environment `production`;
- [ ] preflight `core` verde contra Neon real;
- [ ] secrets/variables WhatsApp cargados;
- [ ] preflight `full` verde antes del release público.

## Deploy
- [x] GitHub Actions verde;
- [ ] Render health verde contra health DB-aware;
- [ ] confirmar si el servicio Render existente se administra manualmente o mediante Blueprint; `render.yaml` solo gobierna servicios vinculados/sincronizados como Blueprint;
- [x] Vercel build/deploy status verde reportado a GitHub;
- [x] `VITE_API_URL` validado en build productivo y Vercel nuevamente verde;
- [ ] variables producción correctas;
- [ ] al menos una cancha activa;
- [x] smoke público automatizado preparado (`production-smoke.yml`);
- [x] smoke ligado al Environment `production` con URLs validadas como orígenes HTTPS;
- [ ] smoke público ejecutado contra Render/Vercel reales;
- [ ] smoke completo autenticado/UX en producción.

## Legal
- [ ] términos revisados profesionalmente en Argentina;
- [ ] privacidad/DNI revisados;
- [ ] riesgos revisados;
- [ ] conducta revisada;
- [ ] seguro/RC/accidentes evaluado.

Solo después de todo lo anterior: **lanzamiento público**.
