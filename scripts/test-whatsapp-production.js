import 'dotenv/config';
import {productionConfigReport} from '../src/config.js';
import {sendWhatsAppMessage} from '../src/evolutionApi.js';

if(process.env.NODE_ENV!=='production')throw new Error('NODE_ENV debe ser production');
if(process.env.CONFIRM_WHATSAPP_TEST!=='YES')throw new Error('Falta CONFIRM_WHATSAPP_TEST=YES');

const report=productionConfigReport(process.env,{strictIntegrations:true});
if(report.errors.length)throw new Error('Configuración productiva incompleta: '+report.errors.join('; '));

const phone=String(process.env.WHATSAPP_TEST_PHONE||'').trim();
if(!phone)throw new Error('WHATSAPP_TEST_PHONE inválido');

await sendWhatsAppMessage(phone,'Prueba operativa de LA RED Pádel. Si recibiste este mensaje, las notificaciones de WhatsApp están configuradas correctamente.');

console.log(JSON.stringify({ok:true,channel:'whatsapp',provider:'evolution',sent:true}));
