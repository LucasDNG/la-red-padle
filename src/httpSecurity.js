const SAFE_ERROR_CODES=new Set([
  'LIMIT_FILE_SIZE','LIMIT_FILE_COUNT','23505','23503','23514','22P02','42P08'
]);

export function safeErrorLog(err,req,{production=process.env.NODE_ENV==='production'}={}){
  const status=Number(err?.statusCode)||(String(err?.code||'').startsWith('23')?400:500);
  const code=SAFE_ERROR_CODES.has(String(err?.code||''))?String(err.code):undefined;
  const entry={
    level:'error',
    method:String(req?.method||'').slice(0,12),
    path:String(req?.path||req?.originalUrl||'').split('?')[0].slice(0,200),
    status,
    ...(code?{code}:{}),
    name:String(err?.name||'Error').slice(0,80),
  };
  if(!production)entry.message=String(err?.message||'Error interno').slice(0,500);
  return entry;
}

export function authRateLimitKey(req){
  const ip=String(req?.ip||'unknown').slice(0,120);
  const route=String(req?.path||req?.originalUrl||'auth').split('?')[0].slice(0,120);
  return ip+':'+route;
}


export function safeClientErrorMessage(err,{production=process.env.NODE_ENV==='production'}={}){
  if(err?.code==='LIMIT_FILE_SIZE')return 'Cada foto del DNI puede pesar hasta 5 MB';
  if(err?.code==='LIMIT_FILE_COUNT')return 'Solo se permiten frente y dorso del DNI';
  if(err?.code==='23505'){
    if(err?.constraint==='users_dni_key')return 'Ya existe una cuenta con ese DNI. Usá la recuperación de acceso.';
    return 'Ese dato ya existe o la operación ya fue realizada';
  }
  const status=Number(err?.statusCode)||(String(err?.code||'').startsWith('23')?400:500);
  if(production&&status>=500)return 'Error interno';
  return String(err?.message||'Error interno').slice(0,500);
}
