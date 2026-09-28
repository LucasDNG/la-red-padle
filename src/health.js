export function readLiveness(){
  return {
    ok:true,
    name:'LA RED Pádel',
    engine:'database-selected',
    timezone:'America/Argentina/Buenos_Aires',
    process:'ok'
  };
}

export async function readHealth(client){
  const row=(await client.query(`SELECT value FROM app_settings WHERE key='engine'`)).rows[0];
  const engine=row?.value;
  if(!['wheel-v2','wheel-v3'].includes(engine))throw new Error('Motor competitivo inesperado');
  await client.query('SELECT 1');
  return {
    ok:true,
    name:'LA RED Pádel',
    engine,
    timezone:'America/Argentina/Buenos_Aires',
    database:'ok'
  };
}
