const {test}=require('node:test'),assert=require('node:assert/strict');
const {Store}=require('../core/store.cjs');
const {importVoiceSettings}=require('../core/voice-import.cjs');
function fixture(t){const now=1800000000000,store=new Store(':memory:',()=>now);t.after(()=>store.close());return {now,store,settings:{channel:'Owner',shoutout_user_ids:{owner:'123'},shoutout_streamers:'Alice\n@BOB,alice',shoutout_cooldown_hours:14,shoutout_history:{alice:(now-3600000)/1000,retired:(now-1800000)/1000}}};}
test('Voice import merges people and preserves cooldowns and visible history',t=>{
  const {store,settings,now}=fixture(t);store.add('existing','123');store.add('elsewhere','456');const result=importVoiceSettings(store,settings);
  assert.equal(result.people,2);assert.equal(result.history,2);assert.equal(store.people('123').length,3);assert.equal(store.people('456').length,1);
  assert.equal(store.nextAt('123','alice'),now+13*3600000);assert.equal(store.history('123')[0].status,'sent');assert.equal(store.lastAccount().id,'123');assert.equal(store.prefs().cooldownHours,14);
  assert.equal(store.enqueue('123','alice'),null);assert.equal(store.people('123').some(p=>p.login==='retired'),false);
});
test('reimport does not duplicate history, reset newer cooldowns or overwrite later preferences',t=>{
  const {store,settings,now}=fixture(t);importVoiceSettings(store,settings);store.setPrefs({cooldownHours:24});store.observeShoutout('123','alice',now);
  importVoiceSettings(store,settings);assert.equal(store.history('123').length,2);assert.equal(store.prefs().cooldownHours,24);assert.equal(store.last('123','alice'),now);
});
test('invalid import cannot partially modify an existing database',t=>{
  const {store,settings}=fixture(t);settings.shoutout_history.alice='bad';assert.throws(()=>importVoiceSettings(store,settings));assert.equal(store.people('123').length,0);assert.equal(store.prefs().cooldownHours,24);
  settings.shoutout_history={};settings.shoutout_user_ids={};assert.throws(()=>importVoiceSettings(store,settings));assert.equal(store.lastAccount().id,'');
});
