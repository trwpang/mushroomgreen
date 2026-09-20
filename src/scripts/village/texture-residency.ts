/** Bounded authored-atlas memory. Model textures and render targets are separate. */
export function rgbaMipBytes(width:number,height:number){let bytes=0;while(true){bytes+=width*height*4;if(width===1&&height===1)return bytes;width=Math.max(1,Math.floor(width/2));height=Math.max(1,Math.floor(height/2));}}
type State='idle'|'queued'|'loading'|'ready'|'failed';
export type AtlasSlot<R>={uniform:{value:R};ready:{value:number};state:State;lastUsed:number;retryAt:number;bytes:number;generation:number};
export class TextureResidency<R>{
 readonly entries=new Map<string,AtlasSlot<R>>();
 private pending=0;private reserved=0;private disposed=false;
 constructor(private options:{fallback:R;load:(url:string)=>Promise<R>;release:(r:R)=>void;bytes:(url:string)=>number;now:()=>number;budget:number;concurrency?:number;idleMs?:number;activeMs?:number}){}
 use(url:string){
  let entry=this.entries.get(url);
  if(!entry){entry={uniform:{value:this.options.fallback},ready:{value:0},state:'idle',lastUsed:0,retryAt:0,bytes:this.options.bytes(url),generation:0};this.entries.set(url,entry);}
  entry.lastUsed=this.options.now();
  if(!this.disposed&&(entry.state==='idle'||entry.state==='failed'&&entry.retryAt<=entry.lastUsed)){entry.state='queued';this.pump();}
  return entry;
 }
 private evict(entry:AtlasSlot<R>){if(entry.state!=='ready')return;this.options.release(entry.uniform.value);entry.uniform.value=this.options.fallback;entry.ready.value=0;entry.state='idle';entry.generation++;}
 tick(){if(this.disposed)return;const now=this.options.now();for(const e of this.entries.values()){
  if(now-e.lastUsed>(this.options.idleMs??30000)){this.evict(e);if(e.state==='queued')e.state='idle';}
 }this.pump();}
 private pump(){
  if(this.disposed)return;
  const candidates=[...this.entries].filter(([,e])=>e.state==='queued').sort((a,b)=>b[1].lastUsed-a[1].lastUsed);
  for(const [url,e]of candidates){
   if(this.pending>=(this.options.concurrency??2))break;
   if(e.bytes>this.options.budget){e.state='failed';e.retryAt=Infinity;continue;}
   const unused=[...this.entries.values()].filter(a=>a.state==='ready'&&this.options.now()-a.lastUsed>(this.options.activeMs??2000)).sort((a,b)=>a.lastUsed-b.lastUsed);
   while(this.residentBytes+this.reserved+e.bytes>this.options.budget&&unused.length)this.evict(unused.shift()!);
   if(this.residentBytes+this.reserved+e.bytes>this.options.budget)continue;
   e.state='loading';this.pending++;this.reserved+=e.bytes;const generation=++e.generation;
   Promise.resolve().then(()=>this.options.load(url)).then(resource=>{
    if(this.disposed||e.generation!==generation){this.options.release(resource);return;}
    e.uniform.value=resource;e.ready.value=1;e.state='ready';
   },()=>{if(e.generation===generation){e.state='failed';e.retryAt=this.options.now()+30000;}}).finally(()=>{this.pending--;this.reserved-=e.bytes;this.pump();});
  }
 }
 get residentBytes(){return [...this.entries.values()].reduce((sum,e)=>sum+(e.state==='ready'?e.bytes:0),0);}
 get stats(){return {residentBytes:this.residentBytes,reservedBytes:this.reserved,budgetBytes:this.options.budget,loading:this.pending,ready:[...this.entries.values()].filter(e=>e.state==='ready').length,queued:[...this.entries.values()].filter(e=>e.state==='queued').length,failed:[...this.entries.values()].filter(e=>e.state==='failed').length};}
 dispose(){this.disposed=true;for(const e of this.entries.values()){this.evict(e);e.generation++;e.state='idle';}}
}
