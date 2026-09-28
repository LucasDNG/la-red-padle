export function pairKey(memberA,memberB){
  const a=Number(memberA),b=Number(memberB);
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b)throw new Error('invalid members');
  return a<b?`${a}:${b}`:`${b}:${a}`;
}

export function individualCategoriesAfterDescent(memberCategories,newCategory){
  return memberCategories.map(value=>Math.max(Number(value),Number(newCategory)));
}

export function categoryForReformedPair({memberCategories,pendingDescentCategory=null}){
  if(pendingDescentCategory!=null)return Number(pendingDescentCategory);
  return Math.min(...memberCategories.map(Number));
}

export function shouldResetPairFailures(closeReason){
  return closeReason==='real_match_resolved'||closeReason==='rival_only_failure';
}

export function zoneAfterFormation({category,position,activeCount,realMatchesBefore,firstMatchJustClosed=false}){
  const c=Number(category),pos=Number(position),n=Number(activeCount),played=Number(realMatchesBefore);
  const isPromotionSpot=c>=2&&c<=7&&pos===1;
  const isRelegationSpot=c>=1&&c<=6&&pos===n;
  if(!isPromotionSpot&&!isRelegationSpot)return {zone:null,count:0};
  if(played===0&&!firstMatchJustClosed)return {zone:'awaiting_first_match',count:0};
  if(isPromotionSpot)return {zone:'promotion',count:0};
  return {zone:'relegation',count:0};
}

export function inactivityReturnPosition({originalPosition,fullMonths,activeCount}){
  const original=Number(originalPosition),months=Number(fullMonths),active=Number(activeCount);
  if(original<1||months<0||active<0)throw new Error('invalid inactivity data');
  const base=original===1?2:original;
  const lost=Math.max(0,Math.floor(months)-3);
  const desired=base+lost;
  return Math.min(desired,active+1);
}

export function recordReign({currentDefenses,historicalMax}){
  const defenses=Number(currentDefenses),max=Number(historicalMax);
  if(defenses>max)return {historicalMax:defenses,status:'new_record'};
  if(defenses===max&&defenses>0)return {historicalMax:max,status:'shared_record'};
  return {historicalMax:max,status:'below_record'};
}


export function fullCalendarMonthsBetween(startValue,endValue){
  const start=new Date(startValue),end=new Date(endValue);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)throw new Error('invalid month range');
  let months=(end.getUTCFullYear()-start.getUTCFullYear())*12+(end.getUTCMonth()-start.getUTCMonth());
  const targetYear=start.getUTCFullYear()+Math.floor((start.getUTCMonth()+months)/12);
  const targetMonth=(start.getUTCMonth()+months)%12;
  const lastDay=new Date(Date.UTC(targetYear,targetMonth+1,0)).getUTCDate();
  const anniversary=new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(start.getUTCDate(),lastDay),
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds(),
  ));
  if(anniversary>end)months--;
  return Math.max(0,months);
}

export function resultAllowedAfterCancellation({playedAt,cancelledAt}){
  if(cancelledAt==null)return true;
  const played=new Date(playedAt),cancelled=new Date(cancelledAt);
  if(Number.isNaN(played.getTime())||Number.isNaN(cancelled.getTime()))throw new Error('invalid cancellation dates');
  return played<=cancelled;
}

export function deadlineFromServerTime(serverNowValue,days){
  const now=new Date(serverNowValue),n=Number(days);
  if(Number.isNaN(now.getTime())||!Number.isFinite(n)||n<0)throw new Error('invalid deadline data');
  return new Date(now.getTime()+n*24*60*60*1000);
}


export function formationComplete(activeCountsByCategory){
  if(!Array.isArray(activeCountsByCategory)||activeCountsByCategory.length!==7)throw new Error('formation requires seven categories');
  return activeCountsByCategory.every(value=>Number(value)>=5);
}

export function forcedRoleForPosition({position,activeCount}){
  const pos=Number(position),n=Number(activeCount);
  if(!Number.isInteger(pos)||!Number.isInteger(n)||pos<1||n<1||pos>n)throw new Error('invalid ladder position');
  if(n===1)return null;
  if(pos===1)return 'defense';
  if(pos===n)return 'attack';
  return null;
}

export function roleAfterRealMatch({previousRole,wasAttacker,roleStreak=0,position,activeCount,defenseRequiredUntilReal=false}){
  const forced=forcedRoleForPosition({position,activeCount});
  if(forced)return {role:forced,roleStreak:previousRole===forced?Number(roleStreak)+1:1,defenseRequiredUntilReal:forced==='defense'?Boolean(defenseRequiredUntilReal):false};
  const next=wasAttacker?'defense':'attack';
  return {
    role:next,
    roleStreak:previousRole===next?Number(roleStreak)+1:1,
    defenseRequiredUntilReal:false,
  };
}

export function sortByLongestRealWait(pairs){
  return [...pairs].sort((a,b)=>{
    const ta=new Date(a.realWaitingSince).getTime();
    const tb=new Date(b.realWaitingSince).getTime();
    if(Number.isNaN(ta)||Number.isNaN(tb))throw new Error('invalid real wait');
    if(ta!==tb)return ta-tb;
    if(Number(a.position)!==Number(b.position))return Number(a.position)-Number(b.position);
    return Number(a.id)-Number(b.id);
  });
}

function defenderEligible(attacker,candidate){
  return Number(candidate.position)<Number(attacker.position)
    && candidate.role==='defense'
    && candidate.active!==false
    && candidate.free!==false;
}

export function chooseDefenderForAttacker(attacker,candidates,{lastOpponentId=null,windowSize=3}={}){
  const size=Math.max(1,Number(windowSize)||3);
  const superior=[...candidates]
    .filter(c=>defenderEligible(attacker,c))
    .sort((a,b)=>Number(b.position)-Number(a.position));
  if(!superior.length)return null;

  const maxDistance=Number(attacker.position)-Math.min(...superior.map(c=>Number(c.position)));
  for(let limit=size;limit<=maxDistance+size;limit+=size){
    const window=superior.filter(c=>Number(attacker.position)-Number(c.position)<=limit);
    if(!window.length)continue;
    const fresh=lastOpponentId==null?window:window.filter(c=>Number(c.id)!==Number(lastOpponentId));
    const pool=fresh.length?fresh:window;
    if(pool.length){
      return sortByLongestRealWait(pool)[0];
    }
  }
  return null;
}

export function assignAttackersToDefenders(pairs,{lastOpponentByPair={}}={}){
  const attackers=sortByLongestRealWait(pairs.filter(p=>p.role==='attack'&&p.active!==false&&p.free!==false));
  const available=new Map(pairs.filter(p=>p.role==='defense'&&p.active!==false&&p.free!==false).map(p=>[Number(p.id),p]));
  const assignments=[];
  for(const attacker of attackers){
    const defender=chooseDefenderForAttacker(attacker,[...available.values()],{
      lastOpponentId:lastOpponentByPair[attacker.id]??null,
    });
    if(!defender)continue;
    assignments.push({attackerId:Number(attacker.id),defenderId:Number(defender.id)});
    available.delete(Number(defender.id));
  }
  return assignments;
}

export function rebalanceInitialRoles(pairs){
  if(!Array.isArray(pairs)||pairs.length===0)return [];
  const ordered=[...pairs].sort((a,b)=>Number(a.position)-Number(b.position));
  if(ordered.length===1)return [{...ordered[0],role:null,roleStreak:0}];
  let attacks=0,defenses=0;
  return ordered.map((pair,index)=>{
    let role;
    if(index===0)role='defense';
    else if(index===ordered.length-1)role='attack';
    else if(pair.defenseRequiredUntilReal)role='defense';
    else role=attacks<=defenses?'attack':'defense';
    if(role==='attack')attacks++;else defenses++;
    return {...pair,role,roleStreak:pair.role===role?Math.max(1,Number(pair.roleStreak)||0):1};
  });
}
