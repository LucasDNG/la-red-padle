import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pairKey,
  individualCategoriesAfterDescent,
  categoryForReformedPair,
  shouldResetPairFailures,
  zoneAfterFormation,
  inactivityReturnPosition,
  recordReign,
  fullCalendarMonthsBetween,
  resultAllowedAfterCancellation,
  deadlineFromServerTime,
  formationComplete,
  forcedRoleForPosition,
  roleAfterRealMatch,
  sortByLongestRealWait,
  chooseDefenderForAttacker,
  assignAttackersToDefenders,
  rebalanceInitialRoles,
  entryPositionPenultimate,
  populationMoveImprovesBalance,
  populationDirectionalThreshold,
  delayedResultMovement,
} from '../scripts/wheel-v3-rule-model.js';

test('pair anti-abuse state follows the exact two people regardless of order',()=>{
  assert.equal(pairKey(20,7),'7:20');
  assert.equal(pairKey(7,20),'7:20');
});

test('real descent updates only individual categories that were above the new level',()=>{
  assert.deepEqual(individualCategoriesAfterDescent([2,5],3),[3,5]);
  assert.deepEqual(individualCategoriesAfterDescent([1,2],3),[3,3]);
  assert.deepEqual(individualCategoriesAfterDescent([4,6],5),[5,6]);
});

test('pending descent category overrides later individual-category improvements until resolved',()=>{
  assert.equal(categoryForReformedPair({memberCategories:[2,5],pendingDescentCategory:4}),4);
  assert.equal(categoryForReformedPair({memberCategories:[2,5]}),2);
});

test('automatic cancellation does not clean consecutive failures',()=>{
  assert.equal(shouldResetPairFailures('system_ranking_cancel'),false);
  assert.equal(shouldResetPairFailures('system_category_cancel'),false);
  assert.equal(shouldResetPairFailures('real_match_resolved'),true);
  assert.equal(shouldResetPairFailures('rival_only_failure'),true);
});

test('first match for a zero-PJ edge pair only unlocks a 0/3 zone',()=>{
  assert.deepEqual(
    zoneAfterFormation({category:3,position:1,activeCount:8,realMatchesBefore:0}),
    {zone:'awaiting_first_match',count:0},
  );
  assert.deepEqual(
    zoneAfterFormation({category:3,position:1,activeCount:8,realMatchesBefore:0,firstMatchJustClosed:true}),
    {zone:'promotion',count:0},
  );
  assert.deepEqual(
    zoneAfterFormation({category:4,position:8,activeCount:8,realMatchesBefore:0,firstMatchJustClosed:true}),
    {zone:'relegation',count:0},
  );
  assert.deepEqual(
    zoneAfterFormation({category:7,position:8,activeCount:8,realMatchesBefore:4}),
    {zone:null,count:0},
  );
});

test('inactivity return preserves three months then loses one place per full month',()=>{
  assert.equal(inactivityReturnPosition({originalPosition:5,fullMonths:3,activeCount:12}),5);
  assert.equal(inactivityReturnPosition({originalPosition:5,fullMonths:6,activeCount:12}),8);
  assert.equal(inactivityReturnPosition({originalPosition:1,fullMonths:2,activeCount:12}),2);
  assert.equal(inactivityReturnPosition({originalPosition:1,fullMonths:6,activeCount:12}),5);
  assert.equal(inactivityReturnPosition({originalPosition:8,fullMonths:20,activeCount:9}),10);
});

test('First-place historical record is per reign and can be shared',()=>{
  assert.deepEqual(recordReign({currentDefenses:8,historicalMax:7}),{historicalMax:8,status:'new_record'});
  assert.deepEqual(recordReign({currentDefenses:8,historicalMax:8}),{historicalMax:8,status:'shared_record'});
  assert.deepEqual(recordReign({currentDefenses:3,historicalMax:8}),{historicalMax:8,status:'below_record'});
});


test('inactivity uses complete calendar months instead of fixed 30-day blocks',()=>{
  assert.equal(fullCalendarMonthsBetween('2026-01-31T15:00:00Z','2026-02-28T14:59:59Z'),0);
  assert.equal(fullCalendarMonthsBetween('2026-01-31T15:00:00Z','2026-02-28T15:00:00Z'),1);
  assert.equal(fullCalendarMonthsBetween('2026-01-31T15:00:00Z','2026-04-30T15:00:00Z'),3);
  assert.equal(fullCalendarMonthsBetween('2026-01-31T15:00:00Z','2026-05-31T15:00:00Z'),4);
});

test('late result is admissible only when the match was played before cancellation',()=>{
  assert.equal(resultAllowedAfterCancellation({
    playedAt:'2026-09-20T18:00:00Z',
    cancelledAt:'2026-09-21T18:00:00Z',
  }),true);
  assert.equal(resultAllowedAfterCancellation({
    playedAt:'2026-09-22T18:00:00Z',
    cancelledAt:'2026-09-21T18:00:00Z',
  }),false);
  assert.equal(resultAllowedAfterCancellation({
    playedAt:'2026-09-22T18:00:00Z',
    cancelledAt:null,
  }),true);
});

test('authoritative deadline contracts are absolute durations from server time',()=>{
  assert.equal(
    deadlineFromServerTime('2026-09-28T06:00:00Z',7).toISOString(),
    '2026-10-05T06:00:00.000Z',
  );
  assert.equal(
    deadlineFromServerTime('2026-09-28T06:00:00Z',30).toISOString(),
    '2026-10-28T06:00:00.000Z',
  );
});


test('formation completes only when all seven categories have at least five active pairs',()=>{
  assert.equal(formationComplete([5,5,5,5,5,5,5]),true);
  assert.equal(formationComplete([5,5,4,12,5,8,7]),false);
  assert.throws(()=>formationComplete([5,5,5]));
});

test('ladder extremes force defense for #1 and attack for the bottom',()=>{
  assert.equal(forcedRoleForPosition({position:1,activeCount:8}),'defense');
  assert.equal(forcedRoleForPosition({position:8,activeCount:8}),'attack');
  assert.equal(forcedRoleForPosition({position:4,activeCount:8}),null);
  assert.equal(forcedRoleForPosition({position:1,activeCount:1}),null);
});

test('real match normally flips attacker to defense and defender to attack',()=>{
  assert.deepEqual(
    roleAfterRealMatch({previousRole:'attack',wasAttacker:true,roleStreak:2,position:4,activeCount:8}),
    {role:'defense',roleStreak:1,defenseRequiredUntilReal:false},
  );
  assert.deepEqual(
    roleAfterRealMatch({previousRole:'defense',wasAttacker:false,roleStreak:1,position:4,activeCount:8}),
    {role:'attack',roleStreak:1,defenseRequiredUntilReal:false},
  );
});

test('extreme position overrides the normal post-match role',()=>{
  assert.deepEqual(
    roleAfterRealMatch({previousRole:'attack',wasAttacker:true,roleStreak:1,position:8,activeCount:8,defenseRequiredUntilReal:true}),
    {role:'attack',roleStreak:2,defenseRequiredUntilReal:false},
  );
  assert.deepEqual(
    roleAfterRealMatch({previousRole:'attack',wasAttacker:false,roleStreak:1,position:1,activeCount:8}),
    {role:'defense',roleStreak:1,defenseRequiredUntilReal:false},
  );
});

test('longest real wait is the primary ordering key',()=>{
  const ordered=sortByLongestRealWait([
    {id:3,position:5,realWaitingSince:'2026-09-20T00:00:00Z'},
    {id:2,position:7,realWaitingSince:'2026-09-10T00:00:00Z'},
    {id:1,position:6,realWaitingSince:'2026-09-10T00:00:00Z'},
  ]);
  assert.deepEqual(ordered.map(x=>x.id),[1,2,3]);
});

test('attacker searches only upward and prefers longest-waiting defender inside first 3-position window',()=>{
  const attacker={id:8,position:8,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'};
  const defender=chooseDefenderForAttacker(attacker,[
    {id:7,position:7,role:'defense',active:true,free:true,realWaitingSince:'2026-09-27T00:00:00Z'},
    {id:6,position:6,role:'defense',active:true,free:true,realWaitingSince:'2026-09-16T00:00:00Z'},
    {id:5,position:5,role:'defense',active:true,free:true,realWaitingSince:'2026-09-08T00:00:00Z'},
    {id:9,position:9,role:'defense',active:true,free:true,realWaitingSince:'2026-08-01T00:00:00Z'},
  ]);
  assert.equal(defender.id,5);
});

test('attacker expands the search immediately in blocks of three when needed',()=>{
  const attacker={id:9,position:9,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'};
  const defender=chooseDefenderForAttacker(attacker,[
    {id:8,position:8,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
    {id:7,position:7,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
    {id:6,position:6,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
    {id:5,position:5,role:'defense',active:true,free:true,realWaitingSince:'2026-09-02T00:00:00Z'},
  ]);
  assert.equal(defender.id,5);
});

test('immediate opponent repeat is avoided when a reasonable alternative exists',()=>{
  const attacker={id:8,position:8,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'};
  const defender=chooseDefenderForAttacker(attacker,[
    {id:7,position:7,role:'defense',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
    {id:6,position:6,role:'defense',active:true,free:true,realWaitingSince:'2026-09-10T00:00:00Z'},
  ],{lastOpponentId:7});
  assert.equal(defender.id,6);
});

test('repeat opponent never blocks the wheel if there is no alternative',()=>{
  const attacker={id:8,position:8,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'};
  const defender=chooseDefenderForAttacker(attacker,[
    {id:7,position:7,role:'defense',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
  ],{lastOpponentId:7});
  assert.equal(defender.id,7);
});

test('collision for the same defender is won by the attacker with the longest wait',()=>{
  const assignments=assignAttackersToDefenders([
    {id:10,position:10,role:'attack',active:true,free:true,realWaitingSince:'2026-09-01T00:00:00Z'},
    {id:9,position:9,role:'attack',active:true,free:true,realWaitingSince:'2026-09-05T00:00:00Z'},
    {id:8,position:8,role:'defense',active:true,free:true,realWaitingSince:'2026-09-10T00:00:00Z'},
    {id:6,position:6,role:'defense',active:true,free:true,realWaitingSince:'2026-09-20T00:00:00Z'},
  ]);
  assert.deepEqual(assignments[0],{attackerId:10,defenderId:8});
  assert.deepEqual(assignments[1],{attackerId:9,defenderId:6});
});

test('initial role rebalance keeps extremes forced and roughly balances the middle',()=>{
  const rows=rebalanceInitialRoles([
    {id:1,position:1,role:null,roleStreak:0},
    {id:2,position:2,role:null,roleStreak:0},
    {id:3,position:3,role:null,roleStreak:0},
    {id:4,position:4,role:null,roleStreak:0},
    {id:5,position:5,role:null,roleStreak:0},
    {id:6,position:6,role:null,roleStreak:0},
  ]);
  assert.equal(rows[0].role,'defense');
  assert.equal(rows.at(-1).role,'attack');
  const attack=rows.filter(x=>x.role==='attack').length;
  const defense=rows.filter(x=>x.role==='defense').length;
  assert.ok(Math.abs(attack-defense)<=1);
});

test('one active pair has no effective role',()=>{
  const rows=rebalanceInitialRoles([{id:1,position:1,role:'defense',roleStreak:2}]);
  assert.deepEqual(rows,[{id:1,position:1,role:null,roleStreak:0}]);
});


test('new and promoted pairs enter penultimate, preserving the only leader at N=1',()=>{
  assert.equal(entryPositionPenultimate(0),1);
  assert.equal(entryPositionPenultimate(1),2);
  assert.equal(entryPositionPenultimate(2),2);
  assert.equal(entryPositionPenultimate(10),10);
});

test('population acceleration only applies when the adjacent move improves joint balance',()=>{
  assert.equal(populationMoveImprovesBalance([12,12,12,12,12,12,12],3,4),false);
  assert.equal(populationMoveImprovesBalance([20,12,12,12,12,8,8],0,1),true);
  assert.equal(populationMoveImprovesBalance([8,8,12,12,12,12,20],6,5),true);
});

test('population threshold is 3 in normal balance and can drop to 2 or 1 directionally',()=>{
  assert.equal(populationDirectionalThreshold([12,12,12,12,12,12,12],3,4),3);
  assert.equal(populationDirectionalThreshold([17,12,12,12,12,10,9],0,1),2);
  assert.equal(populationDirectionalThreshold([20,12,12,12,12,8,8],0,1),1);
  assert.equal(populationDirectionalThreshold([8,8,12,12,12,12,20],6,5),1);
});

test('delayed confirmed result never moves the winner downward',()=>{
  assert.deepEqual(
    delayedResultMovement({winnerPosition:8,loserPosition:4}),
    {winnerPosition:4,loserPosition:8,moved:true},
  );
  assert.deepEqual(
    delayedResultMovement({winnerPosition:3,loserPosition:7}),
    {winnerPosition:3,loserPosition:7,moved:false},
  );
});
