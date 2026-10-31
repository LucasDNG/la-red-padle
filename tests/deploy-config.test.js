import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Render ignores documentation-only commits so deployment SHA stays aligned with Vercel',()=>{
  const yaml=fs.readFileSync(new URL('../render.yaml',import.meta.url),'utf8');
  assert.match(yaml,/autoDeployTrigger:\s*checksPass/);
  assert.match(yaml,/buildFilter:/);
  assert.match(yaml,/ignoredPaths:/);
  assert.match(yaml,/- "\*\.md"/);
  assert.match(yaml,/- "\*\*\/\*\.md"/);
});

test('frontend CI installs from the committed lockfile',()=>{
  const ci=fs.readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');
  const frontend=ci.split(/\n {2}frontend:\n/)[1];
  assert.ok(frontend,'falta el job frontend');
  assert.match(frontend,/working-directory: frontend/);
  assert.match(frontend,/npm ci --ignore-scripts/);
  assert.doesNotMatch(frontend,/npm install/);
  const lock=JSON.parse(fs.readFileSync(new URL('../frontend/package-lock.json',import.meta.url),'utf8'));
  assert.equal(lock.lockfileVersion,3);
  assert.equal(lock.name,'la-red-padel-frontend');
  assert.equal(lock.packages[''].version,'5.0.9');
});
