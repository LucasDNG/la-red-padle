import {q} from './db.js';
import {formationComplete,planCategoryWheel} from './wheelV3Rules.js';

export async function wheelV3FormationSnapshot(client,leagueId,{lock=false}={}){
  const rows=(await q(client,`
    SELECT c.id,c.number,count(p.id) FILTER (WHERE p.competition_state='active')::int active_count
    FROM categories c
    LEFT JOIN pairs p ON p.category_id=c.id
    WHERE c.league_id=$1
    GROUP BY c.id,c.number
    ORDER BY c.number
    ${lock?'FOR UPDATE OF c':''}
  `,[leagueId])).rows;
  if(rows.length!==7)throw new Error('Wheel v3 requiere exactamente 7 categorías por circuito');
  return {
    categories:rows,
    complete:formationComplete(rows.map(r=>Number(r.active_count))),
  };
}

export async function wheelV3CategoryPlanningRows(client,categoryId,{lock=false}={}){
  const rows=(await q(client,`
    SELECT
      p.id,
      p.position,
      p.competition_state='active' AS active,
      NOT EXISTS(
        SELECT 1 FROM wheel_assignment_participants wap WHERE wap.pair_id=p.id
      ) AS free,
      pws.role,
      pws.role_streak,
      pws.defense_required_until_real,
      COALESCE(pws.real_waiting_since,p.created_at) AS real_waiting_since
    FROM pairs p
    JOIN pair_wheel_state pws ON pws.pair_id=p.id
    WHERE p.category_id=$1
      AND p.competition_state='active'
      AND p.discipline_state='clear'
      AND NOT EXISTS(
        SELECT 1
        FROM pair_members pm
        JOIN users u ON u.id=pm.user_id
        WHERE pm.pair_id=p.id AND u.discipline_state<>'clear'
      )
      AND NOT EXISTS(
        SELECT 1
        FROM pair_dissolution_requests d
        WHERE d.pair_id=p.id AND d.status IN('pending','confirmed','awaiting_result')
      )
    ORDER BY p.position,p.id
    ${lock?'FOR UPDATE OF p,pws':''}
  `,[categoryId])).rows;
  return rows.map(r=>({
    id:Number(r.id),
    position:Number(r.position),
    active:Boolean(r.active),
    free:Boolean(r.free),
    role:r.role,
    roleStreak:Number(r.role_streak),
    defenseRequiredUntilReal:Boolean(r.defense_required_until_real),
    realWaitingSince:r.real_waiting_since,
  }));
}

export async function wheelV3LastOpponentMap(client,pairIds){
  const ids=[...new Set(pairIds.map(Number))];
  if(!ids.length)return {};
  const rows=(await q(client,`
    WITH ranked AS (
      SELECT
        x.pair_id,
        x.opponent_id,
        row_number() OVER(
          PARTITION BY x.pair_id
          ORDER BY x.played_at DESC,x.match_id DESC
        ) rn
      FROM (
        SELECT m.id match_id,m.played_at,m.pair_a_id pair_id,m.pair_b_id opponent_id
        FROM matches m
        WHERE m.pair_a_id=ANY($1::bigint[])
          AND m.result_type IN('normal','injury_abandonment')
        UNION ALL
        SELECT m.id match_id,m.played_at,m.pair_b_id pair_id,m.pair_a_id opponent_id
        FROM matches m
        WHERE m.pair_b_id=ANY($1::bigint[])
          AND m.result_type IN('normal','injury_abandonment')
      ) x
    )
    SELECT pair_id,opponent_id
    FROM ranked
    WHERE rn=1
  `,[ids])).rows;
  return Object.fromEntries(rows.map(r=>[Number(r.pair_id),Number(r.opponent_id)]));
}

export async function planWheelV3Category(client,categoryId,{lock=false}={}){
  const pairs=await wheelV3CategoryPlanningRows(client,categoryId,{lock});
  const lastOpponentByPair=await wheelV3LastOpponentMap(client,pairs.map(p=>p.id));
  return planCategoryWheel(pairs,{lastOpponentByPair});
}
