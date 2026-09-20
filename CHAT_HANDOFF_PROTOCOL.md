# CHAT_HANDOFF_PROTOCOL.md — Protocolo anti-inconsistencias

## Objetivo
Que un chat nuevo pueda retomar LA RED sin depender de memoria conversacional.

## Antes de cerrar un chat largo
Actualizar:
- `START_HERE.md`;
- `CHECKPOINT_2026-09-20.md`;
- `AUDIT_2026-09-20.md`;
- `DECISIONS.md` solo si hubo decisión nueva;
- `PROJECT_RULES.md` solo si cambió una regla.

Luego hacer commit/push.

## Al abrir un chat nuevo
Mensaje recomendado:

> Estamos continuando LA RED Pádel. No reconstruyas nada desde memoria. Leé primero `START_HERE.md`, después `PROJECT_RULES.md`, `DECISIONS.md`, `CHECKPOINT_2026-09-20.md`, `AUDIT_2026-09-20.md` y `TEST_SCENARIOS.md` del repo `LucasDNG/la-red-padle` en `main`. Tomá esos archivos como fuente de verdad. Confirmame el commit que leíste y resumí: estado actual, bugs abiertos y siguiente paso. No propongas cambios hasta terminar esa lectura.

## Regla de seguridad de contexto
Si el asistente no puede confirmar el commit o no puede leer los `.md`, debe pedir los archivos o el ZIP documental antes de modificar código.

## Buen checkpoint
Debe responder en menos de 2 minutos:
- qué versión es;
- qué funciona;
- qué no fue probado;
- qué bugs siguen abiertos;
- cuál es el próximo paso;
- qué reglas están congeladas.

## Mala práctica
No usar como única continuidad:
- “te paso un prompt con todo”;
- resumen automático del chat;
- recordar versiones por nombre informal;
- asumir que el último ZIP sigue siendo el actual.

La continuidad debe apoyarse en repo + commit + `.md`.
