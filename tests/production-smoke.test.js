import test from 'node:test';
import assert from 'node:assert/strict';
import {runProductionSmoke} from '../src/productionSmoke.js';

function response(body,{status=200,headers={}}={}){
  return new Response(typeof body==='string'?body:JSON.stringify(body),{
    status,
    headers:{'content-type':typeof body==='string'?'text/html':'application/json',...headers}
  });
}

test('production smoke validates DB-aware health, CORS and public endpoints',async()=>{
  const seen=[];
  const fetchImpl=async(url,options={})=>{
    seen.push({url,options});
    if(url==='https://api.example.com/api/health')return response(
      {ok:true,engine:'wheel-v2',database:'ok'},
      {headers:{'access-control-allow-origin':'https://app.example.com'}}
    );
    if(url==='https://app.example.com')return response('<html><body><div id="root"></div></body></html>');
    if(url.endsWith('/api/legal/versions'))return response({terms:'v1'});
    return response([]);
  };
  const result=await runProductionSmoke({
    apiUrl:'https://api.example.com/',
    frontendUrl:'https://app.example.com/',
    fetchImpl
  });
  assert.equal(result.ok,true);
  assert.equal(result.cors,true);
  assert.equal(result.publicEndpoints,5);
  assert.equal(seen.length,7);
});

test('production smoke rejects wrong CORS even when health is otherwise green',async()=>{
  const fetchImpl=async(url)=>{
    if(url.endsWith('/api/health'))return response(
      {ok:true,engine:'wheel-v2',database:'ok'},
      {headers:{'access-control-allow-origin':'https://wrong.example.com'}}
    );
    return response([]);
  };
  await assert.rejects(
    ()=>runProductionSmoke({
      apiUrl:'https://api.example.com',
      frontendUrl:'https://app.example.com',
      fetchImpl
    }),
    /CORS productivo/
  );
});


test('production smoke rejects non-origin production URLs before making requests',async()=>{
  const never=async()=>{throw new Error('fetch no debería ejecutarse');};
  await assert.rejects(
    ()=>runProductionSmoke({
      apiUrl:'https://api.example.com/api',
      frontendUrl:'https://app.example.com',
      fetchImpl:never
    }),
    /sin path/
  );
  await assert.rejects(
    ()=>runProductionSmoke({
      apiUrl:'https://api.example.com',
      frontendUrl:'https://app.example.com/?preview=1',
      fetchImpl:never
    }),
    /sin credenciales\/query\/fragmento/
  );
  await assert.rejects(
    ()=>runProductionSmoke({
      apiUrl:'https://user:pass@api.example.com',
      frontendUrl:'https://app.example.com',
      fetchImpl:never
    }),
    /sin credenciales\/query\/fragmento/
  );
});
