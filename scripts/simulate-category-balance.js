import {relegationLossThreshold} from '../src/core.js';

const YEARS=20;
const RUNS=120;
const START_PER_CATEGORY=12;
const GAPS=[0,0.7,1.0];

function rng(seed=1){let x=seed>>>0;return()=>{x=(1664525*x+1013904223)>>>0;return x/2**32;};}
function gaussian(random){let u=0,v=0;while(!u)u=random();while(!v)v=random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function winProbability(a,b){const x=(a-b)/0.8;return 1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));}

function createLeague(seed,skillGap){
  const random=rng(seed),skill=new Map(),cat=new Map(),wins=new Map(),losses=new Map();
  const ladders=Array.from({length:8},()=>[]);
  let id=1;
  for(let c=1;c<=7;c++){
    for(let i=0;i<START_PER_CATEGORY;i++){
      skill.set(id,(8-c)*skillGap+gaussian(random)*0.55);cat.set(id,c);wins.set(id,0);losses.set(id,0);ladders[c].push(id);id++;
    }
    ladders[c].sort((a,b)=>skill.get(b)-skill.get(a));
  }
  return {random,skill,cat,wins,losses,ladders,promotions:0,relegations:0};
}
function move(league,pairId,dir){
  const from=league.cat.get(pairId),to=from+dir;league.ladders[from].splice(league.ladders[from].indexOf(pairId),1);league.cat.set(pairId,to);
  if(dir<0){league.ladders[to].push(pairId);league.promotions++;}
  else{league.ladders[to].splice(league.ladders[to].length?1:0,0,pairId);league.relegations++;}
  league.wins.set(pairId,0);league.losses.set(pairId,0);
}
function play(league,a,b,adaptive){
  const c=league.cat.get(a),ladder=league.ladders[c];
  const winner=league.random()<winProbability(league.skill.get(a),league.skill.get(b))?a:b,loser=winner===a?b:a;
  let wi=ladder.indexOf(winner),li=ladder.indexOf(loser);if(wi>li){[ladder[wi],ladder[li]]=[ladder[li],ladder[wi]];}
  league.wins.set(winner,league.wins.get(winner)+1);league.losses.set(winner,0);league.losses.set(loser,league.losses.get(loser)+1);league.wins.set(loser,0);
  const wc=league.cat.get(winner);if(wc>1&&league.ladders[wc][0]===winner&&league.wins.get(winner)>=3)move(league,winner,-1);
  const lc=league.cat.get(loser);if(lc>=7)return;
  const current=league.ladders[lc].length,lower=league.ladders[lc+1].length;
  const need=adaptive?relegationLossThreshold({categoryNumber:lc,currentActiveCount:current,lowerActiveCount:lower}):3;
  if(league.ladders[lc].at(-1)===loser&&league.losses.get(loser)>=need)move(league,loser,1);
}
function month(league,adaptive){
  const played=new Set(),snapshots=Array.from({length:8},(_,c)=>c? [...league.ladders[c]]:[]);
  for(let c=1;c<=7;c++){
    const ids=snapshots[c].filter(id=>!played.has(id)&&league.cat.get(id)===c);
    for(let i=ids.length-1;i>0;i--){const j=Math.floor(league.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
    for(let i=0;i+1<ids.length;i+=2){const a=ids[i],b=ids[i+1];if(league.cat.get(a)!==c||league.cat.get(b)!==c||played.has(a)||played.has(b))continue;play(league,a,b,adaptive);played.add(a);played.add(b);}
  }
}
function simulate(skillGap,adaptive){
  const sums=Array(7).fill(0);let promotions=0,relegations=0,emptyRuns=0;
  for(let run=0;run<RUNS;run++){
    const league=createLeague(20000+run,skillGap);let empty=false;
    for(let m=0;m<YEARS*12;m++){month(league,adaptive);if(league.ladders.slice(1).some(x=>x.length===0))empty=true;}
    for(let c=1;c<=7;c++)sums[c-1]+=league.ladders[c].length;
    promotions+=league.promotions;relegations+=league.relegations;if(empty)emptyRuns++;
  }
  return {counts:sums.map(x=>x/RUNS),promotions:promotions/RUNS,relegations:relegations/RUNS,emptyRate:emptyRuns/RUNS};
}
function fmt(r){return `cats=[${r.counts.map(x=>x.toFixed(1)).join(', ')}] P=${r.promotions.toFixed(1)} R=${r.relegations.toFixed(1)} empty=${(100*r.emptyRate).toFixed(1)}%`;}
console.log(`LA RED category balance simulation · ${RUNS} runs × ${YEARS} years · ${START_PER_CATEGORY} starting pairs/category`);
for(const gap of GAPS){const base=simulate(gap,false),balanced=simulate(gap,true);console.log(`skillGap=${gap}`);console.log(`  baseline 3-loss: ${fmt(base)}`);console.log(`  adaptive 2/3-loss: ${fmt(balanced)}`);}
