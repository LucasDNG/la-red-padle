# Release Manifest — checkpoint pre-auditoría

## Candidato de referencia
- paquete completo: `LA_RED_FINAL_2026-09-20_v10.zip`
- package version: `5.0.8`
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

## Validación conocida
- backend syntax/check en candidatos previos: verde;
- suite actual: 14/14 tests verdes;
- verificación de identidad probada manualmente con éxito;
- base Neon nueva conectada.

## No declarar release hasta completar
- pareja;
- rueda real;
- programación;
- resultado;
- ranking;
- edge cases;
- integración PostgreSQL/concurrencia;
- WhatsApp real;
- TOTP real;
- CI/deploy de producción;
- revisión legal/seguro.

Los hashes de ZIPs intermedios no son fuente de verdad. La fuente de verdad es el repo después del próximo push + estos `.md`.
