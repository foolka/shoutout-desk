const {normalizeLogin}=require('./store.cjs');

function importVoiceSettings(store,settings){
  const channel=normalizeLogin(settings.channel);
  const ids=settings.shoutout_user_ids||settings.twitch_user_ids||{};
  const account=String(ids[channel]||'');
  if(!/^\d+$/.test(account))throw Error('Voice has no cached broadcaster ID. Import needs a confirmed channel ID.');
  const logins=[...new Set(String(settings.shoutout_streamers||'').split(/[,;\s]+/).filter(Boolean).map(normalizeLogin))].filter(login=>login!==channel);
  const history=Object.entries(settings.shoutout_history||{}).map(([name,seconds])=>{
    const login=normalizeLogin(name),stamp=Math.round(Number(seconds)*1000);
    if(!Number.isSafeInteger(stamp)||stamp<=0||stamp>store.now()+60000)throw Error('Invalid legacy shoutout timestamp');
    return {login,stamp};
  });
  const hours=Number(settings.shoutout_cooldown_hours||14);
  if(!Number.isInteger(hours)||hours<1||hours>168)throw Error('Invalid legacy cooldown');
  const marker='voiceImport:'+account,previous=store.meta(marker);
  store.db.exec('BEGIN IMMEDIATE');
  try{
    for(const login of logins)store.add(login,account);
    for(const {login,stamp} of history){
      store.db.prepare("INSERT OR IGNORE INTO attempts(id,account,login,created_at,started_at,finished_at,status,detail) VALUES(?,?,?,?,?,?,'sent',?)")
        .run(`voice:${account}:${login}:${stamp}`,account,login,stamp,stamp,stamp,'Перенесено из Voice');
    }
    if(!previous)store.setMeta('cooldownHours',hours);
    if(!store.lastAccount().id)store.setMeta('lastAccount',{id:account,channel});
    if(!store.meta('botAccount',{}).id)store.setMeta('botAccount',{id:account,channel});
    store.setMeta(marker,{stamp:store.now(),people:logins.length,history:history.length});
    store.db.exec('COMMIT');
  }catch(error){store.db.exec('ROLLBACK');throw error;}
  return {channel,account,people:logins.length,history:history.length,cooldownHours:store.prefs().cooldownHours};
}
module.exports={importVoiceSettings};
