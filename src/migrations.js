import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
export const PRODUCTION_MIGRATIONS=[
  path.resolve(__dirname,'../database/PATCH_MATCH_ABANDONMENT_2026-09-21.sql'),
  path.resolve(__dirname,'../database/PATCH_FREE_TEXT_LOCATIONS_2026-09-22.sql')
];

export async function applyProductionMigrations(client){
  await client.query('SELECT pg_advisory_lock(7331,20260921)');
  try{
    for(const file of PRODUCTION_MIGRATIONS){
      const sql=fs.readFileSync(file,'utf8');
      await client.query(sql);
    }
    const column=(await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='matches'
        AND column_name='abandoned_pair_id'
    `)).rowCount;
    if(!column)throw new Error('Migración incompleta: falta matches.abandoned_pair_id');

    const constraint=(await client.query(`
      SELECT 1
      FROM pg_constraint
      WHERE conname='matches_abandonment_consistency'
        AND conrelid='matches'::regclass
    `)).rowCount;
    if(!constraint)throw new Error('Migración incompleta: falta matches_abandonment_consistency');

    return {ok:true,applied:PRODUCTION_MIGRATIONS.map(file=>path.basename(file))};
  }finally{
    await client.query('SELECT pg_advisory_unlock(7331,20260921)');
  }
}
