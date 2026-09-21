import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const verify=fs.readFileSync(path.resolve(__dirname,'../database/verify.sql'),'utf8');
const VERIFY_STATEMENTS=verify.split(';').map(s=>s.trim()).filter(Boolean);

export async function databasePreflight(pool,{requireTls=true}={}){
  let ssl={ssl:null,version:null,cipher:null};
  if(requireTls){
    ssl=(await pool.query(`SELECT ssl,version,cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid()`)).rows[0]||{};
    if(!ssl.ssl)throw new Error('La sesión PostgreSQL de producción no está usando TLS');
  }

  const settings=(await pool.query(`
    SELECT key,value
    FROM app_settings
    WHERE key IN('engine','timezone','league_clock_paused')
  `)).rows;
  const map=Object.fromEntries(settings.map(r=>[r.key,r.value]));
  if(map.engine!=='wheel-v2')throw new Error('app_settings.engine no es wheel-v2');
  if(map.timezone!=='America/Argentina/Buenos_Aires')throw new Error('app_settings.timezone inesperada');
  if(map.league_clock_paused===true)throw new Error('El reloj global de la liga está pausado');

  const migrationColumn=Number((await pool.query(`
    SELECT count(*) n
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='matches'
      AND column_name='abandoned_pair_id'
  `)).rows[0].n);
  const migrationConstraint=Number((await pool.query(`
    SELECT count(*) n
    FROM pg_constraint
    WHERE conname='matches_abandonment_consistency'
      AND conrelid='matches'::regclass
  `)).rows[0].n);
  if(migrationColumn!==1||migrationConstraint!==1)throw new Error('Patch de abandono incompleto: ejecutá el startup productivo o npm run migrate:prod');

  const adminCount=Number((await pool.query(`
    SELECT count(*) n
    FROM users
    WHERE role='admin' AND verification_status='verified'
  `)).rows[0].n);
  if(adminCount<1)throw new Error('No hay ningún Admin verificado');

  const venueCount=Number((await pool.query(`SELECT count(*) n FROM venues WHERE active=true`)).rows[0].n);
  if(venueCount<1)throw new Error('No hay ninguna cancha/lugar activo');

  for(let i=3;i<VERIFY_STATEMENTS.length;i++){
    const result=await pool.query(VERIFY_STATEMENTS[i]);
    if(result.rowCount>0)throw new Error('database/verify.sql detectó inconsistencia en control #'+(i-2));
  }

  const failed=(await pool.query(`
    SELECT count(*)::int n,min(created_at) oldest
    FROM notification_outbox
    WHERE status='failed'
  `)).rows[0];
  const failedOutbox=Number(failed.n||0);

  return {
    ok:true,
    engine:map.engine,
    timezone:map.timezone,
    clockPaused:false,
    migrationReady:true,
    databaseTls:requireTls?Boolean(ssl.ssl):null,
    databaseTlsVersion:requireTls?(ssl.version||null):null,
    admins:adminCount,
    activeVenues:venueCount,
    verifyControls:Math.max(0,VERIFY_STATEMENTS.length-3),
    failedOutbox,
    oldestFailedOutboxAt:failed.oldest||null,
  };
}
