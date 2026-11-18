import {whatsappConfiguration} from './config.js';

// Argentina móvil para Evolution: 549 + área sin 0 + abonado sin 15.
// 3329 15 400704, +54 9 3329 400704 y (3329)-400704 terminan en 5493329400704.
export function formatArgentineWhatsApp(phone){
  let digits=String(phone??'').replace(/\D/g,'');
  if(digits.startsWith('00'))digits=digits.slice(2);
  if(digits.startsWith('54'))digits=digits.slice(2);
  if(digits.startsWith('0'))digits=digits.slice(1);
  if(digits.startsWith('15')&&digits.length===12)digits=digits.slice(2);
  if(digits.length>10){
    const withoutTrunk=digits.replace('15','');
    if(withoutTrunk.length===10)digits=withoutTrunk;
  }
  if(digits.startsWith('9')&&digits.length===11)digits=digits.slice(1);
  if(digits.length===10)digits='9'+digits;
  const formatted='54'+digits;
  if(!/^549\d{10}$/.test(formatted))throw new Error('Teléfono inválido');
  return formatted;
}

async function postText(url,apiKey,number,text){
  const response=await fetch(url,{
    method:'POST',
    headers:{
      'content-type':'application/json',
      apikey:apiKey,
    },
    body:JSON.stringify({number,text}),
  });
  if(!response.ok){
    await response.text().catch(()=>{});
    throw new Error(`Evolution HTTP ${response.status}`);
  }
  return response;
}

function canRetry(err){
  const message=String(err?.message||'');
  return !message.startsWith('Evolution HTTP')
    && !message.startsWith('WhatsApp incompleto')
    && !message.startsWith('Teléfono')
    && !message.startsWith('Mensaje');
}

export async function sendWhatsAppMessage(phoneNumber,message){
  const {configured,missing}=whatsappConfiguration();
  if(!configured){
    const err=new Error('WhatsApp incompleto: '+missing.join(', '));
    console.error('whatsapp:',err.message);
    throw err;
  }

  const number=formatArgentineWhatsApp(phoneNumber);
  const text=String(message||'').trim().slice(0,1000);
  if(!text)throw new Error('Mensaje vacío');

  const base=String(process.env.EVOLUTION_API_URL).trim().replace(/\/+$/,'');
  const instance=encodeURIComponent(String(process.env.EVOLUTION_INSTANCE_NAME).trim());
  const url=`${base}/message/sendText/${instance}`;
  const apiKey=String(process.env.EVOLUTION_API_KEY);

  let lastError;
  for(let attempt=1;attempt<=2;attempt++){
    try{
      await postText(url,apiKey,number,text);
      return {ok:true};
    }catch(err){
      lastError=err;
      console.error(`whatsapp: intento ${attempt} falló (${err.message})`);
      if(!canRetry(err)||attempt===2)throw err;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
  }
  throw lastError;
}
