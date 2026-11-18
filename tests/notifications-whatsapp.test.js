import test from 'node:test';
import assert from 'node:assert/strict';
import {formatArgentineWhatsApp,sendWhatsAppMessage} from '../src/evolutionApi.js';
import {formatMatchSchedule} from '../src/notifications.js';

const evolutionEnv={
  EVOLUTION_API_URL:'http://localhost:8080',
  EVOLUTION_API_KEY:'local-key',
  EVOLUTION_INSTANCE_NAME:'laredpadel',
};

function restoreEnv(previous){
  for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];
  Object.assign(process.env,previous);
}

test('Argentine numbers normalize to 549 plus area without 0 and subscriber without 15',()=>{
  assert.equal(formatArgentineWhatsApp('(3329)-400704'),'5493329400704');
  assert.equal(formatArgentineWhatsApp('+54 9 3329 400704'),'5493329400704');
  assert.equal(formatArgentineWhatsApp('54332915400704'),'5493329400704');
  assert.equal(formatArgentineWhatsApp('03329 15 400704'),'5493329400704');
  assert.equal(formatArgentineWhatsApp('5493329400704'),'5493329400704');
  assert.throws(()=>formatArgentineWhatsApp('123'),/Teléfono inválido/);
});

test('WhatsApp sender never calls Evolution if any variable is missing',async()=>{
  const previous={...process.env};
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('Unexpected network call');};
  try{
    for(const key of Object.keys(evolutionEnv)){
      Object.assign(process.env,evolutionEnv);
      delete process.env[key];
      await assert.rejects(sendWhatsAppMessage('5493329123456','x'),/WhatsApp incompleto/);
    }
    assert.equal(calls,0);
  }finally{
    globalThis.fetch=originalFetch;
    restoreEnv(previous);
  }
});

test('WhatsApp sender posts text to the Evolution instance',async()=>{
  const previous={...process.env};
  Object.assign(process.env,evolutionEnv);
  const originalFetch=globalThis.fetch;
  let seen=null;
  globalThis.fetch=async(url,options)=>{
    seen={url,options,body:JSON.parse(options.body)};
    return new Response(JSON.stringify({key:{id:'evo.test'}}),{status:200});
  };
  try{
    await sendWhatsAppMessage('+54 9 3329 123456','Mensaje de prueba');
    assert.equal(seen.url,'http://localhost:8080/message/sendText/laredpadel');
    assert.equal(seen.options.method,'POST');
    assert.equal(seen.options.headers.apikey,'local-key');
    assert.deepEqual(seen.body,{number:'5493329123456',text:'Mensaje de prueba'});
    assert.equal(JSON.stringify(seen).includes('graph.facebook.com'),false);
  }finally{
    globalThis.fetch=originalFetch;
    restoreEnv(previous);
  }
});

test('a down Evolution API fails the send and retries only a network error',async()=>{
  const previous={...process.env};
  Object.assign(process.env,evolutionEnv);
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{
    calls++;
    if(calls===1)throw new Error('fetch failed');
    return new Response('{}',{status:200});
  };
  try{
    await sendWhatsAppMessage('5493329123456','Hola');
    assert.equal(calls,2);
    let httpCalls=0;
    globalThis.fetch=async()=>{
      httpCalls++;
      return new Response('down',{status:503});
    };
    await assert.rejects(sendWhatsAppMessage('5493329123456','Hola'),/Evolution HTTP 503/);
    assert.equal(httpCalls,1);
  }finally{
    globalThis.fetch=originalFetch;
    restoreEnv(previous);
  }
});

test('match schedule is formatted in Argentina time',()=>{
  assert.match(formatMatchSchedule('2026-11-15T21:00:00Z'),/18:00/);
  assert.equal(formatMatchSchedule('no-es-fecha'),'horario a confirmar');
});
