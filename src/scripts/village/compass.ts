import {Quaternion,Vector3} from 'three';
const right=new Vector3();
/** Map north is -Z. Use camera right to avoid instability looking straight down. */
export function northRotation(quaternion:Quaternion):number {
 right.set(1,0,0).applyQuaternion(quaternion);
 return -Math.atan2(right.z,right.x)*180/Math.PI;
}
const directions=['up','upper right','right','lower right','down','lower left','left','upper left'];
export function createCompass(element:HTMLElement){
 let lastAngle=Infinity,lastSector=-1;
 return (quaternion:Quaternion)=>{
  const angle=northRotation(quaternion);
  if(Math.abs(angle-lastAngle)<.05)return;
  element.style.setProperty('--compass-angle',angle.toFixed(2)+'deg');lastAngle=angle;
  const sector=((Math.round(angle/45)%8)+8)%8;
  if(sector!==lastSector){element.setAttribute('aria-label',`Compass. North points ${directions[sector]}.`);lastSector=sector;}
 };
}
