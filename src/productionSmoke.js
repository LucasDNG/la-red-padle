function normalizeHttps(value,label){
  const raw=String(value||'').trim();
  if(!raw)throw new Error(label+' es obligatorio');
  let url=null;
  try{url=new URL(raw);}catch{}
  if(!url||url.protocol!=='https:')throw new Error(label+' debe usar HTTPS');
  if(url.username||url.password||url.search||url.hash)throw new Error(label+' debe ser un origen HTTPS sin credenciales/query/fragmento');
  if(url.pathname&&url.pathname!=='/')throw new Error(label+' debe ser un origen HTTPS sin path');
  return url.origin;
}

async function jsonGet(fetchImpl,url,frontendOrigin){
  const response=await fetchImpl(url,{headers:{Origin:frontendOrigin}});
  if(!response.ok)throw new Error(url+' respondió HTTP '+response.status);
  return {response,data:await response.json()};
}

export async function runProductionSmoke({apiUrl,frontendUrl,fetchImpl=globalThis.fetch}){
  const api=normalizeHttps(apiUrl,'PROD_API_URL');
  const frontend=normalizeHttps(frontendUrl,'PROD_FRONTEND_URL');

  const healthResult=await jsonGet(fetchImpl,api+'/api/health',frontend);
  const health=healthResult.data;
  if(health?.ok!==true||health?.engine!=='wheel-v2'||health?.database!=='ok')throw new Error('Health productivo inválido');
  const allowOrigin=healthResult.response.headers.get('access-control-allow-origin');
  if(allowOrigin!==frontend)throw new Error('CORS productivo no autoriza el frontend esperado');

  const publicChecks=[
    ['/api/legal/versions',null],
    ['/api/ranking','array'],
    ['/api/venues','array'],
    ['/api/results/recent','array'],
    ['/api/upcoming','array'],
  ];
  for(const [path,kind] of publicChecks){
    const {data}=await jsonGet(fetchImpl,api+path,frontend);
    if(kind==='array'&&!Array.isArray(data))throw new Error(path+' no devolvió una lista');
  }

  const frontResponse=await fetchImpl(frontend);
  if(!frontResponse.ok)throw new Error('Frontend respondió HTTP '+frontResponse.status);
  const html=await frontResponse.text();
  if(!/id=["']root["']/.test(html))throw new Error('Frontend no parece contener el root de la SPA');

  return {
    ok:true,
    api,
    frontend,
    engine:health.engine,
    database:health.database,
    cors:true,
    publicEndpoints:publicChecks.length,
  };
}
