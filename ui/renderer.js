const $=id=>document.getElementById(id);
let state=null,selected='',toastTimer,setupBusy=false,wizardStep=0,wizardBusy=false;
const historyAdds=new Set();
const labels={sent:'Отправлен',failed:'Ошибка',uncertain:'Нет подтверждения',cancelled:'Пропущен',queued:'В очереди',sending:'Отправляется'};
const icons=()=>lucide.createIcons();
const stamp=value=>value==null?'Ещё не отмечали':new Date(value).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
const remaining=value=>{const mins=Math.ceil(Math.max(0,value-Date.now())/60000);return mins>=60?`${Math.floor(mins/60)} ч ${mins%60} мин`:`${mins} мин`;};
function toast(text,error=false){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.toggle('error',error);$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,6000);}
async function cmd(name,arg){try{return await window.desk.command(name,arg);}catch(error){toast(error.message.replace(/^Error invoking remote method '[^']+': Error: /,''),true);throw error;}}
function node(tag,text,className){const el=document.createElement(tag);if(text!=null)el.textContent=text;if(className)el.className=className;return el;}
function icon(name){const el=document.createElement('i');el.dataset.lucide=name;return el;}
function decorateSelects(){
  for(const select of document.querySelectorAll('select')){
    const wrap=node('span',null,'select-wrap');select.before(wrap);wrap.append(select,icon('chevron-down'));
  }
}
function view(name){document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===name));document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===name));}
function renderPeople(){
  if(!state)return;
  const search=$('search').value.toLowerCase().trim(),from=$('date-from').value,to=$('date-to').value;
  const dateKey=v=>{const d=new Date(v);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const people=state.people.filter(p=>p.login.includes(search)&&(!from||dateKey(p.added_at)>=from)&&(!to||dateKey(p.added_at)<=to));
  const sort=$('sort').value;people.sort((a,b)=>sort==='name'?a.login.localeCompare(b.login):sort==='oldest'?a.added_at-b.added_at:b.added_at-a.added_at);
  $('people-list').replaceChildren();
  for(const person of people){
    const chip=node('div',null,'person-chip'+(selected===person.login?' selected':''));
    const main=node('button',null,'chip-main');main.type='button';main.setAttribute('aria-pressed',String(selected===person.login));main.setAttribute('aria-label',`Канал ${person.login}`);
    const wait=person.nextAt>Date.now();main.append(node('span',null,'status-dot '+(person.queued?'wait':wait?'':'online')));
    const info=node('span',null,'chip-info');info.append(node('strong',person.login),node('small',person.queued?'В очереди':wait?remaining(person.nextAt):'Готов к отметке'));main.append(info);
    main.onclick=()=>{selected=selected===person.login?'':person.login;renderPeople();};
    const del=node('button',null,'chip-delete');del.title=`Удалить ${person.login}`;del.setAttribute('aria-label',del.title);del.append(icon('x'));del.onclick=()=>void cmd('remove',person.login).catch(()=>{});
    chip.append(main,del);$('people-list').append(chip);
  }
  $('people-empty').hidden=people.length>0;$('people-empty').querySelector('h2').textContent=state.people.length?'Ничего не найдено':'Список пуст';
  $('people-count').textContent=String(state.people.length);$('nav-count').textContent=String(state.people.length);
  $('list-caption').textContent=people.length===state.people.length?'В списке':`Показано ${people.length} из ${state.people.length}`;
  $('cooldown-badge').textContent=`Таймаут ${state.prefs.cooldownHours} ч`;
  const person=state.people.find(p=>p.login===selected);$('person-detail').hidden=!person;$('person-detail').replaceChildren();
  if(person){for(const [label,value] of [['Добавлен',stamp(person.added_at)],['Последняя отметка / попытка',stamp(person.lastAt)],['Следующая доступна',person.nextAt>Date.now()?stamp(person.nextAt):'После нового сообщения в чате']]){const cell=node('div');cell.append(node('span',label),node('strong',value));$('person-detail').append(cell);}}
  const queue=state.history.filter(r=>['queued','sending'].includes(r.status)).sort((a,b)=>a.created_at-b.created_at);
  $('queue-count').textContent=String(queue.length);$('queue-status').textContent=queue.length?(state.nextGlobal>Date.now()?`Следующая через ${remaining(state.nextGlobal)}`:'Ожидание отправки'):'Нет ожидающих';
  $('queue-list').replaceChildren();for(const item of queue){const row=node('div',null,'queue-item');row.append(node('strong',item.login),node('span',labels[item.status]));$('queue-list').append(row);}
  icons();
}
function renderHistory(){
  if(!state)return;const search=$('history-search').value.trim().toLowerCase(),filter=$('history-status').value;
  const rows=state.history.filter(r=>r.login.includes(search)&&(!filter||r.status===filter));
  const active=new Set(state.people.map(person=>person.login.toLowerCase()));
  $('history-rows').replaceChildren();
  for(const row of rows){
    const tr=node('tr');tr.dataset.login=row.login;
    tr.append(node('td',stamp(row.finished_at||row.created_at)),node('td',row.login));
    const result=node('td',labels[row.status]||row.status,'result-'+row.status);
    if(row.trigger==='raid')result.append(node('small','Рейд'));
    if(row.detail)result.append(node('small',row.detail));
    const action=node('td',null,'history-action');
    if(!active.has(row.login.toLowerCase())){
      const add=node('button',null,'history-add');add.type='button';add.disabled=historyAdds.has(row.login);
      add.setAttribute('aria-label',`Добавить ${row.login} в список`);add.title=add.getAttribute('aria-label');
      add.append(icon('plus'),node('span','Добавить'));
      add.onclick=async()=>{
        if(historyAdds.has(row.login))return;
        historyAdds.add(row.login);renderHistory();
        try{render(await cmd('add',row.login));toast(`${row.login} добавлен в список`);}
        catch{}finally{historyAdds.delete(row.login);renderHistory();}
      };
      action.append(add);
    }else action.append(node('span','В списке','history-in-list'));
    tr.append(result,action);$('history-rows').append(tr);
  }
  $('history-empty').hidden=rows.length>0;$('history-count').textContent=`${rows.length} записей`;
  icons();
}
function render(next){
  state=next;$('enabled').checked=state.prefs.enabled;$('enabled-label').textContent=state.prefs.enabled?'Включены':'На паузе';
  $('start-tray').checked=state.prefs.startInTray;
  $('reset-long').checked=state.prefs.resetAfterLongClose;
  $('raid-shoutouts').checked=!!state.prefs.raidShoutouts;
  $('auto-updates').checked=state.prefs.autoUpdates!==false;
  $('update-banner').hidden=!state.update?.available;
  $('update-version').textContent=state.update?.version||'';
  $('language').value=state.prefs.language;window.deskI18n.setLanguage(state.prefs.language);
  $('app-version').textContent='Shoutout Desk '+state.version;document.querySelector('.version').textContent=state.version;
  if(document.activeElement!==$('cooldown'))$('cooldown').value=state.prefs.cooldownHours;
  $('cooldown-output').textContent=`${$('cooldown').value} ч`;
  $('account-label').textContent=state.account||'Twitch';$('account-state').textContent=state.connected?(state.live?'В эфире':'Не в эфире'):'Не подключён';
  $('account-dot').className='status-dot'+(state.connected?' online':'');$('connection-dot').className='status-dot'+(state.connected?' online':'');
  $('footer-status').textContent=state.status;$('footer-right').textContent=state.connected?(state.live?'Эфир активен':'Эфир не идёт'):'Локальная база';
  $('connection-status').textContent=state.status;if(!setupBusy&&!$('bot-path').value)$('bot-path').value=state.botPath;
  const direct=state.prefs.provider==='direct';
  document.querySelectorAll('[name="provider"]').forEach(el=>el.checked=el.value===state.prefs.provider);
  $('provider-title').textContent=direct?'Twitch напрямую':'Streamer.bot';$('bot-settings').hidden=direct;$('direct-settings').hidden=!direct;
  $('direct-identity').textContent=state.direct.user?`Аккаунт: ${state.direct.user.login}${state.account?' · Канал: '+state.account:''}`:'Вход не выполнен';
  $('logout').hidden=!state.direct.user;
  $('maximize').title=state.maximized?'Восстановить':'Развернуть';$('maximize').setAttribute('aria-label',$('maximize').title);
  renderPeople();renderHistory();renderWizard();
}
function renderWizard(){
  if(!state||!$('direct-wizard').open)return;
  const titles=['Приложение Twitch','Вход через Twitch','Ваш канал','Проверка подключения'];
  $('wizard-title').textContent=titles[wizardStep];
  $('wizard-progress').textContent=`ШАГ ${wizardStep+(state.direct.bundled?0:1)} ИЗ ${state.direct.bundled?3:4}`;
  document.querySelectorAll('[data-step]').forEach(el=>el.hidden=Number(el.dataset.step)!==wizardStep);
  $('wizard-back').hidden=wizardStep<=(state.direct.bundled?1:0);$('wizard-back').disabled=wizardBusy;
  $('wizard-next').textContent=wizardStep===3?'Готово':wizardStep===2?'Подключиться':'Продолжить';
  $('wizard-next').disabled=wizardBusy||(wizardStep===1&&(!state.direct.user||!!state.direct.pending))||(wizardStep===3&&!state.connected);
  $('oauth-start').disabled=wizardBusy||!!state.direct.pending;
  $('oauth-start').hidden=!!state.direct.pending;
  $('device-login').hidden=!state.direct.pending;$('device-code').textContent=state.direct.pending?.code||'';
  $('oauth-status').textContent=state.direct.message;$('oauth-user').hidden=!state.direct.user;
  $('oauth-user').textContent=state.direct.user?`Выполнен вход: ${state.direct.user.login}`:'';
  $('own-channel').textContent=`Свой канал: ${state.direct.user?.login||''}`;
  $('check-channel').textContent=`Канал: ${state.account||'не выбран'}`;$('check-status').textContent=state.status;
  $('check-dot').className='status-dot'+(state.connected?' online':'');
  $('wizard-reconnect').disabled=wizardBusy;
}
async function wizardAction(action){
  if(wizardBusy)return;wizardBusy=true;$('wizard-error').hidden=true;renderWizard();
  try{await action();}catch(error){$('wizard-error').textContent=error.message.replace(/^Error invoking remote method '[^']+': Error: /,'');$('wizard-error').hidden=false;}
  finally{wizardBusy=false;renderWizard();}
}
function openWizard(){
  $('client-id').value=state.direct.clientId;wizardStep=state.direct.user?2:state.direct.clientId?1:0;
  $('wizard-error').hidden=true;$('direct-wizard').showModal();renderWizard();
}
function closeWizard(){if(wizardBusy)return;$('direct-wizard').close();void cmd('direct-cancel').catch(()=>{});}
async function setup(){
  if(setupBusy)return;
  let exe=$('bot-path').value;
  if(!exe){exe=await cmd('pick-bot');if(!exe)return;$('bot-path').value=exe;}
  setupBusy=true;$('setup').disabled=true;
  try{const result=await cmd('setup',{exe});if(result.needsClose)$('restart-dialog').showModal();else toast('Связка установлена. Подключаемся к Streamer.bot.');}
  finally{setupBusy=false;$('setup').disabled=false;}
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
document.querySelectorAll('[data-window]').forEach(b=>b.onclick=()=>void cmd(b.dataset.window).catch(()=>{}));
$('add-form').onsubmit=async e=>{e.preventDefault();try{await cmd('add',$('new-login').value);$('new-login').value='';$('new-login').focus();}catch{}};
for(const id of ['search','sort','date-from','date-to'])$(id).addEventListener('input',renderPeople);
$('filter-toggle').onclick=()=>{$('date-filters').hidden=!$('date-filters').hidden;$('filter-toggle').setAttribute('aria-expanded',String(!$('date-filters').hidden));};
$('reset-filters').onclick=()=>{$('date-from').value='';$('date-to').value='';$('search').value='';renderPeople();};
$('history-search').oninput=renderHistory;$('history-status').onchange=renderHistory;
$('enabled').onchange=()=>void cmd('prefs',{enabled:$('enabled').checked}).catch(()=>{});
$('start-tray').onchange=()=>void cmd('prefs',{startInTray:$('start-tray').checked}).catch(()=>{});
$('reset-long').onchange=()=>void cmd('prefs',{resetAfterLongClose:$('reset-long').checked}).catch(()=>{});
$('raid-shoutouts').onchange=()=>void cmd('prefs',{raidShoutouts:$('raid-shoutouts').checked}).catch(()=>{});
$('auto-updates').onchange=()=>void cmd('prefs',{autoUpdates:$('auto-updates').checked}).catch(()=>{});
$('update-banner').onclick=()=>void cmd('open-update').catch(()=>{});
$('language').onchange=()=>void cmd('prefs',{language:$('language').value}).catch(()=>{});
$('reset-cooldowns').onclick=()=>void cmd('reset-cooldowns').catch(()=>{});
$('export-data').onclick=()=>void cmd('export').then(r=>{if(!r.cancelled)toast('Экспорт сохранён. Токенов в файле нет.');}).catch(()=>{});
$('import-data').onclick=()=>void cmd('import').then(r=>{if(!r.cancelled)toast(`Импортировано: ${r.people} человек, ${r.history} записей. Автоотметки на паузе.`);}).catch(()=>{});
$('check-update').onclick=async()=>{const button=$('check-update');button.disabled=true;try{const r=await cmd('update');if(!r.available)toast('Установлена актуальная версия.');}catch{}finally{button.disabled=false;}};
$('cooldown').oninput=()=>$('cooldown-output').textContent=`${$('cooldown').value} ч`;
$('cooldown').onchange=()=>void cmd('prefs',{cooldownHours:Number($('cooldown').value)}).catch(()=>{});
$('reconnect').onclick=()=>void cmd('reconnect').catch(()=>{});
$('open-folder').onclick=()=>void cmd('folder').catch(()=>{});
$('choose-bot').onclick=async()=>{try{const exe=await cmd('pick-bot');if(exe)$('bot-path').value=exe;}catch{}};
$('setup').onclick=()=>void setup().catch(()=>{});
$('cancel-setup').onclick=()=>$('restart-dialog').close();
$('confirm-setup').onclick=()=>{$('restart-dialog').close();void setup().catch(()=>{});};
document.querySelectorAll('[name="provider"]').forEach(el=>el.onchange=()=>void cmd('prefs',{provider:el.value}).catch(()=>render(state)));
document.querySelectorAll('[data-link]').forEach(el=>el.onclick=()=>void wizardAction(()=>cmd('setup-link',el.dataset.link)));
$('open-wizard').onclick=openWizard;$('wizard-close').onclick=closeWizard;
$('direct-wizard').addEventListener('cancel',event=>{event.preventDefault();closeWizard();});
$('logout').onclick=()=>void cmd('direct-logout').catch(()=>{});
$('copy-device').onclick=()=>void wizardAction(async()=>{await cmd('copy-code');toast('Код скопирован');});
$('oauth-start').onclick=()=>void wizardAction(()=>cmd('direct-start',$('client-id').value));
$('wizard-back').onclick=()=>void wizardAction(async()=>{if(wizardStep===1)await cmd('direct-cancel');wizardStep--;});
$('wizard-reconnect').onclick=()=>void wizardAction(()=>cmd('reconnect'));
$('wizard-next').onclick=()=>void wizardAction(async()=>{
  if(wizardStep===0){if(!/^[a-z0-9]{20,64}$/i.test($('client-id').value.trim()))throw Error('Вставьте Client ID. Client Secret не нужен.');wizardStep=1;}
  else if(wizardStep===1){wizardStep=2;}
  else if(wizardStep===2){await cmd('direct-select');wizardStep=3;}
  else $('direct-wizard').close();
});
decorateSelects();window.desk.onState(render);void cmd('state').then(render).catch(()=>{});setInterval(renderPeople,30000);icons();
