import test from 'node:test';
import assert from 'node:assert/strict';
import {safeErrorLog,authRateLimitKey,safeClientErrorMessage} from '../src/httpSecurity.js';

test('production error logs never expose PostgreSQL detail or user message',()=>{
  const err={
    name:'error',
    code:'23505',
    message:'duplicate key value violates unique constraint users_dni_key',
    detail:'Key (dni)=(12345678) already exists.',
    query:'INSERT INTO users ...'
  };
  const entry=safeErrorLog(err,{method:'POST',path:'/api/auth/register'},{production:true});
  const serialized=JSON.stringify(entry);
  assert.equal(entry.code,'23505');
  assert.equal(entry.status,400);
  assert.equal(entry.path,'/api/auth/register');
  assert.equal(serialized.includes('12345678'),false);
  assert.equal(serialized.includes('duplicate key'),false);
  assert.equal(serialized.includes('INSERT INTO'),false);
  assert.equal('message' in entry,false);
});

test('development error logs keep only bounded message, never database detail',()=>{
  const err={name:'Error',message:'falló algo',detail:'DNI 12345678',code:'XX000'};
  const entry=safeErrorLog(err,{method:'GET',originalUrl:'/api/test?q=secret'},{production:false});
  assert.equal(entry.message,'falló algo');
  assert.equal(entry.path,'/api/test');
  assert.equal(JSON.stringify(entry).includes('12345678'),false);
  assert.equal('code' in entry,false);
});

test('auth rate limit keys isolate authentication endpoints for the same IP',()=>{
  const login=authRateLimitKey({ip:'203.0.113.5',path:'/api/auth/login'});
  const recovery=authRateLimitKey({ip:'203.0.113.5',path:'/api/auth/recovery/request'});
  const sameLogin=authRateLimitKey({ip:'203.0.113.5',path:'/api/auth/login'});
  assert.notEqual(login,recovery);
  assert.equal(login,sameLogin);
});


test('production client errors hide unexpected internal failures but preserve safe domain messages',()=>{
  assert.equal(
    safeClientErrorMessage({message:'password authentication failed for user postgres'},{production:true}),
    'Error interno'
  );
  assert.equal(
    safeClientErrorMessage({statusCode:409,message:'Invitación vencida o inexistente'},{production:true}),
    'Invitación vencida o inexistente'
  );
  assert.equal(
    safeClientErrorMessage({code:'23505',constraint:'users_dni_key',message:'raw db message'},{production:true}),
    'Ya existe una cuenta con ese DNI. Usá la recuperación de acceso.'
  );
});
