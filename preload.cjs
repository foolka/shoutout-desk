const {contextBridge,ipcRenderer}=require('electron');
const allowed=new Set(['state','add','remove','prefs','minimize','maximize','tray','close','folder','reconnect','pick-bot','setup','setup-link','copy-code','direct-start','direct-cancel','direct-logout','direct-select','reset-cooldowns','export','import','update']);
allowed.add('open-update');
allowed.add('send-logs');allowed.add('copy-report');
contextBridge.exposeInMainWorld('desk',{
  command:(name,arg)=>{if(!allowed.has(name))return Promise.reject(Error('Invalid command'));return ipcRenderer.invoke('command',name,arg);},
  onState:callback=>{const handler=(_event,state)=>callback(state);ipcRenderer.on('state',handler);return()=>ipcRenderer.removeListener('state',handler);}
});
