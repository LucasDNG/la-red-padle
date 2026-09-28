import {q} from './db.js';
import {formationComplete,planCategoryWheel,shouldCancelAssignmentForStructure,resultAllowedAfterCancellation,resultCountsAsReal,roleAfterRealMatch,promotionStateAfterResult,relegationStateAfterResult,populationDirectionalThreshold,entryPositionPenultimate,descendedEntryPosition,individualCategoriesAfterDescent,failureStateAfterClosure,roleAfterOwnFailure,administrativeFailureMovement,fullCalendarMonthsBetween,inactivityReturnPosition,simultaneousOnePlacePenalty} from './wheelV3Rules.js';
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

async function wheelV3ConsumePositionDebt(client,pairIds){
  const ids=[...new Set(pairIds.map(Number))];
  if(!ids.length)return;
  await q(client,`
    UPDATE pairs
    SET position_debt=GREATEST(0,position_debt-1),updated_at=CURRENT_TIMESTAMP
    WHERE id=ANY($1::bigint[])
      AND position_debt>0
  `,[ids]);
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
  const shiftedByInsertion=targetOrder.slice(desired-1);
  targetOrder.splice(desired-1,0,Number(pairId));

  await q(client,`
    UPDATE pairs
    SET category_id=$2,position=999998,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[pairId,targetCategoryId]);
  await wheelV3SetCategoryOrder(client,sourceCategoryId,sourceOrder);
  await wheelV3SetCategoryOrder(client,targetCategoryId,targetOrder);
  await wheelV3ConsumePositionDebt(client,shiftedByInsertion);

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


async function wheelV3DuoStateForPair(client,pairId,{lock=false}={}){
  const row=(await q(client,`
    SELECT pds.*
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
    ${lock?'FOR UPDATE OF pds':''}
  `,[pairId])).rows[0];
  if(!row)throw new Error('Falta pair_duo_state para pareja');
  return row;
}

async function wheelV3PairSnapshot(client,pairIds){
  const rows=(await q(client,`
    SELECT
      p.id,
      p.league_id,
      p.category_id,
      p.position,
      pws.role,
      pws.role_streak,
      pws.defense_required_until_real,
      pws.promotion_wins,
      pws.awaiting_zone_first_match,
      pws.awaiting_zone_kind
    FROM pairs p
    JOIN pair_wheel_state pws ON pws.pair_id=p.id
    WHERE p.id=ANY($1::bigint[])
    ORDER BY p.id
    FOR UPDATE OF p,pws
  `,[pairIds])).rows;
  return Object.fromEntries(rows.map(r=>[Number(r.id),r]));
}

async function wheelV3ActiveCount(client,categoryId){
  return Number((await q(client,`
    SELECT count(*)::int n
    FROM pairs
    WHERE category_id=$1 AND competition_state='active'
  `,[categoryId])).rows[0]?.n||0);
}

async function wheelV3Leader(client,categoryId){
  return (await q(client,`
    SELECT id
    FROM pairs
    WHERE category_id=$1 AND competition_state='active'
    ORDER BY position,id
    LIMIT 1
  `,[categoryId])).rows[0]?.id??null;
}

async function wheelV3PersistPromotionState(client,pairId,state){
  await q(client,`
    UPDATE pair_wheel_state
    SET
      promotion_wins=$2,
      awaiting_zone_first_match=$3,
      awaiting_zone_kind=CASE WHEN $3 THEN 'promotion' ELSE NULL END,
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId,state.wins,Boolean(state.awaitingFirstMatch)]);
}

async function wheelV3PersistRelegationState(client,pairId,categoryId,state){
  const duo=await wheelV3DuoStateForPair(client,pairId,{lock:true});
  if(state.active){
    await q(client,`
      UPDATE pair_duo_state
      SET
        pending_relegation_category_id=$2,
        pending_relegation_losses=$3,
        relegation_route_step=$4,
        pending_relegation_started_at=COALESCE(pending_relegation_started_at,CURRENT_TIMESTAMP),
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,[duo.id,categoryId,state.losses,state.routeStep]);
  }else{
    await q(client,`
      UPDATE pair_duo_state
      SET
        pending_relegation_category_id=NULL,
        pending_relegation_losses=0,
        relegation_route_step=0,
        pending_relegation_started_at=NULL,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,[duo.id]);
  }
}

async function wheelV3ApplyRealRoles(client,assignment,snapshots,categoryId){
  const activeCount=await wheelV3ActiveCount(client,categoryId);
  for(const pairId of [Number(assignment.attacker_pair_id),Number(assignment.defender_pair_id)]){
    const current=(await q(client,`
      SELECT p.position,pws.role,pws.role_streak,pws.defense_required_until_real
      FROM pairs p
      JOIN pair_wheel_state pws ON pws.pair_id=p.id
      WHERE p.id=$1
      FOR UPDATE OF p,pws
    `,[pairId])).rows[0];
    if(!current||Number((await q(client,`SELECT category_id FROM pairs WHERE id=$1`,[pairId])).rows[0].category_id)!==Number(categoryId))continue;
    const next=roleAfterRealMatch({
      previousRole:snapshots[pairId]?.role??current.role,
      wasAttacker:pairId===Number(assignment.attacker_pair_id),
      roleStreak:Number(snapshots[pairId]?.role_streak??current.role_streak??0),
      position:Number(current.position),
      activeCount,
      defenseRequiredUntilReal:Boolean(snapshots[pairId]?.defense_required_until_real),
    });
    await q(client,`
      UPDATE pair_wheel_state
      SET role=$2,role_streak=$3,defense_required_until_real=$4,updated_at=CURRENT_TIMESTAMP
      WHERE pair_id=$1
    `,[pairId,next.role,next.roleStreak,next.defenseRequiredUntilReal]);
  }
}

async function wheelV3ResetFailureStreakAfterRealMatch(client,pairId){
  const duo=await wheelV3DuoStateForPair(client,pairId,{lock:true});
  await q(client,`
    UPDATE pair_duo_state
    SET failure_streak=0,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[duo.id]);
}

export async function applyWheelV3ConfirmedRealResult(client,{
  assignmentId,
  winnerPairId,
  resultType,
  score=null,
  abandonedPairId=null,
  playedAt,
  resolutionSource='wheel-v3',
}){
  if(!resultCountsAsReal(resultType))throw new Error('Wheel v3 real result requiere partido real');
  const assignment=(await q(client,`
    SELECT *
    FROM wheel_assignments
    WHERE id=$1
    FOR UPDATE
  `,[assignmentId])).rows[0];
  if(!assignment)throw new Error('Assignment inexistente');

  const existing=(await q(client,`SELECT * FROM matches WHERE assignment_id=$1`,[assignmentId])).rows[0];
  if(existing)return {match:existing,idempotent:true,movements:[],refresh:[]};

  const pairIds=[Number(assignment.pair_a_id),Number(assignment.pair_b_id)];
  const winner=Number(winnerPairId);
  if(!pairIds.includes(winner))throw new Error('Ganador inválido');
  const loser=pairIds.find(id=>id!==winner);

  if(assignment.status==='cancelled'){
    const eligibility=await wheelV3CancelledResultEligibility(client,assignmentId,playedAt);
    if(!eligibility.eligible)throw new Error('El partido fue jugado después de la cancelación');
  }else if(!['open','result_pending','disputed'].includes(assignment.status)){
    throw new Error('Assignment no disponible para confirmar');
  }

  const category=await wheelV3CategoryRow(client,assignment.category_id);
  await q(client,`
    SELECT id
    FROM categories
    WHERE league_id=$1
    ORDER BY number
    FOR UPDATE
  `,[category.league_id]);

  const before=await wheelV3PairSnapshot(client,pairIds);
  const leaderBefore=await wheelV3Leader(client,assignment.category_id);
  const games=scoreGames(score);

  const match=(await q(client,`
    INSERT INTO matches(
      assignment_id,league_id,category_number,pair_a_id,pair_b_id,
      winner_pair_id,result_type,score,abandoned_pair_id,
      pair_a_games,pair_b_games,played_at,resolution_source
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)
    RETURNING *
  `,[
    assignment.id,
    assignment.league_id,
    Number(category.number),
    assignment.pair_a_id,
    assignment.pair_b_id,
    winner,
    resultType,
    JSON.stringify(score??null),
    abandonedPairId,
    games.a,
    games.b,
    playedAt,
    resolutionSource,
  ])).rows[0];

  const swapped=await wheelV3SwapPairPositions(client,winner,loser);
  const leaderAfterSwap=await wheelV3Leader(client,assignment.category_id);

  await wheelV3ApplyRealRoles(client,assignment,before,assignment.category_id);
  await wheelV3ResetFailureStreakAfterRealMatch(client,winner);
  await wheelV3ResetFailureStreakAfterRealMatch(client,loser);

  const formation=(await q(client,`
    SELECT formation_completed_at
    FROM league_wheel_state
    WHERE league_id=$1
    FOR UPDATE
  `,[assignment.league_id])).rows[0];

  const movements=[];
  const affectedCategories=new Set([Number(assignment.category_id)]);

  if(formation?.formation_completed_at){
    const counts=await wheelV3LeagueCounts(client,assignment.league_id);
    const activeCount=await wheelV3ActiveCount(client,assignment.category_id);
    const currentRows=(await q(client,`
      SELECT p.id,p.position,pws.promotion_wins,pws.awaiting_zone_first_match,pws.awaiting_zone_kind
      FROM pairs p
      JOIN pair_wheel_state pws ON pws.pair_id=p.id
      WHERE p.id=ANY($1::bigint[])
      FOR UPDATE OF p,pws
    `,[pairIds])).rows;
    const current=Object.fromEntries(currentRows.map(r=>[Number(r.id),r]));

    const winnerPromotion=promotionStateAfterResult({
      category:Number(category.number),
      position:Number(current[winner].position),
      activeCount,
      currentWins:Number(current[winner].promotion_wins||0),
      isRealMatch:true,
      won:true,
      threshold:Number(category.number)>1
        ?populationDirectionalThreshold(counts,Number(category.number)-1,Number(category.number)-2)
        :3,
      awaitingFirstMatch:Boolean(current[winner].awaiting_zone_first_match)&&current[winner].awaiting_zone_kind==='promotion',
      wasNumberOneBefore:Number(before[winner].position)===1,
    });
    await wheelV3PersistPromotionState(client,winner,winnerPromotion);

    const loserPromotion=promotionStateAfterResult({
      category:Number(category.number),
      position:Number(current[loser].position),
      activeCount,
      currentWins:Number(current[loser].promotion_wins||0),
      isRealMatch:true,
      won:false,
      threshold:3,
      awaitingFirstMatch:Boolean(current[loser].awaiting_zone_first_match)&&current[loser].awaiting_zone_kind==='promotion',
      wasNumberOneBefore:Number(before[loser].position)===1,
    });
    await wheelV3PersistPromotionState(client,loser,loserPromotion);

    let winnerRelegation={active:false,losses:0,routeStep:0,descend:false,awaitingFirstMatch:false};
    let loserRelegation={active:false,losses:0,routeStep:0,descend:false,awaitingFirstMatch:false};
    if(Number(category.number)<7){
      const winnerDuo=await wheelV3DuoStateForPair(client,winner,{lock:true});
      const loserDuo=await wheelV3DuoStateForPair(client,loser,{lock:true});
      const threshold=populationDirectionalThreshold(counts,Number(category.number)-1,Number(category.number));
      winnerRelegation=relegationStateAfterResult({
        category:Number(category.number),
        wasInRelegation:Number(winnerDuo.pending_relegation_category_id)===Number(category.id),
        losses:Number(winnerDuo.pending_relegation_losses||0),
        routeStep:Number(winnerDuo.relegation_route_step||0),
        isRealMatch:true,
        won:true,
        isLast:Number(current[winner].position)===activeCount,
        threshold,
        awaitingFirstMatch:Boolean(current[winner].awaiting_zone_first_match)&&current[winner].awaiting_zone_kind==='relegation',
      });
      loserRelegation=relegationStateAfterResult({
        category:Number(category.number),
        wasInRelegation:Number(loserDuo.pending_relegation_category_id)===Number(category.id),
        losses:Number(loserDuo.pending_relegation_losses||0),
        routeStep:Number(loserDuo.relegation_route_step||0),
        isRealMatch:true,
        won:false,
        isLast:Number(current[loser].position)===activeCount,
        threshold,
        awaitingFirstMatch:Boolean(current[loser].awaiting_zone_first_match)&&current[loser].awaiting_zone_kind==='relegation',
      });
      await wheelV3PersistRelegationState(client,winner,category.id,winnerRelegation);
      await wheelV3PersistRelegationState(client,loser,category.id,loserRelegation);
      if(current[winner].awaiting_zone_kind==='relegation'){
        await q(client,`UPDATE pair_wheel_state SET awaiting_zone_first_match=false,awaiting_zone_kind=NULL WHERE pair_id=$1`,[winner]);
      }
      if(current[loser].awaiting_zone_kind==='relegation'){
        await q(client,`UPDATE pair_wheel_state SET awaiting_zone_first_match=false,awaiting_zone_kind=NULL WHERE pair_id=$1`,[loser]);
      }
    }

    if(winnerPromotion.promote&&Number(category.number)>1){
      const target=(await q(client,`
        SELECT id FROM categories
        WHERE league_id=$1 AND number=$2
      `,[category.league_id,Number(category.number)-1])).rows[0];
      const movement=await wheelV3MovePairCategory(client,winner,target.id,{mode:'promotion'});
      movements.push({...movement,type:'promotion'});
      affectedCategories.add(Number(target.id));
    }

    if(loserRelegation.descend&&Number(category.number)<7){
      const target=(await q(client,`
        SELECT id FROM categories
        WHERE league_id=$1 AND number=$2
      `,[category.league_id,Number(category.number)+1])).rows[0];
      const movement=await wheelV3MovePairCategory(client,loser,target.id,{mode:'relegation'});
      movements.push({...movement,type:'relegation'});
      affectedCategories.add(Number(target.id));
    }
  }

  if(Number(category.number)===1){
    const leaderAfter=await wheelV3Leader(client,assignment.category_id);
    await wheelV3UpdateFirstPlaceReignAfterRealResult(client,{
      leagueId:assignment.league_id,
      categoryNumber:Number(category.number),
      leaderBefore,
      leaderAfter,
      assignment,
    });
  }

  await q(client,`
    UPDATE wheel_assignments
    SET status='confirmed',closed_at=CURRENT_TIMESTAMP,close_reason='result_confirmed'
    WHERE id=$1
  `,[assignment.id]);
  await q(client,`DELETE FROM wheel_assignment_participants WHERE assignment_id=$1`,[assignment.id]);

  const refresh=[];
  for(const categoryId of [...affectedCategories].sort((a,b)=>a-b)){
    refresh.push({categoryId,...await refreshWheelV3Category(client,categoryId)});
  }

  return {
    match,
    idempotent:false,
    swapped,
    movements,
    refresh,
    leaderBefore:leaderBefore==null?null:Number(leaderBefore),
    leaderAfter:leaderAfterSwap==null?null:Number(leaderAfterSwap),
  };
}


async function wheelV3CurrentPairRow(client,pairId){
  return (await q(client,`
    SELECT p.id,p.league_id,p.category_id,p.position,p.competition_state,c.number category_number
    FROM pairs p
    JOIN categories c ON c.id=p.category_id
    WHERE p.id=$1
    FOR UPDATE OF p
  `,[pairId])).rows[0];
}

async function wheelV3ApplyFailureStreak(client,pairId,{ownFailure=false,rivalOnlyFailure=false}={}){
  const duo=await wheelV3DuoStateForPair(client,pairId,{lock:true});
  const next=failureStateAfterClosure({
    failureStreak:Number(duo.failure_streak||0),
    ownFailure,
    rivalOnlyFailure,
  });
  await q(client,`
    UPDATE pair_duo_state
    SET failure_streak=$2,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[duo.id,next.failureStreak]);
  return {...next,duoId:Number(duo.id)};
}

async function wheelV3ApplyThirtyDayPenalty(client,pairId,duoId){
  const pair=await wheelV3CurrentPairRow(client,pairId);
  await q(client,`
    UPDATE pairs
    SET competition_state='paused',updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[pairId]);
  await q(client,`
    UPDATE pair_wheel_state
    SET
      inactive_since=CURRENT_TIMESTAMP,
      return_position_base=$2,
      inactive_reason='three_failures',
      auto_reactivate_at=CURRENT_TIMESTAMP+interval '30 days',
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId,pair.position]);
  await q(client,`
    UPDATE pair_duo_state
    SET penalty_until=CURRENT_TIMESTAMP+interval '30 days',updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[duoId]);
  const activeOrder=await wheelV3ActiveOrder(client,pair.category_id);
  await wheelV3SetCategoryOrder(client,pair.category_id,activeOrder);
}

async function wheelV3EnsurePromotionZoneAtCurrentTop(client,pairId,{wasNumberOneBefore=false}={}){
  const pair=await wheelV3CurrentPairRow(client,pairId);
  if(Number(pair.category_number)<=1)return;
  if(Number(pair.position)!==1||wasNumberOneBefore)return;
  await q(client,`
    UPDATE pair_wheel_state
    SET promotion_wins=0,awaiting_zone_first_match=false,awaiting_zone_kind=NULL,updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId]);
}

async function wheelV3SyncFirstPlaceReign(client,leagueId,categoryId){
  const category=await wheelV3CategoryRow(client,categoryId);
  if(Number(category.number)!==1)return null;
  const leader=await wheelV3Leader(client,categoryId);
  if(!leader)return null;
  return wheelV3OpenReign(client,leagueId,leader);
}

async function wheelV3AdministrativeRelegationDecision(client,pairId,{ownFailure}){
  const pair=await wheelV3CurrentPairRow(client,pairId);
  if(Number(pair.category_number)>=7)return {descend:false};
  const formation=(await q(client,`
    SELECT formation_completed_at FROM league_wheel_state
    WHERE league_id=$1
    FOR UPDATE
  `,[pair.league_id])).rows[0];
  if(!formation?.formation_completed_at)return {descend:false};

  const activeCount=await wheelV3ActiveCount(client,pair.category_id);
  const isLast=Number(pair.position)===activeCount;
  const duo=await wheelV3DuoStateForPair(client,pairId,{lock:true});
  const counts=await wheelV3LeagueCounts(client,pair.league_id);
  const threshold=populationDirectionalThreshold(counts,Number(pair.category_number)-1,Number(pair.category_number));
  const state=relegationStateAfterResult({
    category:Number(pair.category_number),
    wasInRelegation:Number(duo.pending_relegation_category_id)===Number(pair.category_id),
    losses:Number(duo.pending_relegation_losses||0),
    routeStep:Number(duo.relegation_route_step||0),
    isRealMatch:false,
    won:false,
    ownFailure,
    isLast,
    threshold,
    awaitingFirstMatch:false,
  });
  await wheelV3PersistRelegationState(client,pairId,pair.category_id,state);
  return state;
}

async function wheelV3CountAdministrativeFirstPlaceDefense(client,{assignment,winnerPairId,countsAsFirstPlaceDefense}){
  if(!countsAsFirstPlaceDefense)return null;
  const pair=await wheelV3CurrentPairRow(client,winnerPairId);
  if(Number(pair.category_number)!==1||Number(pair.position)!==1)return null;
  if(Number(assignment.defender_pair_id)!==Number(winnerPairId))return null;
  const reign=await wheelV3OpenReign(client,pair.league_id,winnerPairId);
  return (await q(client,`
    UPDATE first_place_reigns
    SET defenses=defenses+1,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
    RETURNING *
  `,[reign.id])).rows[0];
}

export async function applyWheelV3OneSidedFailure(client,{
  assignmentId,
  failingPairId,
  reportedByUserId=null,
  resolutionSource='self_failure',
  countsAsFirstPlaceDefense=false,
}){
  const assignment=(await q(client,`
    SELECT * FROM wheel_assignments
    WHERE id=$1
    FOR UPDATE
  `,[assignmentId])).rows[0];
  if(!assignment)throw new Error('Assignment inexistente');
  if(!['open','result_pending','disputed'].includes(assignment.status))throw new Error('Assignment no disponible');

  const existing=(await q(client,`SELECT * FROM matches WHERE assignment_id=$1`,[assignmentId])).rows[0];
  if(existing)return {match:existing,idempotent:true,movements:[],refresh:[]};

  const pairIds=[Number(assignment.pair_a_id),Number(assignment.pair_b_id)];
  const failing=Number(failingPairId);
  if(!pairIds.includes(failing))throw new Error('Pareja incumplidora inválida');
  const winner=pairIds.find(id=>id!==failing);

  const category=await wheelV3CategoryRow(client,assignment.category_id);
  await q(client,`
    SELECT id FROM categories
    WHERE league_id=$1
    ORDER BY number
    FOR UPDATE
  `,[category.league_id]);

  const before=await wheelV3PairSnapshot(client,pairIds);
  const failingBefore=before[failing];
  const winnerBefore=before[winner];

  const gamesA=Number(assignment.pair_a_id)===winner?12:0;
  const gamesB=Number(assignment.pair_b_id)===winner?12:0;
  const match=(await q(client,`
    INSERT INTO matches(
      assignment_id,league_id,category_number,pair_a_id,pair_b_id,
      winner_pair_id,result_type,score,abandoned_pair_id,
      pair_a_games,pair_b_games,played_at,resolution_source
    )
    VALUES(
      $1,$2,$3,$4,$5,$6,'administrative_forfeit',
      $7::jsonb,NULL,$8,$9,CURRENT_TIMESTAMP,$10
    )
    RETURNING *
  `,[
    assignment.id,
    assignment.league_id,
    Number(category.number),
    assignment.pair_a_id,
    assignment.pair_b_id,
    winner,
    JSON.stringify({sets:[
      {kind:'set',pairA:Number(assignment.pair_a_id)===winner?6:0,pairB:Number(assignment.pair_b_id)===winner?6:0},
      {kind:'set',pairA:Number(assignment.pair_a_id)===winner?6:0,pairB:Number(assignment.pair_b_id)===winner?6:0},
    ]}),
    gamesA,
    gamesB,
    resolutionSource,
  ])).rows[0];

  const movement=administrativeFailureMovement({
    failingPosition:Number(failingBefore.position),
    rivalPosition:Number(winnerBefore.position),
  });
  let swapped=false;
  if(movement.moved){
    swapped=await wheelV3SwapPairPositions(client,winner,failing);
  }

  const activeCount=await wheelV3ActiveCount(client,assignment.category_id);
  const failingNow=await wheelV3CurrentPairRow(client,failing);
  const role=roleAfterOwnFailure({
    previousRole:failingBefore.role,
    position:Number(failingNow.position),
    activeCount,
  });
  await q(client,`
    UPDATE pair_wheel_state
    SET
      role=$2,
      role_streak=CASE WHEN role=$2 THEN role_streak+1 ELSE 1 END,
      defense_required_until_real=$3,
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[failing,role.role,role.defenseRequiredUntilReal]);

  const failingFailure=await wheelV3ApplyFailureStreak(client,failing,{ownFailure:true});
  await wheelV3ApplyFailureStreak(client,winner,{rivalOnlyFailure:true});

  await wheelV3SyncPromotionEdgeAfterAdministrativeMovement(client,assignment.category_id,Number(before[Number(assignment.pair_a_id)]?.position)===1?Number(assignment.pair_a_id):Number(before[Number(assignment.pair_b_id)]?.position)===1?Number(assignment.pair_b_id):null);
  const relegation=await wheelV3AdministrativeRelegationDecision(client,failing,{ownFailure:true});

  const movements=[];
  const affectedCategories=new Set([Number(assignment.category_id)]);
  if(relegation.descend&&Number(category.number)<7){
    const target=(await q(client,`
      SELECT id FROM categories
      WHERE league_id=$1 AND number=$2
    `,[category.league_id,Number(category.number)+1])).rows[0];
    const moved=await wheelV3MovePairCategory(client,failing,target.id,{mode:'relegation'});
    movements.push({...moved,type:'relegation'});
    affectedCategories.add(Number(target.id));
  }

  if(failingFailure.penalty30Days){
    await wheelV3ApplyThirtyDayPenalty(client,failing,failingFailure.duoId);
  }

  if(Number(category.number)===1){
    await wheelV3SyncFirstPlaceReign(client,assignment.league_id,assignment.category_id);
  }
  await wheelV3CountAdministrativeFirstPlaceDefense(client,{
    assignment,
    winnerPairId:winner,
    countsAsFirstPlaceDefense,
  });

  await q(client,`
    UPDATE wheel_assignments
    SET status='confirmed',closed_at=CURRENT_TIMESTAMP,close_reason=$2
    WHERE id=$1
  `,[assignment.id,resolutionSource]);
  await q(client,`DELETE FROM wheel_assignment_participants WHERE assignment_id=$1`,[assignment.id]);

  const refresh=[];
  for(const categoryId of [...affectedCategories].sort((a,b)=>a-b)){
    refresh.push({categoryId,...await refreshWheelV3Category(client,categoryId)});
  }

  return {
    match,
    failingPairId:failing,
    winnerPairId:winner,
    swapped,
    movements,
    penalty30Days:failingFailure.penalty30Days,
    reportedByUserId,
    refresh,
  };
}


export async function reactivateWheelV3Pair(client,pairId){
  const row=(await q(client,`
    SELECT
      p.id,p.category_id,p.competition_state,
      pws.inactive_since,pws.return_position_base,pws.inactive_reason,pws.auto_reactivate_at,
      CURRENT_TIMESTAMP server_now
    FROM pairs p
    JOIN pair_wheel_state pws ON pws.pair_id=p.id
    WHERE p.id=$1
    FOR UPDATE OF p,pws
  `,[pairId])).rows[0];
  if(!row)throw new Error('Pareja inexistente');
  if(row.competition_state!=='paused')throw new Error('La pareja no está inactiva temporalmente');
  if(!row.inactive_since||!row.return_position_base)throw new Error('Falta snapshot de retorno');

  const activeOrder=await wheelV3ActiveOrder(client,row.category_id);
  const fullMonths=fullCalendarMonthsBetween(row.inactive_since,row.server_now);
  const desired=inactivityReturnPosition({
    originalPosition:Number(row.return_position_base),
    fullMonths,
    activeCount:activeOrder.length,
  });
  const shiftedByInsertion=activeOrder.slice(desired-1);
  activeOrder.splice(desired-1,0,Number(pairId));

  await q(client,`
    UPDATE pairs
    SET competition_state='active',position=999997,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[pairId]);
  await wheelV3SetCategoryOrder(client,row.category_id,activeOrder);
  await wheelV3ConsumePositionDebt(client,shiftedByInsertion);
  await q(client,`
    UPDATE pair_wheel_state
    SET
      role=NULL,
      role_streak=0,
      inactive_since=NULL,
      return_position_base=NULL,
      inactive_reason=NULL,
      auto_reactivate_at=NULL,
      real_waiting_since=CURRENT_TIMESTAMP,
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId]);

  if(row.inactive_reason==='three_failures'){
    const duo=await wheelV3DuoStateForPair(client,pairId,{lock:true});
    await q(client,`
      UPDATE pair_duo_state
      SET penalty_until=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,[duo.id]);
  }

  const refresh=await refreshWheelV3Category(client,row.category_id);
  return {
    pairId:Number(pairId),
    categoryId:Number(row.category_id),
    position:desired,
    fullMonths,
    refresh,
  };
}

export async function reactivateDueWheelV3Penalties(client){
  const due=(await q(client,`
    SELECT p.id
    FROM pairs p
    JOIN pair_wheel_state pws ON pws.pair_id=p.id
    WHERE p.competition_state='paused'
      AND pws.inactive_reason='three_failures'
      AND pws.auto_reactivate_at IS NOT NULL
      AND pws.auto_reactivate_at<=CURRENT_TIMESTAMP
    ORDER BY pws.auto_reactivate_at,p.id
    FOR UPDATE OF p,pws SKIP LOCKED
  `)).rows;
  const reactivated=[];
  for(const row of due)reactivated.push(await reactivateWheelV3Pair(client,row.id));
  return reactivated;
}


async function wheelV3SyncPromotionEdgeAfterAdministrativeMovement(client,categoryId,previousLeaderId){
  const category=await wheelV3CategoryRow(client,categoryId);
  if(Number(category.number)<=1)return null;
  const leader=await wheelV3Leader(client,categoryId);
  if(!leader)return null;
  await q(client,`
    UPDATE pair_wheel_state pws
    SET
      promotion_wins=0,
      awaiting_zone_first_match=CASE WHEN pws.awaiting_zone_kind='promotion' THEN false ELSE pws.awaiting_zone_first_match END,
      awaiting_zone_kind=CASE WHEN pws.awaiting_zone_kind='promotion' THEN NULL ELSE pws.awaiting_zone_kind END,
      updated_at=CURRENT_TIMESTAMP
    FROM pairs p
    WHERE pws.pair_id=p.id
      AND p.category_id=$1
      AND p.id<>$2
      AND (pws.promotion_wins<>0 OR pws.awaiting_zone_kind='promotion')
  `,[categoryId,leader]);
  if(Number(previousLeaderId)!==Number(leader)){
    await q(client,`
      UPDATE pair_wheel_state
      SET promotion_wins=0,awaiting_zone_first_match=false,awaiting_zone_kind=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE pair_id=$1
    `,[leader]);
  }
  return Number(leader);
}

async function wheelV3ApplySimultaneousPositionPenalty(client,categoryId,pairIds){
  const order=await wheelV3ActiveOrder(client,categoryId);
  const debtRows=(await q(client,`
    SELECT id,position_debt
    FROM pairs
    WHERE id=ANY($1::bigint[])
    FOR UPDATE
  `,[order])).rows;
  const debt=Object.fromEntries(debtRows.map(r=>[Number(r.id),Number(r.position_debt||0)]));
  const applied=simultaneousOnePlacePenalty(order,pairIds,debt);
  for(const id of applied.order){
    if(Number(applied.debt[id]||0)!==Number(debt[id]||0)){
      await q(client,`UPDATE pairs SET position_debt=$2 WHERE id=$1`,[id,Number(applied.debt[id]||0)]);
    }
  }
  await wheelV3SetCategoryOrder(client,categoryId,applied.order);
  return applied;
}

export async function applyWheelV3BothFailure(client,{
  assignmentId,
  resolutionSource='both_failure',
}){
  const assignment=(await q(client,`
    SELECT * FROM wheel_assignments
    WHERE id=$1
    FOR UPDATE
  `,[assignmentId])).rows[0];
  if(!assignment)throw new Error('Assignment inexistente');
  if(!['open','result_pending','disputed'].includes(assignment.status))throw new Error('Assignment no disponible');

  const pairIds=[Number(assignment.pair_a_id),Number(assignment.pair_b_id)];
  const category=await wheelV3CategoryRow(client,assignment.category_id);
  await q(client,`
    SELECT id FROM categories
    WHERE league_id=$1
    ORDER BY number
    FOR UPDATE
  `,[category.league_id]);

  const previousLeader=await wheelV3Leader(client,assignment.category_id);
  const applied=await wheelV3ApplySimultaneousPositionPenalty(client,assignment.category_id,pairIds);
  const activeCount=await wheelV3ActiveCount(client,assignment.category_id);

  const failureResults=[];
  const relegationDecisions=[];
  for(const pairId of pairIds){
    const beforeState=(await q(client,`
      SELECT role FROM pair_wheel_state WHERE pair_id=$1 FOR UPDATE
    `,[pairId])).rows[0];
    const pair=await wheelV3CurrentPairRow(client,pairId);
    const role=roleAfterOwnFailure({
      previousRole:beforeState?.role,
      position:Number(pair.position),
      activeCount,
    });
    await q(client,`
      UPDATE pair_wheel_state
      SET
        role=$2,
        role_streak=CASE WHEN role=$2 THEN role_streak+1 ELSE 1 END,
        defense_required_until_real=$3,
        updated_at=CURRENT_TIMESTAMP
      WHERE pair_id=$1
    `,[pairId,role.role,role.defenseRequiredUntilReal]);
    failureResults.push({pairId,...await wheelV3ApplyFailureStreak(client,pairId,{ownFailure:true})});
    relegationDecisions.push({pairId,state:await wheelV3AdministrativeRelegationDecision(client,pairId,{ownFailure:true})});
  }

  await wheelV3SyncPromotionEdgeAfterAdministrativeMovement(client,assignment.category_id,previousLeader);
  if(Number(category.number)===1){
    await wheelV3SyncFirstPlaceReign(client,assignment.league_id,assignment.category_id);
  }

  const movements=[];
  const affectedCategories=new Set([Number(assignment.category_id)]);
  for(const decision of relegationDecisions){
    if(!decision.state.descend||Number(category.number)>=7)continue;
    const target=(await q(client,`
      SELECT id FROM categories
      WHERE league_id=$1 AND number=$2
    `,[category.league_id,Number(category.number)+1])).rows[0];
    const moved=await wheelV3MovePairCategory(client,decision.pairId,target.id,{mode:'relegation'});
    movements.push({...moved,type:'relegation'});
    affectedCategories.add(Number(target.id));
  }

  for(const result of failureResults){
    if(result.penalty30Days){
      await wheelV3ApplyThirtyDayPenalty(client,result.pairId,result.duoId);
    }
  }

  await q(client,`
    UPDATE wheel_assignments
    SET status='confirmed',closed_at=CURRENT_TIMESTAMP,close_reason=$2
    WHERE id=$1
  `,[assignment.id,resolutionSource]);
  await q(client,`DELETE FROM wheel_assignment_participants WHERE assignment_id=$1`,[assignment.id]);

  const refresh=[];
  for(const categoryId of [...affectedCategories].sort((a,b)=>a-b)){
    refresh.push({categoryId,...await refreshWheelV3Category(client,categoryId)});
  }

  return {
    pairIds,
    order:applied.order,
    debt:applied.debt,
    movements,
    penalties30Days:failureResults.filter(x=>x.penalty30Days).map(x=>x.pairId),
    refresh,
  };
}


async function wheelV3PausePairNow(client,pairId,{reason='voluntary'}={}){
  const pair=await wheelV3CurrentPairRow(client,pairId);
  if(pair.competition_state!=='active')return {paused:false,alreadyInactive:true,pairId:Number(pairId)};
  const occupied=(await q(client,`
    SELECT assignment_id
    FROM wheel_assignment_participants
    WHERE pair_id=$1
  `,[pairId])).rows[0];
  if(occupied)throw new Error('La pareja tiene un compromiso pendiente');

  const previousLeader=await wheelV3Leader(client,pair.category_id);
  const returnPosition=Number(pair.position);

  await q(client,`
    UPDATE pairs
    SET competition_state='paused',pause_after_current=false,updated_at=CURRENT_TIMESTAMP
    WHERE id=$1
  `,[pairId]);
  await q(client,`
    UPDATE pair_wheel_state
    SET
      inactive_since=CURRENT_TIMESTAMP,
      return_position_base=$2,
      inactive_reason=$3,
      auto_reactivate_at=NULL,
      promotion_wins=0,
      updated_at=CURRENT_TIMESTAMP
    WHERE pair_id=$1
  `,[pairId,returnPosition,reason]);

  const activeOrder=await wheelV3ActiveOrder(client,pair.category_id);
  await wheelV3SetCategoryOrder(client,pair.category_id,activeOrder);
  await wheelV3SyncPromotionEdgeAfterAdministrativeMovement(client,pair.category_id,previousLeader);
  if(Number(pair.category_number)===1){
    const nextLeader=await wheelV3Leader(client,pair.category_id);
    if(nextLeader)await wheelV3OpenReign(client,pair.league_id,nextLeader);
    else{
      await q(client,`
        UPDATE first_place_reigns
        SET ended_at=COALESCE(ended_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP
        WHERE league_id=$1 AND ended_at IS NULL
      `,[pair.league_id]);
    }
  }
  return {
    paused:true,
    pairId:Number(pairId),
    categoryId:Number(pair.category_id),
    returnPosition,
  };
}

export async function requestWheelV3Inactivity(client,{pairId,requestedByUserId}){
  const member=(await q(client,`
    SELECT 1 FROM pair_members
    WHERE pair_id=$1 AND user_id=$2
  `,[pairId,requestedByUserId])).rowCount;
  if(!member)throw new Error('El usuario no integra la pareja');

  const pair=await wheelV3CurrentPairRow(client,pairId);
  if(pair.competition_state!=='active')return {status:'already_inactive',pairId:Number(pairId)};

  const assignment=(await q(client,`
    SELECT assignment_id
    FROM wheel_assignment_participants
    WHERE pair_id=$1
  `,[pairId])).rows[0];
  if(assignment){
    await q(client,`
      UPDATE pairs
      SET pause_after_current=true,updated_at=CURRENT_TIMESTAMP
      WHERE id=$1
    `,[pairId]);
    await q(client,`
      INSERT INTO pair_pause_requests(pair_id,requested_by_user_id,status,effective_after_current)
      VALUES($1,$2,'pending',true)
      ON CONFLICT(pair_id) WHERE status='pending'
      DO UPDATE SET requested_by_user_id=EXCLUDED.requested_by_user_id,effective_after_current=true
    `,[pairId,requestedByUserId]);
    return {status:'after_current',pairId:Number(pairId),assignmentId:Number(assignment.assignment_id)};
  }

  await q(client,`
    INSERT INTO pair_pause_requests(pair_id,requested_by_user_id,status,effective_after_current,resolved_at)
    VALUES($1,$2,'applied',false,CURRENT_TIMESTAMP)
    ON CONFLICT(pair_id) WHERE status='pending'
    DO UPDATE SET status='applied',resolved_at=CURRENT_TIMESTAMP,effective_after_current=false
  `,[pairId,requestedByUserId]);
  const paused=await wheelV3PausePairNow(client,pairId,{reason:'voluntary'});
  return {status:'paused',...paused};
}

async function applyPendingWheelV3Pauses(client,pairIds){
  const paused=[];
  for(const pairId of pairIds.map(Number)){
    const pair=(await q(client,`
      SELECT competition_state,pause_after_current
      FROM pairs WHERE id=$1 FOR UPDATE
    `,[pairId])).rows[0];
    if(!pair||pair.competition_state!=='active'||!pair.pause_after_current)continue;
    await q(client,`
      UPDATE pair_pause_requests
      SET status='applied',resolved_at=CURRENT_TIMESTAMP
      WHERE pair_id=$1 AND status='pending'
    `,[pairId]);
    paused.push(await wheelV3PausePairNow(client,pairId,{reason:'voluntary'}));
  }
  return paused;
}
