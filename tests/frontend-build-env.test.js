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


test('Vite injects the deployment commit into production HTML',async()=>{
  const previousApi=process.env.VITE_API_URL;
  const previousSha=process.env.VERCEL_GIT_COMMIT_SHA;
  process.env.VITE_API_URL='https://api.example.com/api';
  process.env.VERCEL_GIT_COMMIT_SHA='0123456789abcdef0123456789abcdef01234567';
  try{
    const {default:createConfig}=await import('../frontend/vite.config.js');
    const config=createConfig({mode:'production'});
    const plugin=config.plugins.find(p=>p?.name==='la-red-release-meta');
    assert.ok(plugin);
    const html=plugin.transformIndexHtml('<html><head></head><body></body></html>');
    assert.match(html,/name="la-red-release" content="0123456789abcdef0123456789abcdef01234567"/);
  }finally{
    if(previousApi===undefined)delete process.env.VITE_API_URL;else process.env.VITE_API_URL=previousApi;
    if(previousSha===undefined)delete process.env.VERCEL_GIT_COMMIT_SHA;else process.env.VERCEL_GIT_COMMIT_SHA=previousSha;
  }
});
