import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {databasePoolOptions,productionConfigReport} from '../src/config.js';

const report=productionConfigReport(process.env,{strictIntegrations:true});
for(const warning of report.warnings)console.warn('WARN:',warning);
if(report.errors.length){
  for(const error of report.errors)console.error('ERROR:',error);
  process.exit(1);
}

const {Pool}=pg;
const pool=new Pool(databasePoolOptions(process.env));
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const verify=fs.readFileSync(path.resolve(__dirname,'../database/verify.sql'),'utf8');
const statements=verify.split(';').map(s=>s.trim()).filter(Boolean);

try{
  const ssl=(await pool.query(`SELECT ssl,version,cipher FROM pg_stat_ssl WHERE pid=pg_backend_pid()`)).rows[0];
  if(!ssl?.ssl)throw new Error('La sesión PostgreSQL de producción no está usando TLS');

  const settings=(await pool.query(`SELECT key,value FROM app_settings WHERE key IN('engine','timezone')`)).rows;
  const map=Object.fromEntries(settings.map(r=>[r.key,r.value]));
  if(map.engine!=='wheel-v2')throw new Error('app_settings.engine no es wheel-v2');
  if(map.timezone!=='America/Argentina/Buenos_Aires')throw new Error('app_settings.timezone inesperada');

  const adminCount=Number((await pool.query(`SELECT count(*) n FROM users WHERE role='admin' AND verification_status='verified'`)).rows[0].n);
  if(adminCount<1)throw new Error('No hay ningún Admin verificado');

  const venueCount=Number((await pool.query(`SELECT count(*) n FROM venues WHERE active=true`)).rows[0].n);
  if(venueCount<1)throw new Error('No hay ninguna cancha/lugar activo');

  for(let i=3;i<statements.length;i++){
    const result=await pool.query(statements[i]);
    if(result.rowCount>0)throw new Error('database/verify.sql detectó inconsistencia en control #'+(i-2));
  }

  const failedOutbox=Number((await pool.query(`SELECT count(*) n FROM notification_outbox WHERE status='failed'`)).rows[0].n);
  if(failedOutbox)console.warn('WARN: hay '+failedOutbox+' notificaciones WhatsApp fallidas pendientes de revisión');

  console.log(JSON.stringify({
    ok:true,
    engine:map.engine,
    timezone:map.timezone,
    databaseTls:true,
    databaseTlsVersion:ssl.version||null,
    admins:adminCount,
    activeVenues:venueCount,
    verifyControls:Math.max(0,statements.length-3),
    failedOutbox,
  }));
}finally{
  await pool.end();
}
