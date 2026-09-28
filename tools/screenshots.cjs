const {_electron:electron}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Store}=require('../core/store.cjs');
const root=path.resolve(__dirname,'..'),fixtures=path.join(root,'.test-data');
fs.mkdirSync(fixtures,{recursive:true});
const languages=[['en-US','Settings'],['uk-UA','Налаштування'],['ru-RU','Настройки']];

async function capture(language,heading){
  const profile=fs.mkdtempSync(path.join(fixtures,'screenshots-'+language+'-'));
  const store=new Store(path.join(profile,'shoutouts.sqlite')),account='999001',now=Date.now();
  store.rememberAccount(account,'demo_channel');store.setMeta('botAccount',{id:account,channel:'demo_channel'});
  store.setPrefs({language,cooldownHours:14,resetAfterLongClose:true});
  for(const login of ['aurora_live','pixel_cook','riverstudio','nightshift','someone_with_a_long_name','cozy_games','art_corner','music_hour'])store.add(login);
  store.observeShoutout(account,'riverstudio',now-3600000);
  store.db.prepare("INSERT INTO attempts(id,account,login,created_at,finished_at,status) VALUES(?,?,?,?,?,'sent')").run('demo-history',account,'returning_guest',now-7200000,now-7200000);
  store.close();
  const env={...process.env,SHOUTOUT_DESK_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
  const output=path.join(root,'docs/screenshots',language);fs.mkdirSync(output,{recursive:true});
  const instance=await electron.launch({args:[root,'--smoke-test'],env,timeout:20000});
  try{
    const page=await instance.firstWindow();
    await page.waitForFunction(text=>document.querySelector('#settings h1').textContent===text,heading);
    await page.waitForFunction(()=>document.querySelectorAll('.person-chip').length===8);
    const state=await page.evaluate(()=>window.desk.command('state'));
    assert.equal(state.dataPath,profile);assert.equal(state.prefs.language,language);assert.equal(state.connected,false);
    const shot=async name=>{
      await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(()=>document.querySelector('main').scrollWidth>document.querySelector('main').clientWidth),false);
      await page.screenshot({path:path.join(output,name+'.png')});
    };
    await shot('people');
    await page.locator('[data-view=history]').click();await shot('history');
    await page.locator('[data-view=settings]').click();await shot('settings');
    await page.locator('#check-update').scrollIntoViewIfNeeded();await shot('settings-data');
    await page.locator('[name=provider][value=bot]').check();
    await page.locator('#bot-settings').waitFor();
    await page.locator('#settings h1').scrollIntoViewIfNeeded();await shot('streamerbot');
    console.log(language+': five localized screenshots captured, networking disabled.');
  }finally{await instance.close();}
}
(async()=>{for(const args of languages)await capture(...args);})().catch(error=>{console.error(error);process.exitCode=1;});
