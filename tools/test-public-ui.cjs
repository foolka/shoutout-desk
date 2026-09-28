const {_electron:electron}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Store}=require('../core/store.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');fs.mkdirSync(out,{recursive:true});
const profile=fs.mkdtempSync(path.join(out,'public-ui-')),file=path.join(profile,'shoutouts.sqlite');
const seed=new Store(file),account='999001';seed.rememberAccount(account,'demo_channel');seed.setMeta('botAccount',{id:account,channel:'demo_channel'});
for(const name of ['aurora_live','pixel_cook','riverstudio','nightshift','someone_with_a_long_name','cozy_games','art_corner','music_hour'])seed.add(name);
const now=Date.now();seed.observeShoutout(account,'riverstudio',now-3600000);seed.setPrefs({cooldownHours:14,enabled:false});
seed.db.prepare("INSERT INTO attempts(id,account,login,created_at,finished_at,status) VALUES(?,?,?,?,?,'sent')").run('demo-history',account,'returning_guest',now-7200000,now-7200000);seed.close();
const env={...process.env,SHOUTOUT_DESK_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
const exe=process.argv[2]&&path.resolve(process.argv[2]);
const launch=()=>electron.launch({...(exe?{executablePath:exe}:{}),args:exe?['--smoke-test']:[root,'--smoke-test'],env,timeout:20000});
let instance;
async function close(){if(!instance)return;const current=instance;instance=null;await current.close();}
(async()=>{
  instance=await launch();let page=await instance.firstWindow();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.waitForFunction(()=>document.querySelectorAll('.person-chip').length===8);
  let state=await page.evaluate(()=>window.desk.command('state'));assert.equal(state.prefs.enabled,true);assert.equal(state.dataPath,profile);
  assert.equal(state.people.find(p=>p.login==='riverstudio').lastAt,now-3600000);
  const docs=path.join(out,'screenshots');fs.mkdirSync(docs,{recursive:true});
  await page.screenshot({path:path.join(docs,'people.png')});
  await page.locator('[data-view=history]').click();await page.screenshot({path:path.join(docs,'history.png')});
  await page.locator('.history-add').click();await page.waitForFunction(()=>document.querySelectorAll('.history-add').length===0);
  await page.locator('[data-view=settings]').click();assert.equal(await page.locator('[name=role]').count(),0);
  await page.locator('#toast').waitFor({state:'hidden'});
  await page.locator('#reset-long').check();await page.waitForFunction(async()=>(await window.desk.command('state')).prefs.resetAfterLongClose);
  await page.screenshot({path:path.join(docs,'settings.png')});
  await page.locator('#check-update').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(docs,'settings-data.png')});
  for(const [language,caption] of [['en-US','Settings'],['uk-UA','Налаштування'],['ru-RU','Настройки']]){
    await page.locator('#language').selectOption(language);await page.waitForFunction(text=>document.querySelector('#settings h1').textContent===text,caption);
  }
  await page.locator('#open-wizard').click();await page.locator('[data-step="1"]').waitFor();assert.equal(await page.locator('#client-id').isVisible(),false);
  await page.locator('#wizard-close').click();
  const mock=async values=>instance.evaluate(({dialog},v)=>{
    dialog.showMessageBox=async()=>({response:v.answer});
    dialog.showSaveDialog=async()=>({canceled:false,filePath:v.file});
    dialog.showOpenDialog=async()=>({canceled:false,filePaths:[v.file]});
  },values);
  await mock({answer:0});await page.locator('#reset-cooldowns').click();
  assert.ok((await page.evaluate(()=>window.desk.command('state'))).people.find(p=>p.login==='riverstudio').nextAt>0);
  await mock({answer:1});await page.locator('#reset-cooldowns').click();
  await page.waitForFunction(async()=>(await window.desk.command('state')).people.find(p=>p.login==='riverstudio').nextAt===0);
  const exportFile=path.join(profile,'export.json');await mock({answer:1,file:exportFile});await page.evaluate(()=>window.desk.command('export'));
  const bundle=JSON.parse(fs.readFileSync(exportFile,'utf8'));assert.equal(bundle.people.length,9);assert.equal(bundle.attempts.length,1);assert.ok(!JSON.stringify(bundle).includes('Token'));
  await page.evaluate(()=>window.desk.command('remove','aurora_live'));
  await page.evaluate(()=>window.desk.command('import'));state=await page.evaluate(()=>window.desk.command('state'));
  assert.equal(state.people.length,9);assert.equal(state.history.length,1);assert.equal(state.prefs.enabled,false);
  await page.locator('[name=provider][value=bot]').check();await page.locator('#bot-settings').waitFor();
  await page.screenshot({path:path.join(docs,'streamerbot.png')});
  await page.locator('[name=provider][value=direct]').check();
  await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(760,560));
  for(const view of ['people','history','settings']){
    await page.locator(`[data-view=${view}]`).click();
    assert.equal(await page.evaluate(()=>document.body.scrollWidth>innerWidth||document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth),false);
    await page.screenshot({path:path.join(out,view+'-small.png')});
  }
  await page.locator('#start-tray').check();
  await instance.evaluate(({app,safeStorage})=>{
    const fs=process.getBuiltinModule('fs'),path=process.getBuiltinModule('path');
    const saved={clientId:'test-public-client',user:{id:'999001',login:'demo_channel'},token:{accessToken:'test-not-a-real-token',refreshToken:'test-not-a-real-refresh'}};
    fs.writeFileSync(path.join(app.getPath('userData'),'twitch-auth.json'),JSON.stringify({encrypted:safeStorage.encryptString(JSON.stringify(saved)).toString('base64')}));
  });
  assert.deepEqual(errors,[]);await close();
  instance=await launch();page=await instance.firstWindow();await page.waitForFunction(()=>document.querySelector('#people-count').textContent==='9');
  state=await page.evaluate(()=>window.desk.command('state'));assert.equal(state.direct.user.login,'demo_channel');assert.ok(!JSON.stringify(state).includes('test-not-a-real'));
  assert.equal(state.prefs.enabled,true);assert.equal(state.prefs.resetAfterLongClose,true);assert.equal(state.history.length,1);
  assert.equal(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
  await page.evaluate(()=>window.desk.command('prefs',{startInTray:false}));await close();
  console.log('Public UI passed: mode switch, no moderator, reset confirmation, import/export, narrow layouts, protected login and data across restart, tray. Network disabled.');
})().catch(async error=>{console.error(error);await close().catch(()=>{});process.exitCode=1;});
