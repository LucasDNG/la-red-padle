import 'dotenv/config';
import {app} from './app.js';
import {maintenance} from './wheel.js';
import {dispatchWhatsAppOutbox} from './notifications.js';
const port=Number(process.env.PORT||3000);
app.listen(port,'0.0.0.0',()=>console.log(`LA RED Pádel API · wheel-v2 · ${port}`));
async function tick(){try{await maintenance();await dispatchWhatsAppOutbox();}catch(e){console.error('maintenance',e);}}
setTimeout(tick,1500).unref();setInterval(tick,60*60*1000).unref();
