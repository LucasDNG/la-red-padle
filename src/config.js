const INSECURE_SSL_MODES=new Set(['disable','allow','prefer','no-verify']);

function clean(value){return String(value??'').trim();}
function parseDatabaseUrl(raw){
  const value=clean(raw);
  if(!value)return null;
  try{return new URL(value);}catch{return null;}
}
function base32Secret(value){return /^[A-Z2-7]+=*$/i.test(clean(value))&&clean(value).replace(/=+$/,'').length>=16;}

export function databasePoolOptions(env=process.env){
  const connectionString=clean(env.DATABASE_URL);
  const options={
    connectionString:connectionString||undefined,
    application_name:'la-red-padel',
    connectionTimeoutMillis:10000,
    idleTimeoutMillis:30000,
  };
  if(env.NODE_ENV==='production'){
    if(!connectionString)throw new Error('DATABASE_URL es obligatorio en producción');
    const url=parseDatabaseUrl(connectionString);
    if(!url)throw new Error('DATABASE_URL inválida');
    const sslMode=clean(url.searchParams.get('sslmode')).toLowerCase();
    if(INSECURE_SSL_MODES.has(sslMode))throw new Error('DATABASE_URL usa un modo SSL inseguro');
    const hasSslOptions=['sslmode','sslcert','sslkey','sslrootcert','ssl'].some(k=>url.searchParams.has(k));
    if(!hasSslOptions)options.ssl=true;
  }
  return options;
}

export function productionConfigReport(env=process.env,{strictIntegrations=false}={}){
  const errors=[],warnings=[];
  if(env.NODE_ENV!=='production')errors.push('NODE_ENV debe ser production');

  const db=clean(env.DATABASE_URL),dbUrl=parseDatabaseUrl(db);
  if(!db)errors.push('DATABASE_URL es obligatorio');
  else if(!dbUrl)errors.push('DATABASE_URL no es una URL PostgreSQL válida');
  else{
    const mode=clean(dbUrl.searchParams.get('sslmode')).toLowerCase();
    if(INSECURE_SSL_MODES.has(mode))errors.push('DATABASE_URL no puede usar sslmode inseguro');
    if(/\.neon\.tech$/i.test(dbUrl.hostname)){
      const channel=clean(dbUrl.searchParams.get('channel_binding')).toLowerCase();
      if(mode==='require'&&channel!=='require')warnings.push('Neon: preferí channel_binding=require o verificación completa del certificado');
    }
  }

  const jwt=clean(env.JWT_SECRET);
  if(jwt.length<32||/cambiar|change|secret/i.test(jwt))errors.push('JWT_SECRET debe ser aleatorio y tener al menos 32 caracteres');

  const origins=clean(env.FRONTEND_URL).split(',').map(x=>x.trim()).filter(Boolean);
  if(!origins.length)errors.push('FRONTEND_URL es obligatorio');
  else if(origins.some(x=>!/^https:\/\//i.test(x)||/localhost|127\.0\.0\.1/i.test(x)))errors.push('FRONTEND_URL de producción debe contener solo orígenes HTTPS');

  if(!base32Secret(env.ADMIN_TOTP_SECRET))errors.push('ADMIN_TOTP_SECRET debe ser un secreto Base32 válido');

  const whatsapp=['WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_ACCESS_TOKEN','WHATSAPP_TEMPLATE_NAME'];
  const missingWhatsApp=whatsapp.filter(k=>!clean(env[k]));
  if(missingWhatsApp.length){
    const msg='WhatsApp incompleto: '+missingWhatsApp.join(', ');
    if(strictIntegrations)errors.push(msg);else warnings.push(msg);
  }
  if(clean(env.WHATSAPP_TEMPLATE_LANGUAGE)&&!/^[a-z]{2}_[A-Z]{2}$/.test(clean(env.WHATSAPP_TEMPLATE_LANGUAGE)))errors.push('WHATSAPP_TEMPLATE_LANGUAGE inválido');

  return {errors,warnings};
}

export function assertRuntimeConfig(env=process.env){
  if(env.NODE_ENV!=='production')return {errors:[],warnings:[]};
  const report=productionConfigReport(env,{strictIntegrations:false});
  if(report.errors.length)throw new Error('Configuración de producción inválida: '+report.errors.join('; '));
  return report;
}
