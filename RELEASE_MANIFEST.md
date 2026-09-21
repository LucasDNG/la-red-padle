# Release Manifest — checkpoint pre-auditoría

## Candidato de referencia
- paquete completo: `LA_RED_FINAL_2026-09-20_v11.zip`
- package version: `5.0.9`
- motor: `wheel-v2`
- estado: **candidato en estabilización, no release final**

## Bloques incorporados hasta este checkpoint
- reconstrucción limpia sin runtime legacy;
- schema consolidado;
- rueda automática;
- resultados/versiones;
- ranking/escalera;
- categorías individuales;
- invitaciones/parejas;
- pausa/disolución;
- disciplina;
- notificaciones/outbox;
- Admin;
- login Admin privado;
- DNI + frente/dorso;
- reenvío documental;
- purga documental;
- identidad visual restaurada;
- orden visual global;
- fix navegación login/registro;
- fix import/export de reenvío;
- fix PostgreSQL `42P08` en verificación.

## Cambios posteriores al checkpoint

- válvula longitudinal de descenso 2/3 según diferencia de población adyacente;
- simulador reproducible de balance a 5/10/20 años con variantes P3/R3, P3/R5, gaps 4/5/6 y P4/R3;

## Validación conocida
- backend syntax/check en candidatos previos: verde;
- suite base: 26/26 tests puros + 39/39 integración PostgreSQL verdes en CI; 29/29 tests puros + 40/40 integración PostgreSQL + `verify:db` + frontend build verdes; logging seguro/rate-limit y retry real de outbox confirmados;
- verificación de identidad probada manualmente con éxito;
- base Neon nueva conectada.

## No declarar release hasta completar
El corazón funcional/deportivo ya está cubierto automáticamente. Pendientes externos/operativos:
- aplicar patch de abandono en la Neon existente;
- ejecutar `npm run preflight:prod` con variables reales;
- WhatsApp Meta real;
- TOTP Admin real;
- confirmar backups/PITR Neon;
- Render health + Vercel producción;
- al menos una cancha activa real;
- smoke UX final;
- revisión legal/seguro.

Los hashes de ZIPs intermedios no son fuente de verdad. La fuente de verdad es el repo después del próximo push + estos `.md`.
