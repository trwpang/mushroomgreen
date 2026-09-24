import puppeteer from '/Users/tomweaver/.nvm/versions/node/v22.22.1/lib/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
const phase=process.argv[2];
const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']});
try {
for(const [width,height] of [[1440,900],[390,844],[430,932]]) {
 const page=await browser.newPage();
 await page.setViewport({width,height,deviceScaleFactor:width<700?3:1,isMobile:width<700,hasTouch:width<700});
 await page.goto('http://localhost:4331/village?still=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.villageReady==='true',{timeout:180000});
 await new Promise(r=>setTimeout(r,3000));
 const base=`artifacts/village/mobile-controls/${phase}-${width}`;
 await page.screenshot({path:base+'.png'});
 await fs.writeFile(base+'.json',JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('header,header *,footer,footer *, .zoom-controls,.zoom-controls *')].map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {tag:el.tagName,id:el.id,text:el.textContent,rect:[r.x,r.y,r.width,r.height],display:s.display,font:s.font,padding:s.padding,gap:s.gap};})),null,2));
 if(phase==='after'&&width<700){
 await page.click('#mobile-more');await page.screenshot({path:base+'-more.png'});
 await page.keyboard.press('Escape');
 if(!await page.evaluate(()=>document.activeElement.id==='mobile-more'&&document.querySelector('#mobile-more').getAttribute('aria-expanded')==='false'))throw Error('Escape focus failed');
 await page.goto('http://localhost:4331/village?view=forge&inside=main&house=5&still=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.dataset.villageReady==='true',{timeout:180000});
 await new Promise(r=>setTimeout(r,3000));await page.screenshot({path:base+'-interior.png'});
 }
 console.log(phase,width,'captured');await page.close();
}
}finally{await browser.close();}
