import {pool,q} from './db.js';
export async function queueUserNotification(client,{userId,type,title,body,payload={},dedupeKey,whatsapp=true,overridePhone=null}){
  const row=(await q(client,`INSERT INTO notifications(user_id,type,title,body,payload,dedupe_key) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(dedupe_key) DO NOTHING RETURNING id`,[userId,type,title,body,JSON.stringify(payload),dedupeKey])).rows[0];
  if(whatsapp){await q(client,`INSERT INTO notification_outbox(user_id,channel,type,payload,dedupe_key) VALUES($1,'whatsapp',$2,$3::jsonb,$4) ON CONFLICT(dedupe_key) DO NOTHING`,[userId,type,JSON.stringify({body,...payload,overridePhone}),`wa:${dedupeKey}`]);}
  return row;
}
export async function pairUserIds(client,pairId){return (await q(client,`SELECT user_id FROM pair_members WHERE pair_id=$1 ORDER BY user_id`,[pairId])).rows.map(r=>Number(r.user_id));}
export async function queuePairNotification(client,pairId,msg){for(const userId of await pairUserIds(client,pairId))await queueUserNotification(client,{userId,...msg,dedupeKey:`${msg.dedupeKey}:u${userId}`});}
export async function queueAssignmentNotification(client,a,msg){await queuePairNotification(client,a.pair_a_id,msg);await queuePairNotification(client,a.pair_b_id,msg);}
function metaConfigured(){return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID&&process.env.WHATSAPP_ACCESS_TOKEN&&process.env.WHATSAPP_TEMPLATE_NAME);}
async function sendMeta(phone,payload){
  const to=String(payload.overridePhone||phone||'').replace(/\D/g,''); if(!to) throw new Error('Usuario sin teléfono');
  const url=`https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const body={messaging_product:'whatsapp',to,type:'template',template:{name:process.env.WHATSAPP_TEMPLATE_NAME,language:{code:process.env.WHATSAPP_TEMPLATE_LANGUAGE||'es_AR'},components:[{type:'body',parameters:[{type:'text',text:String(payload.body||'Tenés una novedad en LA RED').slice(0,1000)}]}]}};
  const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`WhatsApp ${r.status}: ${await r.text()}`);
}
export async function dispatchWhatsAppOutbox(limit=30){if(!metaConfigured())return {configured:false,sent:0,failed:0};const client=await pool.connect();let rows=[];try{await client.query('BEGIN');rows=(await q(client,`SELECT o.*,u.phone FROM notification_outbox o JOIN users u ON u.id=o.user_id WHERE o.status IN ('pending','failed') AND o.next_attempt_at<=now() ORDER BY o.created_at,o.id LIMIT $1 FOR UPDATE OF o SKIP LOCKED`,[limit])).rows;if(rows.length)await q(client,`UPDATE notification_outbox SET attempts=attempts+1,next_attempt_at=now()+interval '15 minutes' WHERE id=ANY($1::bigint[])`,[rows.map(r=>r.id)]);await client.query('COMMIT');}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}let sent=0,failed=0;for(const r of rows){try{await sendMeta(r.phone,r.payload||{});await pool.query(`UPDATE notification_outbox SET status='sent',sent_at=now(),last_error=NULL WHERE id=$1`,[r.id]);sent++;}catch(e){await pool.query(`UPDATE notification_outbox SET status='failed',last_error=$2,next_attempt_at=now()+interval '30 minutes' WHERE id=$1`,[r.id,String(e.message).slice(0,1000)]);failed++;}}return {configured:true,sent,failed};}
