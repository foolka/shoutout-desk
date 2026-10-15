const {chromium,_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Store}=require('../core/store.cjs'),{Badges}=require('../core/badges/service.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/badges');fs.mkdirSync(out,{recursive:true});
const store=new Store(':memory:');store.rememberAccount('123','owner');
for(const login of ['fermionaplay','aurora_live','long_streamer_name_123456','pixel_cook','nightshift'])store.add(login);
const service=new Badges({store,account:()=> '123',port:0,profile:async login=>({displayName:login,avatarUrl:'https://static-cdn.jtvnw.net/fixture.png'})});
let browser,app;
(async()=>{
 await service.start();browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.route('https://static-cdn.jtvnw.net/**',route=>route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(root,'assets/icon.png'))}));
 await page.goto(service.editor('fermionaplay'));await page.locator('#selected-name').filter({hasText:'fermionaplay'}).waitFor();
 assert.equal(await page.locator('#person-enabled').isChecked(),true);assert.equal(await page.locator('#f-radius').isDisabled(),true);
 assert.equal(await page.locator('#f-exitEffect').inputValue(),'fade');assert.equal(await page.locator('#f-exitEffect option').count(),10);
 await page.locator('#description').fill('Игры, готовка и уютные стримы');await page.locator('#person-custom').check();await page.locator('#f-radius').fill('38');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');
 assert.equal(service.rule('fermionaplay').style.radius,38);assert.equal(service.rule('fermionaplay').description,'Игры, готовка и уютные стримы');
 assert.equal(await page.locator('#source-url').inputValue(),service.info().url);assert.equal(await page.locator('#source-size').textContent(),'560 × 560');
 assert.equal(await page.locator('#f-descriptionSize').inputValue(),'27');
 await page.locator('#f-descriptionSize').fill('30');await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');
 assert.equal(service.rule('fermionaplay').style.descriptionSize,20);
 assert.equal(await page.locator('.badge-description').evaluate(el=>getComputedStyle(el).fontSize),'30px');
 for(const [width,height]of [[1280,1000],[760,800],[390,844],[320,640]]){
   await page.setViewportSize({width,height});await page.screenshot({path:path.join(out,`editor-${width}.png`),fullPage:true});
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth>innerWidth,fields:[...document.querySelectorAll('input,select,button,textarea')].filter(el=>el.getBoundingClientRect().width&&el.getBoundingClientRect().right>innerWidth+1).map(el=>el.id)}));assert.deepEqual(overflow,{body:false,fields:[]});
 }
 await page.setViewportSize({width:1280,height:1000});
 for(const effect of service.view().effects){await page.locator('#f-effect').selectOption(effect);await page.locator('#animate').click();await page.waitForTimeout(360);const values=await page.locator('.shoutout-badge').evaluate(el=>({opacity:getComputedStyle(el).opacity,width:el.getBoundingClientRect().width}));assert.ok(Number(values.opacity)>0&&values.width>50,effect);await page.locator('#preview').screenshot({path:path.join(out,'effect-'+effect+'.png')});}
 await page.locator('#f-exitEffect').selectOption('left');await page.locator('#animate-exit').click();
 const exitFrames=await page.locator('.shoutout-badge').evaluate(el=>el.getAnimations()[0].effect.getKeyframes());assert.equal(exitFrames.at(-1).transform,'translateX(-150px)');
 await page.locator('.shoutout-badge').waitFor({state:'hidden'});
 await page.locator('#save').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');
 assert.equal(service.rule('fermionaplay').style.exitEffect,'left');assert.equal(service.rule('fermionaplay').style.effect,'blur');
 await page.reload();await page.locator('#selected-name').filter({hasText:'Общая тема'}).waitFor();await page.locator('.choose').filter({hasText:'fermionaplay'}).click();
 assert.equal(await page.locator('#f-exitEffect').inputValue(),'left');assert.equal(await page.locator('#f-effect').inputValue(),'blur');
 await page.locator('#global-enabled').uncheck();await page.waitForFunction(()=>!document.querySelector('#global-enabled').disabled);assert.equal(service.config().enabled,false);
 const overlay=await browser.newPage({viewport:{width:560,height:560}});overlay.on('pageerror',error=>errors.push(error.message));await overlay.route('https://static-cdn.jtvnw.net/**',route=>route.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(root,'assets/icon.png'))}));await overlay.goto(service.info().url);
 await page.locator('#test-selected').click();await overlay.locator('.shoutout-badge').waitFor({state:'visible'});await overlay.waitForTimeout(1000);await overlay.screenshot({path:path.join(out,'overlay-720.png'),omitBackground:true});
 assert.equal(await overlay.locator('.badge-name').textContent(),'fermionaplay');assert.equal(await overlay.locator('.badge-avatar img').evaluate(img=>img.naturalWidth>0),true);
 await overlay.setViewportSize({width:360,height:120});await overlay.screenshot({path:path.join(out,'overlay-360.png'),omitBackground:true});assert.equal(await overlay.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const stats=store.db.prepare('SELECT count(*) AS n FROM attempts').get();assert.equal(stats.n,0);
 // Long names and maximum controls must still fit inside the source.
 await page.locator('.choose').filter({hasText:'long_streamer_name_123456'}).click();await page.locator('#person-custom').check();await page.locator('#description').fill('Оченьдлинноеописаниебезпробелов'.repeat(4));
 for(const [key,value]of Object.entries({paddingX:48,paddingY:32,borderWidth:12,fontSize:48,descriptionSize:39,avatarSize:120,gap:36}))await page.locator('#f-'+key).fill(String(value));
 const fits=await page.locator('.badge-copy').evaluate(el=>{const card=el.closest('.shoutout-badge'),c=card.getBoundingClientRect(),r=el.getBoundingClientRect();return card.offsetHeight<=492&&r.top>=c.top&&r.bottom<=c.bottom+1;});assert.equal(fits,true);await page.locator('#preview').screenshot({path:path.join(out,'extreme.png')});
 assert.deepEqual(errors,[]);await browser.close();browser=null;
 const profile=fs.mkdtempSync(path.join(out,'desktop-'));const seed=new Store(path.join(profile,'shoutouts.sqlite'));seed.rememberAccount('123','owner');seed.add('fermionaplay');seed.close();
 const env={...process.env,SHOUTOUT_DESK_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
 const exe=process.argv[2]&&path.resolve(process.argv[2]);
 app=await electron.launch({...(exe?{executablePath:exe}:{}),args:exe?['--smoke-test']:[root,'--smoke-test'],env,timeout:30000});const desktop=await app.firstWindow();await desktop.locator('.person-chip').waitFor();
 const newWindow=app.waitForEvent('window');await desktop.locator('#open-badges').click();const editor=await newWindow;await editor.locator('#source-url').waitFor();await editor.waitForFunction(()=>document.querySelector('#source-url').value.startsWith('http://127.0.0.1:'));
 assert.equal(await editor.locator('#f-exitEffect option').count(),10);await editor.locator('#f-exitEffect').selectOption('up');await editor.locator('#save').click();await editor.waitForFunction(()=>document.querySelector('#save-status').textContent==='Сохранено');
 await editor.screenshot({path:path.join(out,'desktop-window.png')});await editor.close();
 await desktop.getByRole('button',{name:'Тест бейджика fermionaplay',exact:true}).click();await desktop.locator('#toast').filter({hasText:'Тестовая плашка'}).waitFor();assert.equal((await desktop.evaluate(()=>window.desk.command('state'))).history.length,0);
 await app.close();app=null;console.log('Badges UI: 4 responsive viewports, 10 entrance effects, independent saved exit, real bitmap avatar, 2 source sizes, controls, queue test and Electron window passed.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();await app?.close();service.close();store.close();});
