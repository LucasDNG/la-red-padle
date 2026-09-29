import 'dotenv/config';
import pg from 'pg';
import {databasePoolOptions} from '../src/config.js';
import {activateWheelV3} from '../src/wheelV3Cutover.js';

if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL es obligatorio');
if(process.env.CONFIRM_WHEEL_V3_CUTOVER!=='YES')throw new Error('Falta CONFIRM_WHEEL_V3_CUTOVER=YES');
if(process.env.WHEEL_V3_BACKEND_QUIESCED!=='YES')throw new Error('El backend debe estar quieto: WHEEL_V3_BACKEND_QUIESCED=YES');

const {Client}=pg;
const client=new Client(databasePoolOptions(process.env));
await client.connect();

try{
  await client.query('BEGIN');
  const result=await activateWheelV3(client);
  await client.query('COMMIT');
  console.log(JSON.stringify(result,null,2));
}catch(error){
  await client.query('ROLLBACK');
  throw error;
}finally{
  await client.end();
}
