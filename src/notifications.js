import {pool,q} from './db.js';
import {whatsappConfiguration} from './config.js';
import {sendWhatsAppMessage} from './evolutionApi.js';

export async function queueUserNotification(client,{userId,type,title,body,payload={},dedupeKey,whatsapp=true,overridePhone=null}){
  const row=(await q(client,`
    INSERT INTO notifications(user_id,type,title,body,payload,dedupe_key)
    VALUES($1,$2,$3,$4,$5::jsonb,$6)
    ON CONFLICT(dedupe_key) DO NOTHING
    RETURNING id
  `,[userId,type,title,body,JSON.stringify(payload),dedupeKey])).rows[0];

  if(whatsapp){
    await q(client,`
      INSERT INTO notification_outbox(user_id,channel,type,payload,dedupe_key)
      VALUES($1,'whatsapp',$2,$3::jsonb,$4)
      ON CONFLICT(dedupe_key) DO NOTHING
    `,[userId,type,JSON.stringify({body,...payload,overridePhone}),`wa:${dedupeKey}`]);
  }
  return row;
}

export async function pairUserIds(client,pairId){
  return (await q(client,`
    SELECT user_id
    FROM pair_members
    WHERE pair_id=$1
    ORDER BY user_id
  `,[pairId])).rows.map(r=>Number(r.user_id));
}

export async function queuePairNotification(client,pairId,msg){
  for(const userId of await pairUserIds(client,pairId)){
    await queueUserNotification(client,{userId,...msg,dedupeKey:`${msg.dedupeKey}:u${userId}`});
  }
}

export async function queueAssignmentNotification(client,a,msg){
  await queuePairNotification(client,a.pair_a_id,msg);
  await queuePairNotification(client,a.pair_b_id,msg);
}

export function formatMatchSchedule(value){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return 'horario a confirmar';
  return new Intl.DateTimeFormat('es-AR',{
    timeZone:'America/Argentina/Buenos_Aires',
    weekday:'long',
    day:'2-digit',
    month:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    hourCycle:'h23',
  }).format(date);
}

export async function matchNoticeText(client,assignment,{kind='confirmado'}={}){
  const when=formatMatchSchedule(assignment.scheduled_at);
  const place=String(assignment.location_text||'').trim()||'a confirmar';
  const names=(await q(client,`
    SELECT pm.pair_id,u.first_name,u.last_name
    FROM pair_members pm
    JOIN users u ON u.id=pm.user_id
    WHERE pm.pair_id=ANY($1::bigint[])
    ORDER BY pm.pair_id,u.last_name,u.first_name
  `,[ [assignment.pair_a_id,assignment.pair_b_id] ])).rows;
  const label=pairId=>names
    .filter(row=>Number(row.pair_id)===Number(pairId))
    .map(row=>`${row.first_name} ${row.last_name}`.trim())
    .join(' y ')||'pareja';
  const lead=kind==='recordatorio'
    ?'Recordatorio: tu partido empieza en menos de 2 horas.'
    :'Partido confirmado.';
  return `${lead} ${when}. Lugar: ${place}. ${label(assignment.pair_a_id)} vs ${label(assignment.pair_b_id)}.`;
}

// El recordatorio queda en el outbox con clave única. Si Evolution está caída,
// el dispatcher lo reintenta y este barrido no crea otro mensaje.
export async function queueMatchReminders(db=pool){
  const client=await db.connect();
  let checked=0;
  let queued=0;
  try{
    const rows=(await q(client,`
      SELECT *
      FROM wheel_assignments
      WHERE status='open'
        AND schedule_confirmed_at IS NOT NULL
        AND scheduled_at>CURRENT_TIMESTAMP
        AND scheduled_at<=CURRENT_TIMESTAMP+interval '2 hours'
      ORDER BY scheduled_at
      LIMIT 50
    `)).rows;
    checked=rows.length;
    for(const assignment of rows){
      try{
        await client.query('BEGIN');
        const body=await matchNoticeText(client,assignment,{kind:'recordatorio'});
        await queueAssignmentNotification(client,assignment,{
          type:'match_reminder',
          title:'Recordatorio de partido',
          body,
          payload:{
            assignmentId:assignment.id,
            scheduledAt:assignment.scheduled_at,
            locationText:assignment.location_text,
          },
          dedupeKey:`match-reminder:${assignment.id}`,
        });
        await client.query('COMMIT');
        queued++;
      }catch(err){
        await client.query('ROLLBACK');
        console.error('whatsapp: no se pudo encolar el recordatorio',assignment.id,err.message);
      }
    }
  }finally{
    client.release();
  }
  return {checked,queued};
}

export async function expireObsoleteWhatsAppOutbox(client){
  const result=await q(client,`
    UPDATE notification_outbox o
    SET status='expired',
        last_error='obsolete_before_delivery'
    WHERE o.channel='whatsapp'
      AND o.status IN('pending','failed')
      AND (
        (
          o.type='password_recovery'
          AND NOT EXISTS (
            SELECT 1
            FROM password_recovery_codes c
            WHERE c.id=CASE
              WHEN o.payload->>'recoveryId' ~ '^[0-9]+$'
              THEN (o.payload->>'recoveryId')::bigint
              ELSE NULL
            END
              AND c.used_at IS NULL
              AND c.expires_at>CURRENT_TIMESTAMP
          )
        )
        OR
        (
          o.type='pair_invitation'
          AND NOT EXISTS (
            SELECT 1
            FROM pair_invitations i
            WHERE i.id=CASE
              WHEN o.payload->>'invitationId' ~ '^[0-9]+$'
              THEN (o.payload->>'invitationId')::bigint
              ELSE NULL
            END
              AND i.status='pending'
              AND i.expires_at>CURRENT_TIMESTAMP
          )
        )
        OR
        (
          o.type='phone_change'
          AND NOT EXISTS (
            SELECT 1
            FROM phone_change_codes c
            WHERE c.id=COALESCE(
              CASE
                WHEN o.payload->>'phoneChangeId' ~ '^[0-9]+$'
                THEN (o.payload->>'phoneChangeId')::bigint
                ELSE NULL
              END,
              CASE
                WHEN o.dedupe_key ~ '^phone-change-code:[0-9]+$'
                THEN split_part(o.dedupe_key,':',2)::bigint
                ELSE NULL
              END
            )
              AND c.used_at IS NULL
              AND c.expires_at>CURRENT_TIMESTAMP
          )
        )
      )
    RETURNING id
  `);
  return {expired:result.rowCount};
}

export async function dispatchWhatsAppOutbox(limit=30){
  const configured=whatsappConfiguration().configured;
  const client=await pool.connect();
  let rows=[];
  let expired=0;
  try{
    await client.query('BEGIN');
    expired=(await expireObsoleteWhatsAppOutbox(client)).expired;

    if(!configured){
      await client.query('COMMIT');
      return {configured:false,sent:0,failed:0,expired};
    }

    rows=(await q(client,`
      SELECT o.*,u.phone
      FROM notification_outbox o
      JOIN users u ON u.id=o.user_id
      WHERE o.status IN('pending','failed')
        AND o.next_attempt_at<=CURRENT_TIMESTAMP
      ORDER BY o.created_at,o.id
      LIMIT $1
      FOR UPDATE OF o SKIP LOCKED
    `,[limit])).rows;

    if(rows.length){
      await q(client,`
        UPDATE notification_outbox
        SET attempts=attempts+1,
            next_attempt_at=CURRENT_TIMESTAMP+interval '15 minutes'
        WHERE id=ANY($1::bigint[])
      `,[rows.map(r=>r.id)]);
    }
    await client.query('COMMIT');
  }catch(e){
    await client.query('ROLLBACK');
    throw e;
  }finally{
    client.release();
  }

  let sent=0,failed=0;
  for(const r of rows){
    try{
      const payload=r.payload||{};
      const phone=payload.overridePhone||r.phone;
      const text=String(payload.body||'Tenés una novedad en LA RED');
      await sendWhatsAppMessage(phone,text);
      await pool.query(`
        UPDATE notification_outbox
        SET status='sent',sent_at=CURRENT_TIMESTAMP,last_error=NULL
        WHERE id=$1
      `,[r.id]);
      sent++;
    }catch(e){
      await pool.query(`
        UPDATE notification_outbox
        SET status='failed',
            last_error=$2,
            next_attempt_at=CURRENT_TIMESTAMP+interval '30 minutes'
        WHERE id=$1
      `,[r.id,String(e.message).slice(0,1000)]);
      failed++;
    }
  }
  return {configured:true,sent,failed,expired};
}
