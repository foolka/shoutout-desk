const {test}=require('node:test');
const assert=require('node:assert/strict');
const {Store}=require('../core/store.cjs');

test('adding a removed person from history preserves timestamps, history and cooldown',t=>{
  const now=1800000000000,store=new Store(':memory:',()=>now);
  t.after(()=>store.close());store.setPrefs({cooldownHours:14});
  store.add('viewer','a');const id=store.enqueue('a','viewer');store.finish(id,'sent','Previous shoutout',now-3600000);
  store.observeShoutout('a','viewer',now-1800000);store.remove('viewer','a');
  const history=store.history('a'),next=store.nextAt('a','viewer');
  store.add('viewer','a');store.add('@VIEWER','a');
  assert.equal(store.people('a').length,1);
  assert.deepEqual(store.history('a'),history);
  assert.equal(store.people('a')[0].added_at,now);
  assert.equal(store.people('a')[0].nextAt,next);
  assert.equal(store.enqueue('a','viewer'),null);
  assert.equal(store.people('b').length,0);
});

test('adding a history-only person does not create a new shoutout or change another channel',t=>{
  const now=1800000000000,store=new Store(':memory:',()=>now);
  t.after(()=>store.close());store.observeShoutout('a','visitor',now-1000);
  store.add('visitor','b');const other=store.people('b');
  store.add('visitor','a');
  assert.equal(store.history('a').length,0);
  assert.equal(store.people('a')[0].lastAt,now-1000);
  assert.deepEqual(store.people('b'),other);
});
