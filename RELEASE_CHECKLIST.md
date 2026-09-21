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
- [x] Tests puros actuales 32/32 verdes.
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
- [ ] WhatsApp Meta configurado;
- [x] retries/outbox probados;
- [x] rate limiting revisado; contador por IP + endpoint en auth, con limitación conocida de memoria local por instancia;
- [ ] backups/PITR Neon confirmados;
- [x] pruebas PostgreSQL/concurrencia 42/42 verdes;
- [x] logs de errores sanitizados para no persistir PII/SQL/details en producción;
- [x] CORS de producción validado como orígenes HTTPS puros.

## Migración producción
- [x] migración de abandono automatizada e idempotente en `npm run migrate:prod`;
- [ ] confirmar ejecución exitosa del pre-deploy contra la Neon real;

## Preflight
- [ ] `npm run preflight:prod` verde contra la Neon y variables reales.

## Deploy
- [x] GitHub Actions verde;
- [ ] Render health verde contra health DB-aware;
- [x] Vercel build/deploy status verde reportado a GitHub;
- [ ] variables producción correctas;
- [ ] al menos una cancha activa;
- [x] smoke público automatizado preparado (`production-smoke.yml`);
- [ ] smoke público ejecutado contra Render/Vercel reales;
- [ ] smoke completo autenticado/UX en producción.

## Legal
- [ ] términos revisados profesionalmente en Argentina;
- [ ] privacidad/DNI revisados;
- [ ] riesgos revisados;
- [ ] conducta revisada;
- [ ] seguro/RC/accidentes evaluado.

Solo después de todo lo anterior: **lanzamiento público**.
