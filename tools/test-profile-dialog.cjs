// Drive the packaged main process with synthetic dialog answers and an offline fixture.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!process.versions.electron){
  const {spawnSync}=require('node:child_process');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'shoutout-dialog-'));
  try{
    const copy=path.join(dir,'previous.sqlite');
    const {Store}=require('../core/store.cjs');
    const s=new Store(copy);
    s.rememberAccount('100','owner');s.add('saved_guest');s.close();
    const asar=path.join(root,'release/ShoutoutDesk/resources/app.asar');
    if(!fs.existsSync(asar))throw Error('Build Shoutout Desk before testing.');
    const env={...process.env,SHOUTOUT_DESK_TEST_DATA:dir,SHOUTOUT_REVIEW_ASAR:asar};
    delete env.ELECTRON_RUN_AS_NODE;
    const run=spawnSync(require('electron'),[__filename,'--smoke-test','--start-tray','--mute-audio','--user-data-dir='+dir],{env,windowsHide:true,encoding:'utf8',timeout:30000});
    assert.equal(run.status,0,run.error?.message||run.stderr||run.stdout);
    assert.match(run.stdout,/confirmed and reopened/);
    assert.equal(require('../core/profile-review.cjs').info(path.join(dir,'shoutouts.sqlite')).people,1);
    console.log('Packaged Electron profile review: expected path, counts, explicit restore, original retained.');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
}else{
  const {app,dialog}=require('electron');
  const dir=process.env.SHOUTOUT_DESK_TEST_DATA,asar=process.env.SHOUTOUT_REVIEW_ASAR;
  assert.ok(asar&&dir&&path.basename(dir).startsWith('shoutout-dialog-'));
  const copy=path.join(dir,'previous.sqlite');let step=0;
  const stop=msg=>{console.error(msg);app.exit(2);};
  dialog.showErrorBox=(_title,msg)=>stop(msg);
  dialog.showMessageBox=async opts=>{
    assert.match(opts.detail,/previous\.sqlite/);assert.match(opts.detail,/1 \/ 0/);
    assert.ok(!fs.existsSync(path.join(dir,'shoutouts.sqlite')));
    const stepLabel=++step===1?'Choose a copy':'Restore selected copy';
    const response=opts.buttons.indexOf(stepLabel);assert.ok(response>=0);
    return {response};
  };
  dialog.showOpenDialog=async()=>({filePaths:[copy],canceled:false});
  app.getLocale=()=>'en-US';
  app.getVersion=()=>require(path.join(asar,'package.json')).version;
  const timeout=setTimeout(()=>stop('Recovery never reached the main window'),15000);
  app.once('browser-window-created',()=>{
    clearTimeout(timeout);
    setImmediate(()=>{
      assert.equal(step,2);assert.ok(fs.existsSync(copy));
      console.log('confirmed and reopened');app.quit();
    });
  });
  require(path.join(asar,'main.cjs'));
}
