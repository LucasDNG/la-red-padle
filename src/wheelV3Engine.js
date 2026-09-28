import {q} from './db.js';
import {formationComplete,planCategoryWheel,shouldCancelAssignmentForStructure,resultAllowedAfterCancellation,resultCountsAsReal,roleAfterRealMatch,promotionStateAfterResult,relegationStateAfterResult,populationDirectionalThreshold,entryPositionPenultimate,descendedEntryPosition,individualCategoriesAfterDescent} from './wheelV3Rules.js';
import {scoreGames} from './core.js';

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

  const initializedZones=await initializeWheelV3FormationZones(client,leagueId);
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
    initializedZones,
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


async function wheelV3RealMatchCountForPair(client,pairId){
  const row=(await q(client,`
    SELECT count(*)::int n
    FROM matches
    WHERE (pair_a_id=$1 OR pair_b_id=$1)
      AND result_type IN('normal','injury_abandonment')
  `,[pairId])).rows[0];
  return Number(row?.n||0);
}

async function wheelV3DuoStateIdForPair(client,pairId){
  const row=(await q(client,`
    SELECT pds.id
    FROM pairs p
    JOIN LATERAL (
      SELECT min(pm.user_id) member_low_id,max(pm.user_id) member_high_id,count(*) member_count
      FROM pair_members pm
      WHERE pm.pair_id=p.id
    ) members ON true
    JOIN pair_duo_state pds
      ON pds.league_id=p.league_id
     AND pds.member_low_id=members.member_low_id
     AND pds.member_high_id=members.member_high_id
    WHERE p.id=$1
      AND members.member_count=2
  `,[pairId])).rows[0];
  if(!row)throw new Error('Falta pair_duo_state para pareja');
  return Number(row.id);
}

export async function initializeWheelV3FormationZones(client,leagueId){
  const categories=(await q(client,`
    SELECT id,number
    FROM categories
    WHERE league_id=$1
    ORDER BY number
    FOR UPDATE
  `,[leagueId])).rows;
  const initialized=[];

  for(const category of categories){
    const active=(await q(client,`
      SELECT id,position
      FROM pairs
      WHERE category_id=$1 AND competition_state='active'
      ORDER BY position,id
      FOR UPDATE
    `,[category.id])).rows;
    if(!active.length)continue;

    const top=active[0];
    const bottom=active.at(-1);

    if(Number(category.number)>=2){
      const realMatches=await wheelV3RealMatchCountForPair(client,top.id);
      await q(client,`
        UPDATE pair_wheel_state
        SET
          promotion_wins=0,
          awaiting_zone_first_match=$2,
          awaiting_zone_kind=CASE WHEN $2 THEN 'promotion' ELSE NULL END,
          updated_at=CURRENT_TIMESTAMP
        WHERE pair_id=$1
      `,[top.id,realMatches===0]);
      initialized.push({pairId:Number(top.id),zone:'promotion',awaitingFirstMatch:realMatches===0});
    }

    if(Number(category.number)<=6){
      const realMatches=await wheelV3RealMatchCountForPair(client,bottom.id);
      if(realMatches===0){
        await q(client,`
          UPDATE pair_wheel_state
          SET
            awaiting_zone_first_match=true,
            awaiting_zone_kind='relegation',
            updated_at=CURRENT_TIMESTAMP
          WHERE pair_id=$1
        `,[bottom.id]);
      }else{
        const duoStateId=await wheelV3DuoStateIdForPair(client,bottom.id);
        await q(client,`
          UPDATE pair_duo_state
          SET
            pending_relegation_category_id=$2,
            pending_relegation_losses=0,
            relegation_route_step=0,
            pending_relegation_started_at=COALESCE(pending_relegation_started_at,CURRENT_TIMESTAMP),
            updated_at=CURRENT_TIMESTAMP
          WHERE id=$1
            AND pending_relegation_category_id IS NULL
        `,[duoStateId,category.id]);
      }
      initialized.push({pairId:Number(bottom.id),zone:'relegation',awaitingFirstMatch:realMatches===0});
    }
  }
  return initialized;
}

export async function refreshWheelV3Category(client,categoryId){
  const cancelled=await cancelInvalidWheelV3AssignmentsForCategory(client,categoryId);
  const assignmentResult=await createWheelV3AssignmentsForCategory(client,categoryId);
  return {cancelled,created:assignmentResult.created,plan:assignmentResult.plan};
}


async function wheelV3CategoryRow(client,categoryId){
  const row=(await q(client,`
    SELECT c.id,c.league_id,c.number
    FROM categories c
    WHERE c.id=$1
  `,[categoryId])).rows[0];
  if(!row)throw new Error('Categoría inexistente');
  return row;
}

async function wheelV3LeagueCounts(client,leagueId){
  const rows=(await q(client,`
    SELECT c.number,count(p.id) FILTER (WHERE p.competition_state='active')::int active_count
    FROM categories c
    LEFT JOIN pairs p ON p.category_id=c.id
    WHERE c.league_id=$1
    GROUP BY c.id,c.number
    ORDER BY c.number
  `,[leagueId])).rows;
  return Array.from({length:7},(_,i)=>Number(rows.find(r=>Number(r.number)===i+1)?.active_count||0));
}

async function wheelV3ActiveOrder(client,categoryId,{excludePairId=null}={}){
  const values=[];
  const params=[categoryId];
  let exclude='';
  if(excludePairId!=null){
    params.push(excludePairId);
    exclude=' AND id<>$2';
  }
  const rows=(await q(client,`
    SELECT id
    FROM pairs
    WHERE category_id=$1
      AND competition_state='active'
      ${exclude}
    ORDER BY position,id
    FOR UPDATE
  `,params)).rows;
  for(const row of rows)values.push(Number(row.id));
  return values;
}

async function wheelV3SetCategoryOrder(client,categoryId,activeOrder){
  const paused=(await q(client,`
    SELECT id
    FROM pairs
    WHERE category_id=$1
      AND competition_state='paused'
      AND NOT (id=ANY($2::bigint[]))
    ORDER BY position,id
    FOR UPDATE
  `,[categoryId,activeOrder.length?activeOrder:[-1]])).rows.map(r=>Number(r.id));
  const all=[...activeOrder,...paused];
  if(!all.length)return;
  const base=900000+all.length;
  for(let i=0;i<all.length;i++)await q(client,`UPDATE pairs SET position=$2 WHERE id=$1`,[all[i],base+i]);
  for(let i=0;i<all.length;i++)await q(client,`UPDATE pairs SET position=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[all[i],i+1]);
}

async function wheelV3SwapPairPositions(client,winnerPairId,loserPairId){
  const rows=(await q(client,`
    SELECT id,category_id,position
    FROM pairs
    WHERE id=ANY($1::bigint[])
    ORDER BY id
    FOR UPDATE
  `,[[winnerPairId,loserPairId]])).rows;
  if(rows.length!==2)throw new Error('Parejas inexistentes');
  const winner=rows.find(r=>Number(r.id)===Number(winnerPairId));
  const loser=rows.find(r=>Number(r.id)===Number(loserPairId));
  if(Number(winner.category_id)!==Number(loser.category_id))return false;
  if(Number(winner.position)<=Number(loser.position))return false;
  await q(client,`UPDATE pairs SET position=999999 WHERE id=$1`,[winnerPairId]);
  await q(client,`UPDATE pairs SET position=$2 WHERE id=$1`,[loserPairId,winner.position]);
  await q(client,`UPDATE pairs SET position=$2 WHERE id=$1`,[winnerPairId,loser.position]);
  return true;
}

async function wheelV3MovePairCategory(client,pairId,targetCategoryId,{mode}){
  const pair=(await q(client,`
    SELECT p.*,c.number source_number
    FROM pairs p
    JOIN categories c ON c.id=p.category_id
    WHERE p.id=$1
    FOR UPDATE OF p
  `,[pairId])).rows[0];
  if(!pair)throw new Error('Pareja inexistente');
  const target=await wheelV3CategoryRow(client,targetCategoryId);
  const sourceCategoryId=Number(pair.category_id);
  const sourceOrder=await wheelV3ActiveOrder(client,sourceCategoryId,{excludePairId:pairId});
  const targetOrder=await wheelV3ActiveOrder(client,targetCategoryId,{excludePairId:pairId});
  const desired=mode==='promotion'
    ?entryPositionPenultimate(targetOrder.length)
    :descendedEntryPosition(targetOrder.length);
  targetOrder.splice(desired-1,0,Number(pairId));

  await q(client,`
    UPDATE pairs
    SET category_id=$2,position=999998,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[pairId,targetCategoryId]);
  await wheelV3SetCategoryOrder(client,sourceCategoryId,sourceOrder);
  await wheelV3SetCategoryOrder(client,targetCategoryId,targetOrder);

  const members=(await q(client,`
    SELECT u.id,u.current_category_number
    FROM pair_members pm
    JOIN users u ON u.id=pm.user_id
    WHERE pm.pair_id=$1
    FOR UPDATE OF u
  `,[pairId])).rows;
  if(mode==='promotion'){
    for(const member of members){
      const current=member.current_category_number==null?null:Number(member.current_category_number);
      const next=current==null?Number(target.number):Math.min(current,Number(target.number));
      await q(client,`UPDATE users SET current_category_number=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[member.id,next]);
    }
  }else{
    const nextValues=individualCategoriesAfterDescent(members.map(m=>m.current_category_number??target.number),Number(target.number));
    for(let i=0;i<members.length;i++){
      await q(client,`UPDATE users SET current_category_number=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[members[i].id,nextValues[i]]);
    }
  }

  await q(client,`
    UPDATE pair_wheel_state
    SET
      role='attack',
      role_streak=1,
      promotion_wins=0,
      awaiting_zone_first_match=false,
      awaiting_zone_kind=NULL,
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId]);

  if(mode==='relegation'){
    const duoStateId=await wheelV3DuoStateIdForPair(client,pairId);
    await q(client,`
      UPDATE pair_duo_state
      SET
        pending_relegation_category_id=NULL,
        pending_relegation_losses=0,
        relegation_route_step=0,
        pending_relegation_started_at=NULL,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,[duoStateId]);
  }

  return {
    pairId:Number(pairId),
    fromCategoryId:sourceCategoryId,
    toCategoryId:Number(targetCategoryId),
    from:Number(pair.source_number),
    to:Number(target.number),
    entryPosition:desired,
  };
}

async function wheelV3OpenReign(client,leagueId,pairId){
  const open=(await q(client,`
    SELECT *
    FROM first_place_reigns
    WHERE league_id=$1 AND ended_at IS NULL
    FOR UPDATE
  `,[leagueId])).rows[0];
  if(open&&Number(open.pair_id)===Number(pairId))return open;
  if(open){
    await q(client,`UPDATE first_place_reigns SET ended_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=$1`,[open.id]);
  }
  return (await q(client,`
    INSERT INTO first_place_reigns(league_id,pair_id)
    VALUES($1,$2)
    RETURNING *
  `,[leagueId,pairId])).rows[0];
}

async function wheelV3UpdateFirstPlaceReignAfterRealResult(client,{leagueId,categoryNumber,leaderBefore,leaderAfter,assignment}){
  if(Number(categoryNumber)!==1||!leaderAfter)return null;
  const open=await wheelV3OpenReign(client,leagueId,leaderAfter);
  if(Number(leaderBefore)!==Number(leaderAfter))return open;
  if(Number(assignment.defender_pair_id)!==Number(leaderAfter))return open;
  return (await q(client,`
    UPDATE first_place_reigns
    SET defenses=defenses+1,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
    RETURNING *
  `,[open.id])).rows[0];
}
