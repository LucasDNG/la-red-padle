import {q} from './db.js';

export async function wheelV3CutoverReadiness(client){
  const engine=(await q(client,`
    SELECT value#>>'{}' value
    FROM app_settings
    WHERE key='engine'
  `)).rows[0]?.value;

  const clockPaused=(await q(client,`
    SELECT COALESCE((SELECT value FROM app_settings WHERE key='league_clock_paused'),'false'::jsonb)#>>'{}' value
  `)).rows[0]?.value==='true';

  const liveAssignments=Number((await q(client,`
    SELECT count(*)::int n
    FROM wheel_assignments
    WHERE status IN('open','result_pending','disputed')
  `)).rows[0].n);

  const liveLegacyAssignments=Number((await q(client,`
    SELECT count(*)::int n
    FROM wheel_assignments
    WHERE status IN('open','result_pending','disputed')
      AND (attacker_pair_id IS NULL OR defender_pair_id IS NULL)
  `)).rows[0].n);

  const pendingPairTransitions=Number((await q(client,`
    SELECT
      (SELECT count(*) FROM pair_pause_requests WHERE status IN('pending','confirmed'))+
      (SELECT count(*) FROM pair_dissolution_requests WHERE status IN('pending','confirmed','awaiting_result')) n
  `)).rows[0].n);

  const pauseAfterCurrent=Number((await q(client,`
    SELECT count(*)::int n
    FROM pairs
    WHERE pause_after_current=true
  `)).rows[0].n);

  const missingPairState=Number((await q(client,`
    SELECT count(*)::int n
    FROM pairs p
    LEFT JOIN pair_wheel_state pws ON pws.pair_id=p.id
    WHERE pws.pair_id IS NULL
  `)).rows[0].n);

  const missingDuoState=Number((await q(client,`
    WITH exact_duos AS (
      SELECT p.id,p.league_id,min(pm.user_id) low_id,max(pm.user_id) high_id
      FROM pairs p
      JOIN pair_members pm ON pm.pair_id=p.id
      GROUP BY p.id,p.league_id
      HAVING count(*)=2
    )
    SELECT count(*)::int n
    FROM exact_duos d
    LEFT JOIN pair_duo_state pds
      ON pds.league_id=d.league_id
     AND pds.member_low_id=d.low_id
     AND pds.member_high_id=d.high_id
    WHERE pds.id IS NULL
  `)).rows[0].n);

  const missingLeagueState=Number((await q(client,`
    SELECT count(*)::int n
    FROM leagues l
    LEFT JOIN league_wheel_state lws ON lws.league_id=l.id
    WHERE l.active=true AND lws.league_id IS NULL
  `)).rows[0].n);

  const blockers=[];
  if(engine!=='wheel-v2')blockers.push('engine_not_wheel_v2');
  if(clockPaused)blockers.push('league_clock_paused');
  if(liveAssignments>0)blockers.push('live_assignments');
  if(liveLegacyAssignments>0)blockers.push('live_legacy_assignments');
  if(pendingPairTransitions>0)blockers.push('pending_pair_transitions');
  if(pauseAfterCurrent>0)blockers.push('pause_after_current');
  if(missingPairState>0)blockers.push('missing_pair_wheel_state');
  if(missingDuoState>0)blockers.push('missing_pair_duo_state');
  if(missingLeagueState>0)blockers.push('missing_league_wheel_state');

  return {
    ready:blockers.length===0,
    blockers,
    engine,
    clockPaused,
    liveAssignments,
    liveLegacyAssignments,
    pendingPairTransitions,
    pauseAfterCurrent,
    missingPairState,
    missingDuoState,
    missingLeagueState,
  };
}

export async function assertWheelV3CutoverReady(client){
  const state=await wheelV3CutoverReadiness(client);
  if(!state.ready){
    const error=new Error('Wheel v3 cutover bloqueado: '+state.blockers.join(', '));
    error.code='WHEEL_V3_CUTOVER_BLOCKED';
    error.state=state;
    throw error;
  }
  return state;
}
