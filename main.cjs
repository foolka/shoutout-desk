const {app,BrowserWindow,ipcMain,Tray,Menu,nativeImage,dialog,shell,safeStorage,clipboard,Notification}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const {Store}=require('./core/store.cjs');
const {prepareProfile,backupProfile}=require('./core/profile.cjs');
const {exportBundle,importBundle,readDesktop}=require('./core/transfer.cjs');
const {UpdateMonitor}=require('./core/update-monitor.cjs');
const {ObsSession:AppSession,HEARTBEAT_MS}=require('./core/session.cjs');
const {Bridge}=require('./core/bridge.cjs');
const {Engine}=require('./core/engine.cjs');
const {DirectBridge}=require('./core/twitch-direct.cjs');
const {TwitchAuth,clientId,safeError,publicError}=require('./core/twitch-auth.cjs');
const {runningBots,install,atomicWrite}=require('./core/setup.cjs');
const bundledClient=require('./twitch-client.json').clientId;
const smoke=process.argv.includes('--smoke-test');
const startInTray=process.argv.includes('--start-tray');
const portable=process.argv.includes('--portable')||fs.existsSync(path.join(path.dirname(process.execPath),'portable_mode.txt'));
if(portable)app.setPath('userData',path.join(path.dirname(process.execPath),'ShoutoutDesk-data'));
if(process.env.SHOUTOUT_DESK_TEST_DATA)app.setPath('userData',path.resolve(process.env.SHOUTOUT_DESK_TEST_DATA));
app.setAppUserModelId('com.fermionaplay.shoutoutdesk');
const primaryInstance=app.requestSingleInstanceLock();
if(!primaryInstance)app.quit();
let win,tray,store,session,bridge,engine,auth,updates,connection=null,status='Не подключено',settingUp=false,refreshing=false,shuttingDown=false;
const icon=path.join(__dirname,'assets','icon.ico');
function loadPrivate(name){try{const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),name),'utf8'));return JSON.parse(safeStorage.decryptString(Buffer.from(saved.encrypted,'base64')));}catch{return null;}}
function savePrivate(name,value){
  const file=path.join(app.getPath('userData'),name);
  if(value===null){if(fs.existsSync(file))fs.unlinkSync(file);return;}
  if(!safeStorage.isEncryptionAvailable())throw publicError('Windows не предоставила защищённое хранилище.');
  atomicWrite(file,JSON.stringify({encrypted:safeStorage.encryptString(JSON.stringify(value)).toString('base64')}));
}
function target(){
  const prefs=store.prefs();
  if(prefs.provider==='bot')return store.meta('botAccount',{id:'',channel:''});
  if(!auth.saved)return store.lastAccount();
  return {id:auth.saved.user.id,channel:auth.saved.user.login};
}
function snapshot(){
  const chosen=target(),prefs=store.prefs();
  return {version:app.getVersion(),prefs,people:store.people(chosen.id),history:store.history(chosen.id),account:chosen.channel,
    connected:!!engine?.ready,live:!!engine?.live,status,update:updates?.view(),configured:!!connection,botPath:connection?.exe||'',dataPath:app.getPath('userData'),
    nextGlobal:chosen.id?store.globalNext(chosen.id):0,maximized:win?.isMaximized()||false,
    direct:{...auth.view(),clientId:bundledClient||store.meta('twitchClientId',''),bundled:!!bundledClient}};
}
function sendState(){if(!shuttingDown&&win&&!win.isDestroyed())win.webContents.send('state',snapshot());}
function stopConnection(){engine?.stop();bridge?.removeAllListeners();bridge?.close();engine=null;bridge=null;store?.cancelQueue('Подключение изменено');}
function canChange(){if(engine?.busy)throw publicError('Дождитесь завершения текущего шотаута перед сменой подключения.');}
function connect(){
  stopConnection();const prefs=store.prefs(),chosen=target();
  if(smoke){status='Тестовый режим: сеть отключена';sendState();return;}
  if(prefs.provider==='direct'){
    if(!auth.saved||!chosen.id){status='Войдите через Twitch';sendState();return;}
    bridge=new DirectBridge({auth,target:{id:chosen.id,login:chosen.channel},store});status='Подключение к Twitch';
  }else{
    if(!connection){status='Настройте Streamer.bot';sendState();return;}
    bridge=new Bridge(connection);status='Подключение к Streamer.bot';
  }
  engine=new Engine(store,bridge,sendState);const transport=bridge,current=engine;
  transport.on('status',text=>{status=text;sendState();});transport.on('changed',sendState);
  transport.on('ready',async()=>{
    try{await current.connect();if(current!==engine||shuttingDown)return;if(prefs.provider==='bot')store.setMeta('botAccount',{id:current.account,channel:current.channel});status='Связь установлена';}
    catch(error){if(transport===bridge&&!shuttingDown){status=prefs.provider==='direct'?(error.publicMessage||safeError(error)):error.message;transport.reset(status);}}
    sendState();
  });
  transport.on('offline',reason=>{current.disconnect();status=reason||'Ожидание подключения';sendState();});
  transport.on('event',(type,data)=>{
    if(type==='ChatMessage')current.message(data);
    if(type==='ShoutoutCreated')current.shoutout(data);
    if(type==='Raid')current.raid(data);
    const eventAccount=String(data.broadcaster?.id||data.channelId||'');
    if(data.isTest||data.isFromSharedChatGuest||(eventAccount&&eventAccount!==current.account))return;
    if(type==='StreamOffline'){current.live=false;store.cancelQueue('Канал не в эфире');sendState();}
    if(type==='StreamOnline')void refreshStatus();
  });
  transport.connect();sendState();
}
async function refreshStatus(){
  if(refreshing||!engine?.ready)return;refreshing=true;const current=engine,transport=bridge;
  try{await current.refresh();if(current===engine)status='Связь установлена';}
  catch(error){if(current===engine&&!shuttingDown){current.ready=false;current.live=false;status=store.prefs().provider==='direct'?(error.publicMessage||safeError(error)):error.message;transport.reset(status);}}
  finally{refreshing=false;sendState();}
}
function showWindow(){win.show();if(win.isMinimized())win.restore();win.focus();}
app.on('second-instance',()=>{if(win)showWindow();});
app.whenReady().then(async()=>{
  if(!primaryInstance)return;
  fs.mkdirSync(app.getPath('userData'),{recursive:true});
  await prepareProfile(app.getPath('userData'),app.getVersion());
  store=new Store(path.join(app.getPath('userData'),'shoutouts.sqlite'));connection=loadPrivate('connection.json');
  store.setPrefs({enabled:true});session=new AppSession(store);
  updates=new UpdateMonitor(store,app.getVersion(),release=>{
    sendState();
    if(!release||!store.prefs().autoUpdates||store.meta('notifiedRelease','')===release.version||!Notification.isSupported())return;
    store.setMeta('notifiedRelease',release.version);
    const texts={'ru-RU':['Доступно обновление','Новая версия'],'uk-UA':['Доступне оновлення','Нова версія'],'en-US':['Update available','New version']};
    const text=texts[store.prefs().language]||texts['en-US'];
    const notification=new Notification({title:'Shoutout Desk: '+text[0],body:text[1]+' '+release.version,silent:true});
    notification.on('click',showWindow);notification.show();
  });
  if(!store.meta('botAccount'))store.setMeta('botAccount',store.lastAccount());
  auth=new TwitchAuth({saved:loadPrivate('twitch-auth.json'),save:value=>savePrivate('twitch-auth.json',value),pending:loadPrivate('twitch-login.json'),savePending:value=>savePrivate('twitch-login.json',value)});
  auth.on('authorized',()=>{if(store.prefs().provider==='direct'){store.setPrefs({enabled:true});connect();}});
  auth.on('change',sendState);auth.on('expired',()=>{if(store.prefs().provider==='direct'){stopConnection();status=auth.message;}sendState();});
  win=new BrowserWindow({width:1040,height:740,minWidth:760,minHeight:560,frame:false,show:false,backgroundColor:'#181a1d',icon,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.setMenu(null);win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.loadFile(path.join(__dirname,'ui','index.html'));win.once('ready-to-show',()=>{if(!startInTray&&!store.prefs().startInTray)win.show();});
  win.on('maximize',sendState);win.on('unmaximize',sendState);
  tray=new Tray(nativeImage.createFromPath(icon));tray.setToolTip('Shoutout Desk');
  const updateTray=()=>tray.setContextMenu(Menu.buildFromTemplate([
    {label:'Открыть Shoutout Desk',click:showWindow},
    {label:'Автошотауты',type:'checkbox',checked:store.prefs().enabled,click:item=>{store.setPrefs({enabled:item.checked});if(!item.checked)store.cancelQueue('На паузе');sendState();}},
    {type:'separator'},{label:'Выход',click:()=>app.quit()}
  ]));tray.on('double-click',showWindow);updateTray();
  ipcMain.handle('command',async(event,command,arg)=>{
    if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Invalid sender');
    switch(command){
      case 'state':return snapshot();
      case 'add':store.add(arg,target().id);break;
      case 'remove':store.remove(arg,target().id);break;
      case 'prefs':{
        const reconnect=Object.hasOwn(arg,'provider');if(reconnect)canChange();
        store.setPrefs(arg);if(arg.enabled===false)store.cancelQueue('На паузе');if(reconnect){auth.cancel();connect();}updateTray();break;
      }
      case 'minimize':win.minimize();return;
      case 'maximize':win.isMaximized()?win.unmaximize():win.maximize();return;
      case 'tray':win.hide();return;
      case 'close':app.quit();return;
      case 'folder':await shell.openPath(app.getPath('userData'));return;
      case 'reset-cooldowns':{
        canChange();
        const answer=await dialog.showMessageBox(win,{type:'question',title:'Сбросить таймауты?',message:'Сбросить персональные таймауты всех людей этого канала?',detail:'История сохранится. Шотаут возможен только после нового сообщения. Ограничения Twitch остаются.',buttons:['Отмена','Сбросить'],defaultId:0,cancelId:0,noLink:true});
        if(answer.response===1){canChange();store.resetCooldowns(target().id);}break;
      }
      case 'export':{
        const result=await dialog.showSaveDialog(win,{title:'Экспорт списка и истории',defaultPath:'shoutout-desk-'+new Date().toISOString().slice(0,10)+'.json',filters:[{name:'Shoutout Desk',extensions:['json']}]});
        if(result.canceled)return {cancelled:true};
        if(fs.existsSync(result.filePath))throw Error('Выберите новое имя файла: существующие файлы не перезаписываются.');
        atomicWrite(result.filePath,JSON.stringify(exportBundle(store,target().id),null,2));return {ok:true};
      }
      case 'import':{
        canChange();if(!engine?.ready&&!smoke)throw Error('Сначала дождитесь подключения канала.');
        const account=target().id;
        const result=await dialog.showOpenDialog(win,{title:'Импорт списка и истории',properties:['openFile'],filters:[{name:'Shoutout Desk',extensions:['json','sqlite']}]});
        if(result.canceled)return {cancelled:true};
        const file=result.filePaths[0];if(fs.statSync(file).size>64*1024*1024)throw Error('Файл больше 64 МБ.');
        const value=/\.sqlite$/i.test(file)?readDesktop(file):JSON.parse(fs.readFileSync(file,'utf8'));
        const answer=await dialog.showMessageBox(win,{type:'question',title:'Импорт данных',message:'Объединить список и историю с этим файлом?',detail:'Перед импортом создаётся резервная копия. Автоотметки будут на паузе до включения.',buttons:['Отмена','Импортировать'],defaultId:0,cancelId:0,noLink:true});
        if(answer.response!==1)return {cancelled:true};
        canChange();if(account!==target().id)throw Error('Канал изменился. Повторите импорт.');
        store.setPrefs({enabled:false});store.cancelQueue('Импорт данных');sendState();
        await backupProfile(app.getPath('userData'));const imported=importBundle(store,value,account);updateTray();sendState();return imported;
      }
      case 'update':{
        if(smoke)throw Error('Сеть отключена в тестовом режиме.');
        const result=await updates.refresh(true);
        if(result.available){const answer=await dialog.showMessageBox(win,{type:'info',title:'Обновление',message:'Доступна версия '+result.version,detail:'Закройте приложение перед установкой. База и вход сохранятся.',buttons:['Позже','Открыть выпуск'],defaultId:0,cancelId:0,noLink:true});if(answer.response===1)await shell.openExternal(result.url);}
        return result;
      }
      case 'open-update':if(!smoke&&updates.view())await shell.openExternal(updates.view().url);return;
      case 'reconnect':canChange();connect();return;
      case 'setup-link':{
        const links={console:'https://dev.twitch.tv/console/apps/create',security:'https://www.twitch.tv/settings/security',connections:'https://www.twitch.tv/settings/connections',authorize:auth.pending?.url};
        if(!links[arg])throw Error('Неизвестная ссылка');if(!smoke)await shell.openExternal(links[arg]);return;
      }
      case 'copy-code':if(auth.pending)clipboard.writeText(auth.pending.userCode);return;
      case 'direct-start':{
        if(smoke)throw Error('Сеть отключена в тестовом режиме.');canChange();
        if(!safeStorage.isEncryptionAvailable())throw Error('Защищённое хранилище Windows недоступно.');
        const id=clientId(bundledClient||arg);stopConnection();store.setPrefs({provider:'direct',enabled:false});store.setMeta('twitchClientId',id);
        try{await auth.start(id);if(auth.pending)await shell.openExternal(auth.pending.url);}catch(error){throw Error(error.publicMessage||safeError(error));}return snapshot();
      }
      case 'direct-cancel':auth.cancel();return;
      case 'direct-logout':{
        canChange();const answer=await dialog.showMessageBox(win,{type:'question',title:'Выход из Twitch',message:'Выйти из Twitch? Список и история сохранятся.',buttons:['Отмена','Выйти'],defaultId:0,cancelId:0,noLink:true});
        if(answer.response===1){canChange();stopConnection();auth.logout();status='Войдите через Twitch';sendState();}return;
      }
      case 'direct-select':{
        if(smoke)throw Error('Сеть отключена в тестовом режиме.');canChange();if(!auth.saved)throw Error('Сначала войдите через Twitch.');
        store.setPrefs({provider:'direct'});connect();return snapshot();
      }
      case 'pick-bot':{
        const running=await runningBots();if(running.length===1)return running[0];
        const pick=await dialog.showOpenDialog(win,{title:'Streamer.bot.exe',properties:['openFile'],filters:[{name:'Streamer.bot',extensions:['exe']}]});return pick.canceled?null:pick.filePaths[0];
      }
      case 'setup':{
        if(smoke)throw Error('Установка отключена в режиме тестирования.');canChange();
        if(settingUp)throw Error('Настройка уже выполняется.');settingUp=true;
        try{
          if(!safeStorage.isEncryptionAvailable())throw Error('Защищённое хранилище Windows недоступно.');
          const result=await install(String(arg?.exe||''),fs.readFileSync(path.join(__dirname,'bridge','ShoutoutDesk.cs'),'utf8'),connection?.secret);
          if(result.needsClose)return result;
          savePrivate('connection.json',result.connection);connection=result.connection;store.setPrefs({provider:'bot'});
          const child=spawn(connection.exe,[],{cwd:path.dirname(connection.exe),detached:true,windowsHide:true,stdio:'ignore'});child.on('error',()=>{status='Запустите Streamer.bot';sendState();});child.unref();
          connect();return {ok:true,backup:result.backup};
        }finally{settingUp=false;}
      }
      default:throw Error('Неизвестная команда');
    }
    sendState();return snapshot();
  });
  connect();if(!smoke){auth.resume();updates.start();}setInterval(()=>session.touch(),HEARTBEAT_MS).unref();setInterval(()=>{if(!smoke)void engine?.tick();},1000).unref();setInterval(()=>{if(!smoke)void refreshStatus();},30000).unref();
}).catch(error=>{
  dialog.showErrorBox('Shoutout Desk: запуск отменён','Не удалось безопасно подготовить данные. Не удаляйте папку данных; проверьте свободное место и права доступа.\n\n'+error.message);
  app.exit(1);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(shuttingDown)return;shuttingDown=true;updates?.stop();auth?.dispose();stopConnection();tray?.destroy();session?.close();store?.close();});
