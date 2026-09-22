/** Hand-authored working rhythm, informed by the user's IMG_4265.MOV.
 * Three compact blows, followed by a short inspection. Not motion capture.
 */
export const WORK_PERIOD=4.2;
export const WORK_POSES={strike:.736,raised:.552};
const durations=[.92,.86,1.02];
const smooth=(t:number)=>t*t*(3-2*t);
export function workingStroke(time:number){
 const t=((time%WORK_PERIOD)+WORK_PERIOD)%WORK_PERIOD;
 let start=0;
 for(let n=0;n<durations.length;n++){
  const duration=durations[n];
  if(t<start+duration){
   const phase=(t-start)/duration;
   let lift=0,impact=0;
   if(phase<.60)lift=smooth(phase/.60);
   else if(phase<.80){const fall=(phase-.60)/.20;lift=1-fall*fall;}
   else {const bounce=(phase-.80)/.20;lift=.12*Math.sin(bounce*Math.PI)*Math.exp(-bounce*2);impact=bounce*9*Math.exp(1-bounce*9);}
   return {phase,lift:lift*[.88,1,.78][n],impact,inspect:0};
  }
  start+=duration;
 }
 const phase=(t-start)/(WORK_PERIOD-start);
 return {phase,lift:.06*Math.sin(phase*Math.PI)**2,impact:0,inspect:Math.sin(phase*Math.PI)**2};
}
