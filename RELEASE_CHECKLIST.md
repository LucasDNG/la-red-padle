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
- [x] Tests actuales 15/15 verdes.
- [x] Simulación longitudinal de categorías a 20 años con válvula 2/3.
- [ ] Push del checkpoint actual.
- [ ] CI del checkpoint actual verde.

## Funcional deportivo pendiente
- [ ] dos jugadores verificados;
- [ ] invitación/aceptación;
- [ ] pareja única;
- [ ] categoría/posición;
- [ ] primera asignación de rueda;
- [ ] propuesta/aceptación de programación;
- [ ] carga de resultado;
- [ ] confirmación/auto-validación;
- [ ] movimiento de ranking;
- [ ] ascenso/descenso;
- [ ] no-show;
- [ ] extensión extraordinaria;
- [ ] lesión/abandono;
- [ ] pausa/reactivación;
- [ ] disolución;
- [ ] disciplina.

## Seguridad/operación
- [ ] probar con Node 22 real;
- [ ] revisar warning SSL y dejar connection string final;
- [ ] TOTP Admin configurado;
- [ ] WhatsApp Meta configurado;
- [ ] retries/outbox probados;
- [ ] rate limiting revisado;
- [ ] backups/PITR Neon confirmados;
- [ ] pruebas PostgreSQL/concurrencia;
- [ ] logs sin datos sensibles.

## Deploy
- [ ] GitHub Actions verde;
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
