const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {Store}=require('../core/store.cjs');
const {prepareProfile}=require('../core/profile.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shoutout-upgrade-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
function rows(db){return Object.fromEntries(['channel_people','attempts','observed_shoutouts','preferences'].map(table=>[table,db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()]));}
test('upgrade from unversioned 0.2.0 preserves people, history, cooldowns and encrypted files including WAL',async t=>{
  const dir=fixture(t),file=path.join(dir,'shoutouts.sqlite'),store=new Store(file);
  try{
    store.db.exec('PRAGMA wal_autocheckpoint=0');store.rememberAccount('owner','owner');store.add('raider');store.add('friend');
    store.setPrefs({cooldownHours:14,startInTray:true});const id=store.enqueue('owner','raider');store.take('owner');store.finish(id,'sent');
    store.observeShoutout('owner','friend',Date.now());const original=rows(store.db);
    for(const name of ['connection.json','twitch-auth.json'])fs.writeFileSync(path.join(dir,name),'{"encrypted":"fixture-only"}');
    assert.ok(fs.existsSync(file+'-wal'));
    const destination=await prepareProfile(dir,'0.2.1');assert.ok(destination.startsWith(path.join(dir,'backups')));
    const copy=new DatabaseSync(path.join(destination,'shoutouts.sqlite'),{readOnly:true});
    try{assert.deepEqual(rows(copy),original);assert.equal(copy.prepare('PRAGMA quick_check').get().quick_check,'ok');}finally{copy.close();}
    assert.deepEqual(rows(store.db),original);
    for(const name of ['connection.json','twitch-auth.json'])assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),fs.readFileSync(path.join(destination,name),'utf8'));
    assert.equal(await prepareProfile(dir,'0.2.1'),null);assert.equal(fs.readdirSync(path.join(dir,'backups')).length,1);
    assert.ok(await prepareProfile(dir,'0.2.2'));assert.equal(fs.readdirSync(path.join(dir,'backups')).length,2);
  }finally{store.close();}
  const reopened=new Store(file);try{assert.equal(reopened.people('owner').length,2);assert.equal(reopened.history('owner')[0].status,'sent');assert.equal(reopened.enqueue('owner','raider'),null);assert.equal(reopened.enqueue('owner','friend'),null);}finally{reopened.close();}
});
test('new installation does not create or replace a database from the distribution',async t=>{
  const dir=fixture(t);assert.equal(await prepareProfile(dir,'0.2.1'),null);assert.ok(!fs.existsSync(path.join(dir,'shoutouts.sqlite')));assert.ok(!fs.existsSync(path.join(dir,'backups')));
});
test('backup failure stops the upgrade and leaves original database and marker untouched',async t=>{
  const dir=fixture(t),file=path.join(dir,'shoutouts.sqlite'),store=new Store(file);store.add('raider');store.close();
  const original=fs.readFileSync(file);fs.writeFileSync(path.join(dir,'backups'),'blocked directory');
  await assert.rejects(prepareProfile(dir,'0.2.1'));assert.deepEqual(fs.readFileSync(file),original);assert.ok(!fs.existsSync(path.join(dir,'profile-version.json')));
});
test('invalid database is never overwritten or accepted as a completed backup',async t=>{
  const dir=fixture(t),file=path.join(dir,'shoutouts.sqlite');fs.writeFileSync(file,'not a database');
  await assert.rejects(prepareProfile(dir,'0.2.1'));assert.equal(fs.readFileSync(file,'utf8'),'not a database');assert.ok(!fs.existsSync(path.join(dir,'profile-version.json')));
});
