import {safeBackgroundErrorLog} from './httpSecurity.js';

export async function runBackgroundTasks({
  maintenanceTask,
  reminderTask,
  outboxTask,
  logError=entry=>console.error(JSON.stringify(entry)),
  production=process.env.NODE_ENV==='production',
}){
  const tasks=[
    ['maintenance',maintenanceTask],
    ['match-reminder',reminderTask],
    ['whatsapp-outbox',outboxTask],
  ].filter(([,task])=>typeof task==='function');
  const result=[];
  for(const [name,task] of tasks){
    try{
      await task();
      result.push({task:name,ok:true});
    }catch(err){
      const entry=safeBackgroundErrorLog(err,name,{production});
      logError(entry);
      result.push({task:name,ok:false});
    }
  }
  return result;
}
