import type {Home} from './layout';
export function householdReader(homes:Home[],choose:(home:Home)=>void){
 const panel=document.getElementById('house-panel')!,record=document.getElementById('house-record')!;
 let current:Home|null=null;
 const pick=(number:number)=>{const h=homes.find(h=>h.number===number);if(h)choose(h);};
 record.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-select-house]');if(button)pick(Number(button.dataset.selectHouse));});
 document.getElementById('previous-house')!.onclick=()=>{if(current)pick(current.number===1?59:current.number-1);};
 document.getElementById('next-house')!.onclick=()=>{if(current)pick(current.number===59?1:current.number+1);};
 return {show(home:Home){current=home;const template=document.querySelector<HTMLTemplateElement>(`template[data-house-record="${home.number}"]`);record.replaceChildren(...(template?[template.content.cloneNode(true)]:[]));panel.scrollTop=0;document.getElementById('house-name')!.textContent=home.household_name;document.getElementById('house-description')!.textContent=home.estimated_position?'A home on the family map · position estimated':'A home on the family map · Mushroom Green';document.getElementById('enter-house')!.hidden=false;document.getElementById('enter-house')!.textContent='Go inside';document.getElementById('enter-chainshop')!.hidden=home.number!==22;document.getElementById('visit-yard')!.hidden=home.number!==22;document.querySelector<HTMLElement>('.reader-pages')!.hidden=false;},forge(){current=null;document.getElementById('visit-yard')!.hidden=true;document.getElementById('enter-chainshop')!.hidden=true;document.getElementById('enter-house')!.textContent='Go inside';record.replaceChildren();document.getElementById('enter-house')!.hidden=false;document.querySelector<HTMLElement>('.reader-pages')!.hidden=true;panel.scrollTop=0;}};
}
