const {_electron:electron}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base=path.join(root,'.test-data');fs.mkdirSync(base,{recursive:true});
const dir=fs.mkdtempSync(path.join(base,'portable-'));
fs.cpSync(path.join(root,'release/ShoutoutDesk'),path.join(dir,'app'),{recursive:true});
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;delete env.SHOUTOUT_DESK_TEST_DATA;
(async()=>{
  for(let run=0;run<2;run++){
    const app=await electron.launch({executablePath:path.join(dir,'app/ShoutoutDesk.exe'),args:['--smoke-test','--portable'],env});
    try{
      const page=await app.firstWindow();await page.locator('#people-empty').waitFor({state:run?'hidden':'visible'});
      let state=await page.evaluate(()=>window.desk.command('state'));assert.equal(state.dataPath,path.join(dir,'app/ShoutoutDesk-data'));
      if(!run)await page.evaluate(()=>window.desk.command('add','portable_friend'));
      else assert.equal(state.people[0].login,'portable_friend');
    }finally{await app.close();}
  }
  assert.ok(!fs.existsSync(path.join(root,'release/ShoutoutDesk/ShoutoutDesk-data')));
  console.log('Portable profile path and restart persistence verified. Normal Windows profile was not opened.');
})().catch(error=>{console.error(error);process.exitCode=1;});
