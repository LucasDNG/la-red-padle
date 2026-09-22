import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const appSource=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const frontSource=await readFile(new URL('../frontend/src/App.jsx',import.meta.url),'utf8');

function norm(path){
  return path.replace(/^\/api/,'').replace(/\$\{[^}]+\}/g,':x').replace(/:[A-Za-z0-9_]+/g,':x');
}

test('cada endpoint funcional normal tiene un flujo visible en el frontend',()=>{
  const backend=[...appSource.matchAll(/\bapp\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/g)]
    .map(m=>({method:m[1].toUpperCase(),path:m[2]}))
    .filter(x=>!['/api/live','/api/health'].includes(x.path));
  const calls=[...frontSource.matchAll(/\bapi\.(get|post|patch|put|delete)\(\s*([\`'"])(.*?)\2/g)]
    .map(m=>({method:m[1].toUpperCase(),path:m[3]}));
  const missing=backend.filter(b=>!calls.some(c=>c.method===b.method&&norm(c.path)===norm(b.path)));
  assert.deepEqual(missing,[]);
});

test('journey visible cubre lugar libre, confirmaciones y acciones temporales',()=>{
  assert.match(frontSource,/Lugar \/ cancha/);
  assert.match(frontSource,/Su mención no implica vínculo comercial con LA RED/);
  assert.match(frontSource,/CONFIRMAR PAUSA/);
  assert.match(frontSource,/CONFIRMAR DISOLUCIÓN/);
  assert.match(frontSource,/extensionOpen/);
  assert.match(frontSource,/canNoShow/);
  assert.match(frontSource,/Las dos versiones no coinciden/);
  assert.match(frontSource,/GUARDAR CORRECCIÓN/);
  assert.match(frontSource,/VENTANA DE 15 DÍAS/);
  assert.match(frontSource,/ENVIAR REPORTE DEL PARTIDO RECIENTE/);
});
