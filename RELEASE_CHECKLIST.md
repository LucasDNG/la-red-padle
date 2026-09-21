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
- [x] Tests puros actuales 20/20 verdes.
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
- [ ] lesión/abandono;
- [x] pausa/reactivación;
- [x] disolución;
- [ ] disciplina.

## Seguridad/operación
- [x] probar con Node 22 real;
- [x] eliminar bypass `rejectUnauthorized:false` y validar TLS por configuración; conexión Neon final todavía debe pasar preflight real;
- [ ] TOTP Admin configurado;
- [ ] WhatsApp Meta configurado;
- [ ] retries/outbox probados;
- [ ] rate limiting revisado;
- [ ] backups/PITR Neon confirmados;
- [x] pruebas PostgreSQL/concurrencia (35/35);
- [ ] logs sin datos sensibles.

## Preflight
- [ ] `npm run preflight:prod` verde contra la Neon y variables reales.

## Deploy
- [x] GitHub Actions verde;
- [ ] Render health verde;
- [ ] Vercel build verde;
- [ ] variables producción correctas;
- [ ] al menos una cancha activa;
- [ ] smoke completo en producción.

## Legal
- [ ] términos revisados profesionalmente en Argentina;
- [ ] privacidad/DNI revisados;
- [ ] riesgos revisados;
- [ ] conducta revisada;
- [ ] seguro/RC/accidentes evaluado.

Solo después de todo lo anterior: **lanzamiento público**.
