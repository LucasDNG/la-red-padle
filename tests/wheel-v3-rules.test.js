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
