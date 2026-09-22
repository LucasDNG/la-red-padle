import 'dotenv/config';
import {assertRuntimeConfig} from './config.js';
import {app} from './app.js';
import {maintenance} from './wheel.js';
import {dispatchWhatsAppOutbox} from './notifications.js';
import {pool} from './db.js';
import {applyProductionMigrations} from './migrations.js';
import {runBackgroundTasks} from './background.js';

const report=assertRuntimeConfig(process.env);
for(const warning of report.warnings)console.warn('config warning:',warning);

if(process.env.NODE_ENV==='production'){
  const client=await pool.connect();
  try{
    const migrated=await applyProductionMigrations(client);
    console.log('production migrations ok:',migrated.applied.join(', '));
  }finally{
    client.release();
  }
}

const port=Number(process.env.PORT||3000);
app.listen(port,'0.0.0.0',()=>console.log(`LA RED Pádel API · wheel-v2 · ${port}`));
async function tick(){await runBackgroundTasks({maintenanceTask:maintenance,outboxTask:dispatchWhatsAppOutbox});}
setTimeout(tick,1500).unref();setInterval(tick,60*60*1000).unref();
