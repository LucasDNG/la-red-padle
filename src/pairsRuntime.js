import {competitiveEngine} from './competitionRuntime.js';
import * as v2 from './pairs.js';
import * as v3 from './pairsV3Api.js';

async function route(v2fn,v3fn,args){
  const engine=await competitiveEngine();
  return engine==='wheel-v3'?v3fn(...args):v2fn(...args);
}

export const pairHub=(...args)=>route(v2.pairHub,v3.pairHubV3,args);
export const invitePartner=(...args)=>route(v2.invitePartner,v3.invitePartnerV3,args);
export const cancelInvitation=(...args)=>route(v2.cancelInvitation,v3.cancelInvitationV3,args);
export const acceptInvitation=(...args)=>route(v2.acceptInvitation,v3.acceptInvitationV3,args);
export const reactivatePair=(...args)=>route(v2.reactivatePair,v3.reactivatePairV3,args);
export const requestDissolution=(...args)=>route(v2.requestDissolution,v3.requestDissolutionV3,args);

export async function requestPause(userId,afterCurrent=false){
  const engine=await competitiveEngine();
  if(engine==='wheel-v3')return v3.requestPauseV3(userId);
  return v2.requestPause(userId,afterCurrent);
}
