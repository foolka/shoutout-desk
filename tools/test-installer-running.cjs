const {_electron:electron}=require('playwright'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict');
const [exe,setup,profile]=process.argv.slice(2);if(!exe||!setup||!profile)throw Error('Expected isolated EXE, setup and profile paths.');
const env={...process.env,SHOUTOUT_DESK_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
(async()=>{
  const app=await electron.launch({executablePath:exe,args:['--smoke-test'],env});
  try{
    const page=await app.firstWindow();await page.locator('#people-empty').waitFor();
    const result=spawnSync(setup,['/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/LANG=en'],{windowsHide:true,timeout:60000});
    assert.equal(result.status,7,'Installer must refuse the running app');
  }finally{await app.close();}
  console.log('Running application guard verified; isolated app closed normally.');
})().catch(error=>{console.error(error);process.exitCode=1;});
