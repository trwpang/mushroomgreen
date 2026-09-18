/** Keep each view bookmarkable without leaving the WebGL scene. */
export function rememberPlace(values:Record<string,string|number|null>){
 const url=new URL(location.href);
 for(const [key,value]of Object.entries(values)){if(value===null)url.searchParams.delete(key);else url.searchParams.set(key,String(value));}
 history.replaceState(null,'',url);
}
