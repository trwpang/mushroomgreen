// Plans every cottage's rooms off the main thread so streaming rooms never stalls on layout search.
import {planInteriorUncached} from './interior-plans';
import type {Home} from './layout';
self.onmessage=(event:MessageEvent<Home[]>)=>{
 for(const home of event.data)(self as unknown as Worker).postMessage({number:home.number,plan:planInteriorUncached(home)});
};
