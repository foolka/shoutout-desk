const { _electron:electron }=require('playwright');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {once}=require('node:events');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const [executablePath,gorshokDir,python='python']=process.argv.slice(2);
const output=path.resolve(__dirname,'../test-output');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(output,'shutdown-profile-'));
const env={...process.env,SHOUTOUT_DESK_TEST_DATA:profile};delete env.ELECTRON_RUN_AS_NODE;
let instance;
(async()=>{
  if(!executablePath||!gorshokDir)throw Error('Usage: node test-stack-shutdown.cjs EXE GORSHOK_DIR [PYTHON]');
  instance=await electron.launch({executablePath:path.resolve(executablePath),args:['--smoke-test','--start-tray'],env});
  const child=instance.process();await instance.firstWindow();
  const appPid=await instance.evaluate(()=>process.pid);
  assert.equal(await instance.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isVisible()),false);
  const script=`import sys
sys.path.insert(0, sys.argv[1])
from stream_stack import WindowsProcesses, StreamApp, close_stream_apps
backend = WindowsProcesses()
snapshot = backend.snapshot
pid = int(sys.argv[2])
backend.snapshot = lambda: [entry for entry in snapshot() if entry[0] == pid]
result = close_stream_apps((StreamApp('Shoutout fixture', (sys.argv[3],)),), backend, timeout=5)
assert result['closed'] == ['Shoutout fixture'], result
assert not result['errors'], result
print('Hidden Shoutout Desk exited through the Gorshok WM_CLOSE helper.')`;
  const result=await promisify(execFile)(python,['-B','-c',script,path.resolve(gorshokDir),String(appPid),path.resolve(executablePath)],{windowsHide:true,timeout:15000});
  if(child.exitCode===null)await Promise.race([once(child,'exit'),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('App did not exit')),5000);timer.unref();})]);
  assert.equal(child.exitCode,0);instance=null;console.log(result.stdout.trim());
})().catch(async error=>{console.error(error);if(instance)await instance.close().catch(()=>{});process.exitCode=1;});
