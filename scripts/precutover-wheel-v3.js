import 'dotenv/config';
import pg from 'pg';
import {databasePoolOptions,productionConfigReport} from '../src/config.js';
import {databasePreflight} from '../src/preflight.js';
import {wheelV3CutoverReadiness} from '../src/wheelV3Cutover.js';
import {runProductionSmoke} from '../src/productionSmoke.js';

const report=productionConfigReport(process.env,{strictIntegrations:false});
if(!process.env.PROD_API_URL)throw new Error('PROD_API_URL es obligatorio');
if(!process.env.PROD_FRONTEND_URL)throw new Error('PROD_FRONTEND_URL es obligatorio');
if(!process.env.EXPECTED_RELEASE_SHA)throw new Error('EXPECTED_RELEASE_SHA es obligatorio');
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
  const deployment=await runProductionSmoke({
    apiUrl:process.env.PROD_API_URL,
    frontendUrl:process.env.PROD_FRONTEND_URL,
    expectedEngine:'wheel-v2',
    expectedBackendSha:process.env.EXPECTED_RELEASE_SHA,
    expectedFrontendSha:process.env.EXPECTED_RELEASE_SHA,
  });
  const result={
    ok:preflight.ok&&cutover.ready&&deployment.ok,
    preflight,
    cutover,
    deployment,
  };
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=2;
}finally{
  await pool.end();
}
