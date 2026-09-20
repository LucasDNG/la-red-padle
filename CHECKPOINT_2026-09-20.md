# Checkpoint de estabilización — 2026-09-20

Este checkpoint representa el estado real de LA RED inmediatamente antes del próximo push y de la búsqueda sistemática de inconsistencias/bugs.

## Versión de código de referencia
- candidato completo: `LA_RED_FINAL_2026-09-20_v10.zip`
- package: `5.0.8`
- motor: `wheel-v2`
- backend: Node + Express
- frontend: React + Vite
- DB: PostgreSQL / Neon
- timezone oficial: `America/Argentina/Buenos_Aires`

## Estado real ya probado localmente

### Base
- La Neon histórica fue eliminada accidentalmente antes del corte y ya no existe como backup.
- Se creó una Neon nueva y limpia.
- `database/schema.sql` fue cargado sobre la base nueva.
- La base recibió también los cambios posteriores de identidad documental/reenvío necesarios para llegar al esquema actual.
- La conexión local backend → Neon funciona.

### Backend
- `/api/health` funciona con `wheel-v2`.
- El error inicial de `DATABASE_URL` vieja fue resuelto.
- El crash por export faltante `requestIdentityResubmission` fue corregido.
- El error PostgreSQL `42P08` al verificar identidad fue corregido.
- La verificación administrativa real fue probada con éxito.
- La documentación temporal de DNI se purga al cerrar la verificación.

### Identidad y cuentas
- registro con DNI;
- frente + dorso obligatorios;
- cuenta `pending` hasta revisión;
- Admin puede ver frente/dorso;
- Admin puede verificar/rechazar;
- Admin puede pedir nuevas fotos sin rechazar la cuenta;
- jugador puede reenviar desde Mi cuenta;
- login jugador separado del login Admin;
- ruta Admin privada: `/admin-la-red`;
- primer propietario se promueve por consola.

### Frontend
- identidad visual de LA RED restaurada;
- cancha nocturna de pádel + azul/verde + glassmorphism;
- navegación Login ↔ Crear cuenta corregida;
- pasada global de espaciado/jerarquía aplicada a páginas internas;
- header autenticado y cards reorganizados.

### Admin
- acceso privado funcionando;
- panel visible;
- identidad pendiente funcionando;
- verificación real funcionando;
- auditoría/canchas/disputas/disciplina/salud del sistema están implementados y pendientes de recorrido completo con datos reales.

### Tests
- suite pura/simulación: 14/14 verde en el candidato actual.
- simulación larga incluida en la suite.
- los tests automáticos todavía no sustituyen las pruebas de integración PostgreSQL/concurrencia que faltan.

## No probado todavía de punta a punta
- formación de pareja completa con dos jugadores verificados;
- invariantes reales de membresía bajo concurrencia;
- primera asignación automática de rueda;
- propuesta/aceptación de fecha y cancha;
- extensión extraordinaria;
- no-show;
- carga/confirmación/disputa/auto-validación de resultado;
- ladder swap;
- ascenso/descenso;
- pausa/reactivación;
- disolución;
- disciplina real;
- WhatsApp real con Meta;
- TOTP Admin real;
- Render/Vercel contra la Neon nueva;
- build/gates de producción completos.

## Entorno local a normalizar antes del release
- El proyecto declara Node 22, pero durante pruebas se observó Node 24 local. Antes del release hay que probar con Node 22.
- La connection string actual genera un warning de `pg` por `sslmode=require`; antes del release se debe revisar la configuración recomendada y dejarla explícita/estable.
- WhatsApp y TOTP todavía pueden estar sin configurar localmente.

## Regla para continuar
Desde este checkpoint no se agregan funciones por intuición. El siguiente bloque es:

**push → verificar repo/CI → recorrer producto real → registrar bug/inconsistencia → corregir → actualizar docs/tests en el mismo cambio.**

Los `.md` son la memoria oficial del proyecto. Si chat y documentación difieren, primero se corrige la documentación y luego se implementa.
