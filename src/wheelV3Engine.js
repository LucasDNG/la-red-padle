import {q} from './db.js';
import {formationComplete,planCategoryWheel,shouldCancelAssignmentForStructure,resultAllowedAfterCancellation} from './wheelV3Rules.js';

export async function wheelV3FormationSnapshot(client,leagueId,{lock=false}={}){
  if(lock){
    await q(client,`SELECT id FROM categories WHERE league_id=$1 ORDER BY number FOR UPDATE`,[leagueId]);
  }
  const rows=(await q(client,`
    SELECT c.id,c.number,count(p.id) FILTER (WHERE p.competition_state='active')::int active_count
    FROM categories c
    LEFT JOIN pairs p ON p.category_id=c.id
    WHERE c.league_id=$1
    GROUP BY c.id,c.number
    ORDER BY c.number
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


export async function completeWheelV3FormationIfReady(client,leagueId){
  const state=(await q(client,`
    SELECT *
    FROM league_wheel_state
    WHERE league_id=$1
    FOR UPDATE
  `,[leagueId])).rows[0];
  if(!state)throw new Error('Falta league_wheel_state');
  if(state.formation_completed_at)return {completed:false,alreadyCompleted:true,completedAt:state.formation_completed_at};

  const snapshot=await wheelV3FormationSnapshot(client,leagueId);
  if(!snapshot.complete)return {completed:false,alreadyCompleted:false,completedAt:null};

  const row=(await q(client,`
    UPDATE league_wheel_state
    SET formation_completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
    WHERE league_id=$1 AND formation_completed_at IS NULL
    RETURNING formation_completed_at
  `,[leagueId])).rows[0];
  return {
    completed:Boolean(row),
    alreadyCompleted:false,
    completedAt:row?.formation_completed_at??null,
  };
}

export async function persistWheelV3PlannedRoles(client,pairs){
  for(const pair of pairs){
    await q(client,`
      UPDATE pair_wheel_state
      SET role=$2,role_streak=$3,updated_at=CURRENT_TIMESTAMP
      WHERE pair_id=$1
    `,[
      pair.id,
      pair.role,
      Number(pair.roleStreak)||0,
    ]);
  }
}

export async function createWheelV3AssignmentsForCategory(client,categoryId){
  const category=(await q(client,`
    SELECT id,league_id
    FROM categories
    WHERE id=$1
    FOR UPDATE
  `,[categoryId])).rows[0];
  if(!category)throw new Error('Categoría inexistente');

  const plan=await planWheelV3Category(client,categoryId,{lock:true});
  await persistWheelV3PlannedRoles(client,plan.pairs);

  const created=[];
  for(const item of plan.assignments){
    const attacker=plan.pairs.find(p=>p.id===item.attackerId);
    const defender=plan.pairs.find(p=>p.id===item.defenderId);
    if(!attacker||!defender)continue;
    if(!attacker.free||!defender.free)continue;

    const assignment=(await q(client,`
      INSERT INTO wheel_assignments(
        league_id,
        category_id,
        pair_a_id,
        pair_b_id,
        attacker_pair_id,
        defender_pair_id
      )
      VALUES($1,$2,$3,$4,$3,$4)
      RETURNING *
    `,[
      category.league_id,
      category.id,
      attacker.id,
      defender.id,
    ])).rows[0];

    await q(client,`
      INSERT INTO wheel_assignment_participants(assignment_id,pair_id)
      VALUES($1,$2),($1,$3)
    `,[assignment.id,attacker.id,defender.id]);

    created.push(assignment);
  }
  return {plan,created};
}


export async function cancelInvalidWheelV3AssignmentsForCategory(client,categoryId){
  await q(client,`SELECT id FROM categories WHERE id=$1 FOR UPDATE`,[categoryId]);
  const rows=(await q(client,`
    SELECT
      wa.*,
      attacker.category_id attacker_category_id,
      attacker.position attacker_position,
      defender.category_id defender_category_id,
      defender.position defender_position
    FROM wheel_assignments wa
    JOIN pairs attacker ON attacker.id=wa.attacker_pair_id
    JOIN pairs defender ON defender.id=wa.defender_pair_id
    WHERE wa.category_id=$1
      AND wa.status IN('open','result_pending')
    ORDER BY wa.id
    FOR UPDATE OF wa
  `,[categoryId])).rows;

  const cancelled=[];
  for(const row of rows){
    const shouldCancel=shouldCancelAssignmentForStructure({
      hasFirstResult:Boolean(row.first_result_at),
      attackerCategory:row.attacker_category_id,
      defenderCategory:row.defender_category_id,
      attackerPosition:row.attacker_position,
      defenderPosition:row.defender_position,
    });
    if(!shouldCancel)continue;

    const reason=Number(row.attacker_category_id)!==Number(row.defender_category_id)
      ?'system_category_cancel'
      :'system_ranking_cancel';

    const closed=(await q(client,`
      UPDATE wheel_assignments
      SET
        status='cancelled',
        cancelled_at=CURRENT_TIMESTAMP,
        closed_at=CURRENT_TIMESTAMP,
        close_reason=$2
      WHERE id=$1
        AND first_result_at IS NULL
        AND status IN('open','result_pending')
      RETURNING *
    `,[row.id,reason])).rows[0];
    if(!closed)continue;

    await q(client,`DELETE FROM wheel_assignment_participants WHERE assignment_id=$1`,[row.id]);
    cancelled.push(closed);
  }
  return cancelled;
}

export async function registerWheelV3FirstResult(client,assignmentId){
  const row=(await q(client,`
    UPDATE wheel_assignments
    SET
      first_result_at=COALESCE(first_result_at,CURRENT_TIMESTAMP),
      confirmation_deadline_at=COALESCE(confirmation_deadline_at,CURRENT_TIMESTAMP+interval '7 days'),
      status=CASE WHEN status='open' THEN 'result_pending' ELSE status END
    WHERE id=$1
      AND status IN('open','result_pending')
    RETURNING *
  `,[assignmentId])).rows[0];
  if(!row)throw new Error('Assignment no disponible para primera carga');
  return row;
}

export async function wheelV3CancelledResultEligibility(client,assignmentId,playedAt){
  const row=(await q(client,`
    SELECT id,cancelled_at,status
    FROM wheel_assignments
    WHERE id=$1
  `,[assignmentId])).rows[0];
  if(!row)throw new Error('Assignment inexistente');
  if(row.status!=='cancelled')return {eligible:true,cancelledAt:row.cancelled_at};
  return {
    eligible:resultAllowedAfterCancellation({playedAt,cancelledAt:row.cancelled_at}),
    cancelledAt:row.cancelled_at,
  };
}
