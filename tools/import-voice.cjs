const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync,backup}=require('node:sqlite');
const {Store}=require('../core/store.cjs');
const {importVoiceSettings}=require('../core/voice-import.cjs');
(async()=>{
  const [source,database]=process.argv.slice(2);if(!source||!database)throw Error('Usage: node tools/import-voice.cjs VOICE_SETTINGS DESK_DATABASE');
  const settings=JSON.parse(fs.readFileSync(source,'utf8'));
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backupDir=path.join(path.dirname(database),'backups');
  fs.mkdirSync(backupDir,{recursive:true});
  if(fs.existsSync(database)){
    const original=new DatabaseSync(database,{readOnly:true});
    try{await backup(original,path.join(backupDir,`before-voice-import-${stamp}.sqlite`));}finally{original.close();}
  }
  const store=new Store(database);
  try{console.log(JSON.stringify(importVoiceSettings(store,settings)));}finally{store.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
