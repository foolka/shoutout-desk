const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync,backup}=require('node:sqlite');
const {atomicWrite}=require('./setup.cjs');

async function prepareProfile(directory,version){
  if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid profile version');
  fs.mkdirSync(directory,{recursive:true});
  const marker=path.join(directory,'profile-version.json');
  let previous=null;
  try{previous=JSON.parse(fs.readFileSync(marker,'utf8')).version;}catch(error){if(error.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;}
  if(previous===version)return null;
  const database=path.join(directory,'shoutouts.sqlite');
  const privateFiles=['connection.json','twitch-auth.json','twitch-login.json'].filter(name=>fs.existsSync(path.join(directory,name)));
  let destination=null;
  if(fs.existsSync(database)||privateFiles.length){
    const backups=path.join(directory,'backups');fs.mkdirSync(backups,{recursive:true});
    destination=fs.mkdtempSync(path.join(backups,`before-${version}-`));
    if(fs.existsSync(database)){
      // SQLite's backup API includes committed WAL data; copying the main file alone does not.
      const source=new DatabaseSync(database,{readOnly:true});
      try{await backup(source,path.join(destination,'shoutouts.sqlite'));}finally{source.close();}
      const copy=new DatabaseSync(path.join(destination,'shoutouts.sqlite'),{readOnly:true});
      try{if(copy.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('Profile backup integrity check failed');}finally{copy.close();}
    }
    for(const name of privateFiles)fs.copyFileSync(path.join(directory,name),path.join(destination,name),fs.constants.COPYFILE_EXCL);
    atomicWrite(path.join(destination,'backup.json'),JSON.stringify({from:previous,to:version,createdAt:new Date().toISOString(),complete:true},null,2));
  }
  atomicWrite(marker,JSON.stringify({version},null,2));
  return destination;
}
async function backupProfile(directory){
  const backups=path.join(directory,'backups');fs.mkdirSync(backups,{recursive:true});
  const destination=fs.mkdtempSync(path.join(backups,'before-import-'));
  const source=new DatabaseSync(path.join(directory,'shoutouts.sqlite'),{readOnly:true});
  try{await backup(source,path.join(destination,'shoutouts.sqlite'));}finally{source.close();}
  for(const name of ['connection.json','twitch-auth.json','twitch-login.json']){
    const file=path.join(directory,name);if(fs.existsSync(file))fs.copyFileSync(file,path.join(destination,name),fs.constants.COPYFILE_EXCL);
  }
  return destination;
}
module.exports={prepareProfile,backupProfile};
