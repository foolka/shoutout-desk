const {test}=require('node:test'),assert=require('node:assert/strict');
const {Store}=require('../core/store.cjs'),{exportBundle,importBundle}=require('../core/transfer.cjs');
const {checkUpdate}=require('../core/update.cjs'),{SCOPES}=require('../core/twitch-auth.cjs');
test('public desktop excludes moderator permissions and preferences',()=>{
  assert.deepEqual(SCOPES,['user:read:chat','moderator:manage:shoutouts']);const store=new Store(':memory:');
  assert.throws(()=>store.setPrefs({role:'moderator'}));assert.equal(store.prefs().provider,'direct');
  store.setPrefs({provider:'bot',startInTray:true,resetAfterLongClose:true});assert.equal(store.prefs().startInTray,true);store.close();
});
test('desktop and OBS JSON export keeps account boundary and does not transfer credentials',()=>{
  const a=new Store(':memory:'),b=new Store(':memory:');
  try{a.rememberAccount('123','demo');a.add('person');a.setMeta('privateTest',{token:'do-not-export'});const value=exportBundle(a,'123');
    assert.ok(!JSON.stringify(value).includes('do-not-export'));assert.throws(()=>importBundle(b,value,'other'));assert.equal(b.people('123').length,0);
    importBundle(b,value,'123');importBundle(b,value,'123');assert.equal(b.people('123').length,1);assert.equal(b.prefs().enabled,false);
  }finally{a.close();b.close();}
});
test('desktop updater accepts only its own stable releases and never sends Twitch auth',async()=>{
  const release={tag_name:'v0.4.0',html_url:'https://github.com/foolka/shoutout-desk/releases/tag/v0.4.0'};
  const fetch=async(url,options)=>{assert.equal(url,'https://api.github.com/repos/foolka/shoutout-desk/releases/latest');assert.equal(options.headers.Authorization,undefined);return {ok:true,json:async()=>release};};
  assert.equal((await checkUpdate('0.3.0',fetch)).available,true);
  release.html_url='https://evil.test';await assert.rejects(checkUpdate('0.3.0',fetch));
});
