import puppeteer from '/Users/tomweaver/.nvm/versions/node/v22.22.1/lib/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';
import fs from 'node:fs/promises';
const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=metal']});
const results=[];
function check(value,label){if(!value)throw Error(label);results.push(label);}
try{
const page=await browser.newPage();await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
await page.goto('http://localhost:4331/village',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.villageReady==='true',{timeout:180000});
check(await page.$eval('header',e=>e.getBoundingClientRect().height<90),'Header under 90px');
check(await page.$eval('.views',e=>getComputedStyle(e).flexWrap==='nowrap'&&e.scrollWidth>e.clientWidth),'Views scroll in one row');
check(await page.$eval('#interior-toolbar',e=>getComputedStyle(e).display==='none'),'Interior toolbar hidden outside');
await page.click('#motion');check(await page.$eval('#motion',e=>e.getAttribute('aria-pressed')==='true'),'Pause works');
await page.click('#sound');check(await page.$eval('#sound',e=>e.getAttribute('aria-pressed')==='false'),'Sound works');
await page.click('#mobile-more');
for(const id of ['labels-toggle','map-toggle','light']){await page.click('#'+id);check(await page.$eval('#'+id,e=>e.getAttribute('aria-pressed')==='true'),id+' works');}
await page.click('#mobile-navigation summary');
check(await page.evaluate(()=>[...document.querySelectorAll('footer button,footer select,footer summary,.views button')].filter(e=>e.getClientRects().length).every(e=>{let r=e.getBoundingClientRect();return r.width>=40&&r.height>=40;})),'Mobile control touch targets at least 40px');
await page.screenshot({path:'artifacts/village/mobile-controls/after-390-navigation.png'});
await page.keyboard.press('Escape');check(await page.evaluate(()=>document.activeElement.id==='mobile-more'&&document.querySelector('#mobile-controls').hidden),'Escape closes and returns focus');
await page.click('#mobile-more');await page.select('#house-select','22');
check(await page.$eval('#house-panel',e=>!e.hidden),'Household select opens reader');
await page.click('#close-house');check(await page.evaluate(()=>document.activeElement.id==='house-select'&&!document.querySelector('#mobile-controls').hidden),'Reader close returns focus to visible select');
await page.click('#notes');check(await page.evaluate(()=>!document.querySelector('#notes-panel').hidden&&document.activeElement.id==='close-notes'),'Notes opens with focus');
await page.click('#close-notes');check(await page.evaluate(()=>document.activeElement.id==='mobile-more'),'Notes close returns focus');
await page.click('#mobile-more');await page.click('#clean-view');check(await page.$eval('#village-app',e=>e.dataset.clean==='true'),'Hide interface works');
await page.click('#restore-interface');check(await page.$eval('#village-app',e=>e.dataset.clean!=='true'),'Restore interface works');
await page.setViewport({width:900,height:900,isMobile:false,hasTouch:false,deviceScaleFactor:1});
check(await page.evaluate(()=>document.querySelector('#house-select').parentElement.tagName==='NAV'&&getComputedStyle(document.querySelector('#mobile-more')).display==='none'&&document.querySelector('.zoom-controls').parentElement.id==='village-app'),'Desktop restores original control locations');
await page.setViewport({width:430,height:932,isMobile:true,hasTouch:true,deviceScaleFactor:3});
await page.goto('http://localhost:4331/village?view=forge',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.villageReady==='true',{timeout:180000});await new Promise(r=>setTimeout(r,3000));
await page.screenshot({path:'artifacts/village/mobile-controls/after-430-forge.png'});
await fs.writeFile('artifacts/village/mobile-controls/checks.json',JSON.stringify(results,null,2));console.log(results.join('\n'));
}finally{await browser.close();}
