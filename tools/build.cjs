const {packager}=require('@electron/packager');const path=require('node:path');const fs=require('node:fs');
(async()=>{
  const root=path.resolve(__dirname,'..'),out=path.join(root,'release');
  const [built]=await packager({dir:root,name:'ShoutoutDesk',executableName:'ShoutoutDesk',platform:'win32',arch:'x64',
    out,overwrite:true,icon:path.join(root,'assets','icon.ico'),asar:true,prune:true,
    ignore:file=>{const rel=file.replace(/\\/g,'/').replace(/^\//,'');return !!rel&&!['assets','bridge','core','ui','node_modules','main.cjs','preload.cjs','package.json','package-lock.json','twitch-client.json'].includes(rel.split('/')[0]);},
    appVersion:require('../package.json').version,win32metadata:{CompanyName:'FermionaPlay',FileDescription:'Shoutout Desk',ProductName:'Shoutout Desk'}});
  const target=path.join(out,'ShoutoutDesk');
  if(path.dirname(path.resolve(built))!==out || path.dirname(target)!==out)throw Error('Unsafe build path');
  if(fs.existsSync(target))fs.rmSync(target,{recursive:true});
  fs.renameSync(built,target);
  for(const file of ['README.md','README.ru.md','README.uk.md','LICENSE','THIRD_PARTY_NOTICES.md','UPDATE.txt'])fs.copyFileSync(path.join(root,file),path.join(target,file));
  fs.copyFileSync(path.join(root,'tools/Portable.cmd'),path.join(target,'Portable.cmd'));
  fs.copyFileSync(path.join(root,'assets/icon.ico'),path.join(target,'resources/app.ico'));
  fs.cpSync(path.join(root,'docs'),path.join(target,'docs'),{recursive:true});
  console.log(path.join(target,'ShoutoutDesk.exe'));
})().catch(error=>{console.error(error);process.exitCode=1;});
