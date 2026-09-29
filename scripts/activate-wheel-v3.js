import 'dotenv/config';
import pg from 'pg';
import {databasePoolOptions,productionConfigReport} from '../src/config.js';
import {activateWheelV3} from '../src/wheelV3Cutover.js';

if(process.env.NODE_ENV!=='production')throw new Error('NODE_ENV debe ser production para activar Wheel v3');
const config=productionConfigReport(process.env,{strictIntegrations:false});
if(config.errors.length)throw new Error('Configuración productiva inválida: '+config.errors.join('; '));
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL es obligatorio');
if(process.env.CONFIRM_WHEEL_V3_CUTOVER!=='YES')throw new Error('Falta CONFIRM_WHEEL_V3_CUTOVER=YES');
if(process.env.WHEEL_V3_BACKEND_QUIESCED!=='YES')throw new Error('El backend debe estar quieto: WHEEL_V3_BACKEND_QUIESCED=YES');
if(!/^[0-9a-f]{40}$/i.test(process.env.EXPECTED_RELEASE_SHA||''))throw new Error('EXPECTED_RELEASE_SHA debe ser un SHA Git completo de 40 caracteres');
const adminUserId=Number(process.env.CUTOVER_ADMIN_USER_ID);
if(!Number.isInteger(adminUserId)||adminUserId<=0)throw new Error('CUTOVER_ADMIN_USER_ID debe ser un ID de Admin válido');

const {Client}=pg;
const client=new Client(databasePoolOptions(process.env));
await client.connect();

try{
  await client.query('BEGIN');
  const result=await activateWheelV3(client,{adminUserId,releaseSha:process.env.EXPECTED_RELEASE_SHA});
  await client.query('COMMIT');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await client.query('ROLLBACK');
  throw error;
}finally{
  await client.end();
}
