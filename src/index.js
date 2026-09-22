import 'dotenv/config';
import {assertRuntimeConfig} from './config.js';
import {app} from './app.js';
import {maintenance} from './wheel.js';
import {dispatchWhatsAppOutbox} from './notifications.js';
import {pool} from './db.js';
import {applyProductionMigrations} from './migrations.js';
import {runBackgroundTasks} from './background.js';
import {prepareStartup,startupFailureEntry} from './startup.js';

try{
  const startup=await prepareStartup({
    env:process.env,
    assertConfig:assertRuntimeConfig,
    pool,
    applyMigrations:applyProductionMigrations,
  });
  for(const warning of startup.report.warnings)console.warn('config warning:',warning);
  if(process.env.NODE_ENV==='production')console.log('production migrations ok:',startup.migrated.join(', '));

  const port=Number(process.env.PORT||3000);
  const server=app.listen(port,'0.0.0.0',()=>console.log(`LA RED Pádel API · wheel-v2 · ${port}`));
  server.on('error',err=>{
    console.error(JSON.stringify(startupFailureEntry(err)));
    pool.end().catch(()=>{}).finally(()=>process.exit(1));
  });

  async function tick(){await runBackgroundTasks({maintenanceTask:maintenance,outboxTask:dispatchWhatsAppOutbox});}
  setTimeout(tick,1500).unref();
  setInterval(tick,60*60*1000).unref();
}catch(err){
  console.error(JSON.stringify(startupFailureEntry(err)));
  await pool.end().catch(()=>{});
  process.exitCode=1;
}
