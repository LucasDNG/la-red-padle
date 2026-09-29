import 'dotenv/config';
import pg from 'pg';
import {databasePoolOptions,productionConfigReport} from '../src/config.js';
import {databasePreflight} from '../src/preflight.js';
import {runProductionSmoke} from '../src/productionSmoke.js';

const report=productionConfigReport(process.env,{strictIntegrations:false});
for(const warning of report.warnings)console.warn('WARN:',warning);
if(report.errors.length){
  for(const error of report.errors)console.error('ERROR:',error);
  process.exit(1);
}

if(!process.env.PROD_API_URL)throw new Error('PROD_API_URL es obligatorio');
if(!process.env.PROD_FRONTEND_URL)throw new Error('PROD_FRONTEND_URL es obligatorio');

const {Pool}=pg;
const pool=new Pool(databasePoolOptions(process.env));

try{
  const preflight=await databasePreflight(pool,{requireTls:true});
  if(preflight.engine!=='wheel-v3')throw new Error('La base productiva todavía no informa wheel-v3');

  const smoke=await runProductionSmoke({
    apiUrl:process.env.PROD_API_URL,
    frontendUrl:process.env.PROD_FRONTEND_URL,
    expectedEngine:'wheel-v3',
  });

  console.log(JSON.stringify({
    ok:true,
    preflight,
    smoke,
  },null,2));
}finally{
  await pool.end();
}
