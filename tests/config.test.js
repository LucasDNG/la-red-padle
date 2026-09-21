import test from 'node:test';
import assert from 'node:assert/strict';
import {databasePoolOptions,productionConfigReport,assertRuntimeConfig} from '../src/config.js';

const strongEnv={
  NODE_ENV:'production',
  DATABASE_URL:'postgresql://user:pass@example.neon.tech/db?sslmode=require&channel_binding=require',
  JWT_SECRET:'0123456789abcdef0123456789abcdef0123456789abcdef',
  FRONTEND_URL:'https://la-red-padle.vercel.app',
  ADMIN_TOTP_SECRET:'JBSWY3DPEHPK3PXP',
  WHATSAPP_PHONE_NUMBER_ID:'123',
  WHATSAPP_ACCESS_TOKEN:'token',
  WHATSAPP_TEMPLATE_NAME:'la_red_notice',
  WHATSAPP_TEMPLATE_LANGUAGE:'es_AR',
};

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
  delete env.WHATSAPP_ACCESS_TOKEN;
  assert.ok(productionConfigReport(env,{strictIntegrations:false}).warnings.some(x=>x.includes('WhatsApp')));
  assert.ok(productionConfigReport(env,{strictIntegrations:true}).errors.some(x=>x.includes('WhatsApp')));
});

test('complete production config passes runtime validation',()=>{
  assert.deepEqual(productionConfigReport(strongEnv,{strictIntegrations:true}),{errors:[],warnings:[]});
  assert.deepEqual(assertRuntimeConfig(strongEnv),{errors:[],warnings:[]});
});
