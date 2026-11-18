import 'dotenv/config';
import {assertRuntimeConfig} from './config.js';
import {app} from './app.js';
import {maintenance} from './wheelRuntime.js';
import {dispatchWhatsAppOutbox,queueMatchReminders} from './notifications.js';
import {pool} from './db.js';
import {applyProductionMigrations} from './migrations.js';
import {runBackgroundTasks} from './background.js';
import {prepareStartup,startupFailureEntry} from './startup.js';
import {createGracefulShutdown,installRuntimeHandlers,bindPoolErrorHandler} from './runtimeLifecycle.js';

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
  const server=app.listen(port,'0.0.0.0',()=>console.log(`LA RED Pádel API · runtime seleccionado por DB · ${port}`));

  async function maintenanceTick(){await runBackgroundTasks({maintenanceTask:maintenance});}
  async function notifyTick(){
    await runBackgroundTasks({
      reminderTask:()=>queueMatchReminders(pool),
      outboxTask:dispatchWhatsAppOutbox,
    });
  }
  const initialMaintenance=setTimeout(maintenanceTick,1500);
  const initialNotify=setTimeout(notifyTick,1500);
  const maintenanceInterval=setInterval(maintenanceTick,60*60*1000);
  const notifyInterval=setInterval(notifyTick,15*60*1000);
  initialMaintenance.unref();
  initialNotify.unref();
  maintenanceInterval.unref();
  notifyInterval.unref();

  const shutdown=createGracefulShutdown({
    server,
    pool,
    timers:[initialMaintenance,initialNotify,maintenanceInterval,notifyInterval],
  });
  installRuntimeHandlers({shutdown});
  bindPoolErrorHandler({pool,shutdown});
  server.on('error',err=>void shutdown('listen',{error:err,exitCode:1}));
}catch(err){
  console.error(JSON.stringify(startupFailureEntry(err)));
  await pool.end().catch(()=>{});
  process.exitCode=1;
}
