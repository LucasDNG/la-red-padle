import {pool,q} from './db.js';

export const SUPPORTED_ENGINES=new Set(['wheel-v2','wheel-v3']);

export async function competitiveEngine(client=pool){
  const row=(await q(client,`SELECT value FROM app_settings WHERE key='engine'`)).rows[0];
  const engine=row?.value;
  if(!SUPPORTED_ENGINES.has(engine))throw new Error('Motor competitivo inesperado');
  return engine;
}

export async function useCompetitiveEngine({v2,v3},...args){
  const engine=await competitiveEngine();
  return engine==='wheel-v3'?v3(...args):v2(...args);
}
