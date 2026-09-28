import {problem} from './core.js';
import {competitiveEngine} from './competitionRuntime.js';
import * as v2 from './wheel.js';
import * as v3 from './wheelV3Api.js';

async function route(v2fn,v3fn,args){
  const engine=await competitiveEngine();
  return engine==='wheel-v3'?v3fn(...args):v2fn(...args);
}

export const myLeague=(...args)=>route(v2.myLeague,v3.myLeagueV3,args);
export const proposeSchedule=(...args)=>route(v2.proposeSchedule,v3.proposeScheduleV3,args);
export const acceptSchedule=(...args)=>route(v2.acceptSchedule,v3.acceptScheduleV3,args);
export const reportNoShow=(...args)=>route(v2.reportNoShow,v3.reportNoShowV3,args);
export const contestNoShow=(...args)=>route(v2.contestNoShow,v3.contestNoShowV3,args);
export const submitResult=(...args)=>route(v2.submitResult,v3.submitResultV3,args);
export const confirmResult=(...args)=>route(v2.confirmResult,v3.confirmResultV3,args);
export const publicUpcoming=(...args)=>route(v2.publicUpcoming,v3.publicUpcomingV3,args);
export const recentResults=(...args)=>route(v2.recentResults,v3.recentResultsV3,args);
export const ranking=(...args)=>route(v2.ranking,v3.rankingV3,args);
export const records=(...args)=>route(v2.records,v3.recordsV3,args);
export const pairProfile=(...args)=>route(v2.pairProfile,v3.pairProfileV3,args);
export const maintenance=(...args)=>route(v2.maintenance,v3.maintenanceV3,args);

export async function voteExtension(...args){
  const engine=await competitiveEngine();
  if(engine==='wheel-v3')throw problem('Wheel v3 no utiliza extensión extraordinaria',410);
  return v2.voteExtension(...args);
}

export async function cancelNoShow(...args){
  const engine=await competitiveEngine();
  if(engine!=='wheel-v3')throw problem('Acción disponible con Wheel v3',409);
  return v3.cancelNoShowV3(...args);
}

export async function acceptNoShow(...args){
  const engine=await competitiveEngine();
  if(engine!=='wheel-v3')throw problem('Acción disponible con Wheel v3',409);
  return v3.acceptNoShowV3(...args);
}

export async function reportOwnFailure(...args){
  const engine=await competitiveEngine();
  if(engine!=='wheel-v3')throw problem('Acción disponible con Wheel v3',409);
  return v3.reportOwnFailureV3(...args);
}
