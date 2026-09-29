import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {productionApiUrl} from '../frontend/buildEnv.js';
import {frontendReleaseSha,injectFrontendReleaseMeta} from '../frontend/releaseMeta.js';

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


test('frontend release helper injects the deployment commit into HTML',()=>{
  const sha='0123456789abcdef0123456789abcdef01234567';
  assert.equal(frontendReleaseSha({VERCEL_GIT_COMMIT_SHA:sha}),sha);
  assert.equal(frontendReleaseSha({VITE_VERCEL_GIT_COMMIT_SHA:sha}),sha);
  const html=injectFrontendReleaseMeta('<html><head></head><body></body></html>',sha);
  assert.match(html,/name="la-red-release" content="0123456789abcdef0123456789abcdef01234567"/);
});


test('Vercel skips only documentation-only commits so backend/frontend release SHAs stay aligned',()=>{
  const config=JSON.parse(fs.readFileSync(new URL('../frontend/vercel.json',import.meta.url),'utf8'));
  assert.equal(config.ignoreCommand,"git -C .. diff --quiet HEAD^ HEAD -- ':!*.md' ':!**/*.md'");
});
