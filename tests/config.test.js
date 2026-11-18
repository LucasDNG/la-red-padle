import test from 'node:test';
import assert from 'node:assert/strict';
import {databasePoolOptions,productionConfigReport,assertRuntimeConfig,frontendOrigins,corsOrigins,whatsappConfiguration} from '../src/config.js';

const strongEnv={
  NODE_ENV:'production',
  DATABASE_URL:'postgresql://user:pass@example.neon.tech/db?sslmode=require&channel_binding=require',
  JWT_SECRET:'0123456789abcdef0123456789abcdef0123456789abcdef',
  FRONTEND_URL:'https://la-red-padle.vercel.app',
  ADMIN_TOTP_SECRET:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
  EVOLUTION_API_URL:'https://evolution.example.com',
  EVOLUTION_API_KEY:'token',
  EVOLUTION_INSTANCE_NAME:'laredpadel',
};

test('WhatsApp readiness matches sender requirements and exposes names only',()=>{
  assert.deepEqual(whatsappConfiguration(strongEnv),{configured:true,missing:[],invalid:[]});
  const report=whatsappConfiguration({...strongEnv,EVOLUTION_API_URL:'  '});
  assert.deepEqual(report,{configured:false,missing:['EVOLUTION_API_URL'],invalid:[]});
  assert.equal(whatsappConfiguration({...strongEnv,EVOLUTION_API_URL:'ftp://evolution.example.com'}).configured,false);
  assert.equal(whatsappConfiguration({...strongEnv,EVOLUTION_API_KEY:'  '}).configured,false);
  assert.equal(JSON.stringify(report).includes(strongEnv.EVOLUTION_API_KEY),false);
});

test('production DB without sslmode enables verified TLS by default',()=>{
  const options=databasePoolOptions({...strongEnv,DATABASE_URL:'postgresql://user:pass@db.example.com/app'});
  assert.equal(options.ssl,true);
});

test('production rejects explicitly insecure PostgreSQL SSL modes',()=>{
  assert.throws(()=>databasePoolOptions({...strongEnv,DATABASE_URL:'postgresql://user:pass@db.example.com/app?sslmode=disable'}),/modo SSL inseguro/);
  assert.throws(()=>databasePoolOptions({...strongEnv,DATABASE_URL:'postgresql://user:pass@db.example.com/app?sslmode=no-verify'}),/modo SSL inseguro/);
});

test('Neon URL with channel binding delegates SSL parsing to pg connection string',()=>{
  const options=databasePoolOptions(strongEnv);
  assert.equal(Object.hasOwn(options,'ssl'),false);
});

test('runtime production config rejects weak JWT, insecure frontend and missing TOTP',()=>{
  const report=productionConfigReport({...strongEnv,JWT_SECRET:'cambiar',FRONTEND_URL:'http://localhost:5173',ADMIN_TOTP_SECRET:''});
  assert.ok(report.errors.some(x=>x.includes('JWT_SECRET')));
  assert.ok(report.errors.some(x=>x.includes('FRONTEND_URL')));
  assert.ok(report.errors.some(x=>x.includes('ADMIN_TOTP_SECRET')));
});

test('strict production preflight requires WhatsApp configuration',()=>{
  const env={...strongEnv};
  delete env.EVOLUTION_API_KEY;
  assert.ok(productionConfigReport(env,{strictIntegrations:false}).warnings.some(x=>x.includes('WhatsApp')));
  assert.ok(productionConfigReport(env,{strictIntegrations:true}).errors.some(x=>x.includes('WhatsApp')));
});

test('complete production config passes runtime validation',()=>{
  assert.deepEqual(productionConfigReport(strongEnv,{strictIntegrations:true}),{errors:[],warnings:[]});
  assert.deepEqual(assertRuntimeConfig(strongEnv),{errors:[],warnings:[]});
});

test('strict preflight requires each Evolution variable',()=>{
  for(const key of Object.keys(strongEnv).filter(key=>key.startsWith('EVOLUTION_'))){
    const env={...strongEnv,[key]:''};
    assert.ok(productionConfigReport(env,{strictIntegrations:true}).errors.some(x=>x.includes(key)),key);
    assert.ok(productionConfigReport(env).warnings.some(x=>x.includes(key)),key);
  }
});


test('production rejects weak or reused TOTP secrets',()=>{
  const weak=productionConfigReport({...strongEnv,ADMIN_TOTP_SECRET:'JBSWY3DPEHPK3PXP'});
  assert.ok(weak.errors.some(x=>x.includes('ADMIN_TOTP_SECRET')));
  const reused=productionConfigReport({...strongEnv,JWT_SECRET:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',ADMIN_TOTP_SECRET:'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'});
  assert.ok(reused.errors.some(x=>x.includes('secretos distintos')));
});

test('production frontend origins reject paths and normalize harmless trailing slash',()=>{
  const bad=productionConfigReport({...strongEnv,FRONTEND_URL:'https://app.example.com/private'});
  assert.ok(bad.errors.some(x=>x.includes('FRONTEND_URL')));
  const query=productionConfigReport({...strongEnv,FRONTEND_URL:'https://app.example.com/?token=x'});
  assert.ok(query.errors.some(x=>x.includes('FRONTEND_URL')));
  assert.deepEqual(frontendOrigins({...strongEnv,FRONTEND_URL:'https://app.example.com/, https://admin.example.com'}),[
    'https://app.example.com',
    'https://admin.example.com'
  ]);
});


test('production CORS autoriza los dominios oficiales de LA RED además del frontend configurado',()=>{
  const origins=corsOrigins(strongEnv);
  assert.ok(origins.includes('https://la-red-padle.vercel.app'));
  assert.ok(origins.includes('https://www.laredpadel.com.ar'));
  assert.ok(origins.includes('https://laredpadel.com.ar'));
});

test('WhatsApp production config validates Evolution URL and instance name',()=>{
  assert.ok(productionConfigReport({...strongEnv,EVOLUTION_API_URL:'localhost:8080'},{strictIntegrations:true}).errors.some(x=>x.includes('EVOLUTION_API_URL')));
  assert.ok(productionConfigReport({...strongEnv,EVOLUTION_INSTANCE_NAME:'la red'},{strictIntegrations:true}).errors.some(x=>x.includes('EVOLUTION_INSTANCE_NAME')));
});
