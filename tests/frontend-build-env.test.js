import test from 'node:test';
import assert from 'node:assert/strict';
import {productionApiUrl} from '../frontend/buildEnv.js';

test('frontend production API URL requires canonical HTTPS /api endpoint',()=>{
  assert.equal(productionApiUrl('https://api.example.com/api'),'https://api.example.com/api');
  assert.equal(productionApiUrl('https://api.example.com/api/'),'https://api.example.com/api');
});

test('frontend production API URL rejects missing, insecure or mispathed values',()=>{
  assert.throws(()=>productionApiUrl(''),/obligatorio/);
  assert.throws(()=>productionApiUrl('http://api.example.com/api'),/HTTPS/);
  assert.throws(()=>productionApiUrl('https://api.example.com'),/\/api/);
  assert.throws(()=>productionApiUrl('https://api.example.com/api?v=1'),/credenciales\/query\/fragmento/);
});
