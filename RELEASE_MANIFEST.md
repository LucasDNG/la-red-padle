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
- suite actual: 20/20 tests puros + 12/12 integración PostgreSQL verdes en CI;
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
