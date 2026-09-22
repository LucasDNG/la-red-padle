import test from 'node:test';
import assert from 'node:assert/strict';
import {readLiveness,readHealth} from '../src/health.js';

test('liveness is dependency-free and identifies wheel-v2 process',()=>{
  assert.deepEqual(readLiveness(),{
    ok:true,
    name:'LA RED Pádel',
    engine:'wheel-v2',
    timezone:'America/Argentina/Buenos_Aires',
    process:'ok'
  });
});

test('readiness remains database-aware and verifies engine',async()=>{
  const queries=[];
  const client={
    async query(sql){
      queries.push(sql);
      if(sql.includes("app_settings"))return {rows:[{value:'wheel-v2'}]};
      return {rows:[{}]};
    }
  };
  const result=await readHealth(client);
  assert.equal(result.database,'ok');
  assert.equal(result.engine,'wheel-v2');
  assert.equal(queries.length,2);
});

test('readiness rejects an unexpected engine',async()=>{
  const client={query:async()=>({rows:[{value:'wheel-v1'}]})};
  await assert.rejects(()=>readHealth(client),/Motor competitivo inesperado/);
});
