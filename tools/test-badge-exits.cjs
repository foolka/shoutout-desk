const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DEFAULT_STYLE,EFFECTS}=require('../core/badges/config.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/badge-exits');
fs.mkdirSync(out,{recursive:true});
const data={login:'sayrek_liss',name:'Sayrek_Liss',description:'Preview',style:{...DEFAULT_STYLE,duration:2}};
let browser;
(async()=>{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:720,height:240}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.setContent('<!doctype html><html><body class="overlay"><div id="stage" class="badge-stage"></div></body></html>');
 await page.addStyleTag({path:path.join(root,'core/badges/web/badge.css')});await page.addScriptTag({path:path.join(root,'core/badges/web/render.js')});
 await page.evaluate(()=>{window.view=new BadgeView(document.querySelector('#stage'));});
 for(const exitEffect of EFFECTS){
   const result=await page.evaluate(data=>{
     window.view.play(data,2800);clearTimeout(window.view.hideTimer);window.view.animation.pause();
     return {time:window.view.animation.currentTime,duration:window.view.animation.effect.getTiming().duration,frames:window.view.animation.effect.getKeyframes(),opacity:Number(getComputedStyle(window.view.card).opacity)};
   },{...data,style:{...data.style,effect:'pop',exitEffect}});
   assert.equal(result.time,150,exitEffect+' resumes mid-exit');assert.equal(result.duration,300);assert.equal(result.frames[0].opacity,'1');assert.equal(result.frames.at(-1).opacity,'0');assert.ok(result.opacity>0&&result.opacity<1);
   if(exitEffect==='left')assert.equal(result.frames.at(-1).transform,'translateX(-150px)');
   if(exitEffect==='up')assert.equal(result.frames.at(-1).transform,'translateY(-100px)');
   if(exitEffect==='blur')assert.equal(result.frames.at(-1).filter,'blur(12px)');
   await page.screenshot({path:path.join(out,exitEffect+'.png'),omitBackground:true});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(data=>{window.view.play(data,2750);clearTimeout(window.view.hideTimer);return window.view.animation.effect.getKeyframes();},{...data,style:{...data.style,effect:'flip',exitEffect:'tilt'}});
 assert.ok(reduced.every(frame=>!frame.transform&&!frame.filter));
 await page.emulateMedia({reducedMotion:'no-preference'});
 const legacy={...data,style:{...data.style}};delete legacy.style.exitEffect;
 const fallback=await page.evaluate(data=>{window.view.play(data,2750);clearTimeout(window.view.hideTimer);return window.view.animation.effect.getKeyframes();},legacy);
 assert.ok(fallback.every(frame=>!frame.transform&&!frame.filter));
 // Complete a real entrance, hold and exit rather than only seeking animation frames.
 await page.evaluate(data=>window.view.play(data),{...data,style:{...data.style,effect:'right',exitEffect:'left'}});
 await page.waitForFunction(()=>window.view.animation?.effect.getTiming().duration===300);
 assert.equal(await page.evaluate(()=>window.view.animation.effect.getKeyframes().at(-1).transform),'translateX(-150px)');
 await page.locator('.shoutout-badge').waitFor({state:'hidden'});
 await page.evaluate(data=>{window.view.play(data,2950);},data);assert.equal(await page.locator('.shoutout-badge').isHidden(),true);
 await page.evaluate(data=>{window.view.play(data,2750);window.view.render({...data,name:'Next badge'});},data);
 await page.waitForTimeout(400);assert.equal(await page.locator('.shoutout-badge').isVisible(),true);assert.equal(await page.locator('.badge-name').textContent(),'Next badge');
 assert.deepEqual(errors,[]);console.log('Badge exits: 10 effects, restored exit phase, reduced motion, legacy defaults, full lifecycle and interrupted preview passed.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
