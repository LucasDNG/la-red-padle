export async function readHealth(client){
  const row=(await client.query(`SELECT value FROM app_settings WHERE key='engine'`)).rows[0];
  const engine=row?.value;
  if(engine!=='wheel-v2')throw new Error('Motor competitivo inesperado');
  await client.query('SELECT 1');
  return {
    ok:true,
    name:'LA RED Pádel',
    engine,
    timezone:'America/Argentina/Buenos_Aires',
    database:'ok'
  };
}
