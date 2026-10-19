const {test}=require('node:test'),assert=require('node:assert/strict');
const {Store}=require('../core/store.cjs');
const {Badges}=require('../core/badges/service.cjs');
const id='00000000-0000-4000-8000-000000000001';
function fixture(t){
  let now=1900000000000;
  const store=new Store(':memory:',()=>now);store.rememberAccount('owner','owner');store.add('alice');
  const service=new Badges({store,account:()=> 'owner',now:()=>now,port:0});
  t.after(()=>{service.close();store.close();});
  return {service,store,advance:ms=>now+=ms};
}
test('badges wait for a current viewer; browser previews do not count as OBS',async t=>{
  const {service,advance}=fixture(t);
  await service.test('alice');advance(30000);
  assert.equal(service.frame().event,null);assert.equal(service.queue.length,1);
  service.observe(id,service.build,'Chrome/150');
  const frame=service.frame();assert.equal(frame.event.login,'alice');assert.equal(frame.event.startsAt,frame.now);
  assert.equal(service.info().clients,1);assert.equal(service.info().obsClients,0);
  service.observe(id,service.build,'OBSStudio/32.2.2');
  assert.equal(service.info().obsClients,1);assert.equal(service.playing(),true);
  advance(12001);assert.equal(service.info().obsClients,0);assert.equal(service.playing(),false);
});
test('stale builds cannot consume queued badges; stale events do not replay',async t=>{
  const {service,advance}=fixture(t);
  await service.test('alice');service.observe(id,'0'.repeat(64),'obs-browser');
  assert.equal(service.frame().event,null);assert.equal(service.info().outdated,true);
  advance(121000);service.observe(id,service.build,'obs-browser');
  assert.equal(service.frame().event,null);assert.equal(service.queue.length,0);
});
test('overlay handshake includes build and expires without affecting saved descriptions or URL',async t=>{
  const {service,store,advance}=fixture(t);await service.start();
  const url=service.info().url,config=JSON.stringify(service.config()),token=service.overlayToken;
  const html=await (await fetch(url)).text();assert.ok(html.includes(service.build));assert.ok(!html.includes('SHOUTOUT_BADGE_BUILD'));
  const response=await fetch(service.origin+'/api/view/'+token+'?'+new URLSearchParams({client:id,build:service.build}),{headers:{'User-Agent':'obs-browser/2.26'}});
  assert.equal((await response.json()).build,service.build);assert.equal(service.info().obsClients,1);
  advance(12001);assert.equal(service.info().obsClients,0);
  assert.equal(service.info().url,url);assert.equal(JSON.stringify(service.config()),config);
  assert.equal(store.meta('badges:overlayToken'),token);
});
