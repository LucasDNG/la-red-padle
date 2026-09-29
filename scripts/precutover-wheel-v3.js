import 'dotenv/config';
import pg from 'pg';
import {databasePoolOptions,productionConfigReport} from '../src/config.js';
import {databasePreflight} from '../src/preflight.js';
import {wheelV3CutoverReadiness} from '../src/wheelV3Cutover.js';

const report=productionConfigReport(process.env,{strictIntegrations:false});
for(const warning of report.warnings)console.warn('WARN:',warning);
if(report.errors.length){
  for(const error of report.errors)console.error('ERROR:',error);
  process.exit(1);
}

const {Pool}=pg;
const pool=new Pool(databasePoolOptions(process.env));

try{
  const preflight=await databasePreflight(pool,{requireTls:true});
  const cutover=await wheelV3CutoverReadiness(pool);
  const result={
    ok:preflight.ok&&cutover.ready,
    preflight,
    cutover,
  };
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=2;
}finally{
  await pool.end();
}
