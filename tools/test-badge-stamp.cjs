const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {Store}=require('../core/store.cjs');
const {Badges}=require('../core/badges/service.cjs');
const {DEFAULT_STYLE,STAMP_POSITIONS}=require('../core/badges/config.cjs');
const out=path.resolve(__dirname,'../test-output/badge-stamp');fs.mkdirSync(out,{recursive:true});
const store=new Store(':memory:');store.rememberAccount('123','test_channel');store.add('sayrek_liss');store.add('mrdratato');
const saved={enabled:true,style:{...DEFAULT_STYLE,borderColor:'#d5536d',background1:'#39b19f',angle:215,fontSize:42},people:{sayrek_liss:{enabled:true,custom:false,description:'Игры готовка уютный чат и весёлые вечерние стримы',style:DEFAULT_STYLE},mrdratato:{enabled:true,custom:false,description:'Keep the new description',style:DEFAULT_STYLE}}};
store.setMeta('badges:config:123',saved);
const service=new Badges({store,account:()=> '123',port:0,profile:async login=>({displayName:login==='sayrek_liss'?'Sayrek_Liss':'Mrdratato'})});
let browser;
(async()=>{
  await service.start();browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.editor('sayrek_liss'));await page.locator('#description').filter({visible:true}).waitFor();
  assert.equal(await page.locator('#description').inputValue(),saved.people.sayrek_liss.description);
  assert.equal(await page.locator('.badge-stamp span').textContent(),'СТРИМЕР');
  assert.equal(await page.locator('#f-stampEnabled').isDisabled(),true);
  await page.locator('#default-theme').click();
  await page.locator('#f-stampText').fill('АВТОР');await page.locator('#f-stampPosition').selectOption('bottom-left');
  await page.locator('#f-stampAngle').fill('22');await page.locator('#f-stampSize').fill('192');await page.locator('#f-stampFontSize').fill('30');await page.locator('#f-stampColor').fill('#cc3344');
  await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');
  const theme=service.config().style;assert.equal(theme.stampText,'АВТОР');assert.equal(theme.stampAngle,22);assert.equal(theme.stampSize,192);assert.equal(theme.stampFontSize,30);assert.equal(theme.palettes[theme.design].stampColor,'#cc3344');
  assert.deepEqual({...service.config().people},saved.people);
  await page.reload();await page.locator('#f-stampText').waitFor();assert.equal(await page.locator('#f-stampText').inputValue(),'АВТОР');
  await page.locator('#f-stampEnabled').uncheck();assert.equal(await page.locator('.badge-stamp-slot').isVisible(),false);assert.equal(await page.locator('#f-stampText').isDisabled(),true);
  await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');assert.equal(service.config().style.stampEnabled,false);
  for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(out,'editor-'+width+'.png'),fullPage:true});}
  const overlay=await browser.newPage();await overlay.goto(service.info().url);await overlay.waitForFunction(()=>!!window.BadgeView);
  await overlay.evaluate(()=>{window.probe=new BadgeView(document.querySelector('.badge-stage'));window.contentGeometry=()=>[...document.querySelectorAll('.shoutout-badge,.badge-avatar,.badge-copy,.badge-name,.badge-description')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize};});});
  let cases=0;
  for(const [width,height] of [[560,560],[280,280],[720,240]]){
    await overlay.setViewportSize({width,height});
    for(const design of ['air','pass','sticker'])for(const position of STAMP_POSITIONS)for(const angle of [-45,-14,45])for(const size of [80,164,240])for(const extreme of [false,true]){
      const style={...saved.style,design,stampPosition:position,stampAngle:angle,stampSize:size,stampFontSize:extreme?42:24,stampText:extreme?'ЗАСЕКРЕЧЕНО'.repeat(2):'СТРИМЕР',...(extreme?{paddingX:48,paddingY:32,radius:80,borderWidth:12,fontSize:48,descriptionSize:26,avatarSize:120,gap:36}:{})};
      const data={login:'sayrek_liss',name:extreme?'long_streamer_name_123456':'Sayrek_Liss',description:extreme?'longdescriptionwithoutspaces_'.repeat(4):saved.people.sayrek_liss.description,style};
      await overlay.evaluate(data=>window.probe.render(data),{...data,style:{...style,stampEnabled:false}});
      const withoutStamp=await overlay.evaluate(()=>window.contentGeometry());
      await overlay.evaluate(data=>window.probe.render(data),data);
      assert.deepEqual(await overlay.evaluate(()=>window.contentGeometry()),withoutStamp,'Stamp must not change content geometry or typography');
      const result=await overlay.evaluate(()=>{
        const card=document.querySelector('.shoutout-badge'),stamp=document.querySelector('.badge-stamp'),span=stamp.firstChild;
        const c=card.getBoundingClientRect(),s=stamp.getBoundingClientRect();
        const copy=card.querySelector('.badge-copy'),r=copy.getBoundingClientRect();
        return {stampFits:s.left>=0&&s.right<=innerWidth+1&&s.top>=0&&s.bottom<=innerHeight+1,viewportFits:c.left>=0&&c.right<=innerWidth+1&&c.top>=0&&c.bottom<=innerHeight+1,textFits:span.scrollWidth<=span.clientWidth+1,copyFits:r.bottom<=c.bottom+1&&r.top>=c.top-1,dimensions:[c.height,s.width,s.height],mask:getComputedStyle(stamp).maskImage,stampSize:parseFloat(getComputedStyle(stamp).width)};
      });
      assert(result.stampFits&&result.viewportFits&&result.textFits&&result.copyFits,JSON.stringify({width,position,angle,size,extreme,result}));
      assert.equal(result.stampSize,size,'Stamp size must not depend on badge content');
      assert(result.mask.includes('stamp-ink.png'));cases++;
    }
  }
  await overlay.setViewportSize({width:560,height:560});
  await overlay.evaluate(data=>window.probe.render(data),{login:'sayrek_liss',name:'Sayrek_Liss',description:saved.people.sayrek_liss.description,style:saved.style});
  await overlay.screenshot({path:path.join(out,'stamp-preview.png'),omitBackground:true});
  // Markup-like custom text remains literal, never an inserted element.
  await overlay.evaluate(data=>window.probe.render(data),{login:'test',style:{...DEFAULT_STYLE,stampText:'<img src=x onerror=alert(1)>'}});
  assert.equal(await overlay.locator('.badge-stamp img').count(),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({layoutCases:cases,editorViewports:4,saving:true,existingDescriptionsPreserved:true,errors}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();service.close();store.close();});
