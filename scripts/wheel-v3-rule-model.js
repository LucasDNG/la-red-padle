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
