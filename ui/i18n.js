(() => {
  const rows = [
    ['Рейды','Raids','Рейди'],['Рейд','Raid','Рейд'],['Автоотметки за рейды','Automatic raid shoutouts','Автовідмітки за рейди'],
    ['Через 20 секунд после рейда, даже если стримера нет в списке. Если другой бот уже сделал Twitch-шотаут, повтор отменяется. Таймауты и лимиты Twitch остаются.','Waits 20 seconds after a raid, including streamers outside your list. An observed Twitch shoutout from another bot cancels the duplicate. Cooldowns and Twitch limits still apply.','Через 20 секунд після рейду, навіть якщо стримера немає у списку. Якщо інший бот уже зробив Twitch-відмітку, повтор скасовується. Таймаути й ліміти Twitch залишаються.'],
    ['Уведомлять о новых версиях','Notify about new versions','Сповіщати про нові версії'],['Доступно обновление','Update available','Доступне оновлення'],
    ['Люди','People','Люди'],['История','History','Історія'],['Настройки','Settings','Налаштування'],['Подключение','Connection','Підключення'],
    ['РАБОЧАЯ ОБЛАСТЬ','WORKSPACE','РОБОЧИЙ ПРОСТІР'],['АВТОШОТАУТЫ','AUTO SHOUTOUTS','АВТОВІДМІТКИ'],['ЖУРНАЛ','ACTIVITY','ЖУРНАЛ'],['ПАРАМЕТРЫ','PREFERENCES','ПАРАМЕТРИ'],
    ['Добавить','Add','Додати'],['Ник или ссылка Twitch','Nickname or Twitch URL','Нік або посилання Twitch'],['Добавить ник','Add nickname','Додати нік'],['Поиск по нику','Search nickname','Пошук за ніком'],
    ['Сначала новые','Newest first','Спочатку нові'],['Сначала старые','Oldest first','Спочатку старі'],['По нику','By nickname','За ніком'],['Сортировка','Sort','Сортування'],
    ['Фильтр по дате добавления','Filter by date added','Фільтр за датою додавання'],['Добавлены с','Added from','Додані з'],['по','to','до'],['Сбросить фильтры','Reset filters','Скинути фільтри'],
    ['Включены','Enabled','Увімкнено'],['На паузе','Paused','На паузі'],['В списке','In list','У списку'],['Список','List','Список'],['Список каналов','Channel list','Список каналів'],
    ['Ничего не найдено','No results','Нічого не знайдено'],['Список пуст','No people yet','Список порожній'],['Готов к отметке','Ready for shoutout','Готовий до відмітки'],['В очереди','Queued','У черзі'],
    ['Очередь','Queue','Черга'],['Нет ожидающих','No pending shoutouts','Немає очікувань'],['Ожидание отправки','Waiting to send','Очікування надсилання'],
    ['Добавлен','Added','Доданий'],['Последняя отметка / попытка','Last shoutout / attempt','Остання відмітка / спроба'],['Следующая доступна','Next available','Наступна доступна'],['После нового сообщения в чате','After a new chat message','Після нового повідомлення в чаті'],['Ещё не отмечали','Not shouted out yet','Ще не відмічали'],
    ['Время','Time','Час'],['Канал','Channel','Канал'],['Результат','Result','Результат'],['Все результаты','All results','Усі результати'],['Отправлены','Sent','Надіслані'],['Ошибки','Errors','Помилки'],['Без подтверждения','Unconfirmed','Без підтвердження'],['Пропущены','Skipped','Пропущені'],['Пока нет событий','No events yet','Поки немає подій'],['Поиск в истории','Search history','Пошук в історії'],
    ['Отправлен','Sent','Надіслано'],['Ошибка','Error','Помилка'],['Нет подтверждения','Unconfirmed','Без підтвердження'],['Пропущен','Skipped','Пропущено'],['Отправляется','Sending','Надсилається'],
    ['Один канал: один активный экземпляр','One channel: one active instance','Один канал: один активний екземпляр'],
    ['Используйте приложение или OBS-плагин. Локальные таймауты между экземплярами не синхронизируются.','Use the app or the OBS plugin. Local cooldowns are not synchronized between instances.','Використовуйте програму або OBS-плагін. Локальні таймаути між екземплярами не синхронізуються.'],
    ['Способ подключения','Connection method','Спосіб підключення'],['Через Streamer.bot','Via Streamer.bot','Через Streamer.bot'],['Самостоятельно','Direct Twitch','Напряму'],['Twitch напрямую','Twitch directly','Twitch напряму'],['Переподключиться','Reconnect','Перепідключитися'],
    ['Настроить Streamer.bot','Set up Streamer.bot','Налаштувати Streamer.bot'],['Выбрать Streamer.bot.exe','Select Streamer.bot.exe','Вибрати Streamer.bot.exe'],['Путь к Streamer.bot.exe','Path to Streamer.bot.exe','Шлях до Streamer.bot.exe'],
    ['Войти через Twitch','Sign in with Twitch','Увійти через Twitch'],['Выйти из Twitch','Sign out of Twitch','Вийти з Twitch'],['Вход не выполнен','Not signed in','Вхід не виконано'],
    ['Повторная отметка','Repeat shoutouts','Повторна відмітка'],['Таймаут для каждого человека','Cooldown per person','Таймаут для кожної людини'],['1 час','1 hour','1 година'],['7 дней','7 days','7 днів'],
    ['Сбрасывать таймауты после долгого закрытия','Reset cooldowns after a long shutdown','Скидати таймаути після тривалого закриття'],
    ['Если приложение было закрыто больше 60 минут, персональные таймауты сбросятся при следующем запуске. История сохранится; нужны новые сообщения в чате.','If the app was closed for more than 60 minutes, personal cooldowns reset on its next launch. History stays; new chat messages are required.','Якщо програму було закрито понад 60 хвилин, особисті таймаути скинуться під час наступного запуску. Історія збережеться; потрібні нові повідомлення в чаті.'],
    ['Сбросить все таймауты','Reset all cooldowns','Скинути всі таймаути'],['Данные','Data','Дані'],['Импорт','Import','Імпорт'],['Экспорт','Export','Експорт'],['Папка данных','Data folder','Папка даних'],
    ['Приложение','Application','Програма'],['Запускать сразу свёрнутой в трей','Start minimized to tray','Запускати згорнутою в трей'],['Проверить обновления','Check for updates','Перевірити оновлення'],['Язык','Language','Мова'],
    ['Свернуть в трей','Minimize to tray','Згорнути в трей'],['Свернуть','Minimize','Згорнути'],['Развернуть','Maximize','Розгорнути'],['Восстановить','Restore','Відновити'],['Закрыть приложение','Quit application','Закрити програму'],
    ['Не подключён','Disconnected','Не підключено'],['Не подключено','Disconnected','Не підключено'],['Не настроен','Not configured','Не налаштовано'],['Не в эфире','Offline','Не в ефірі'],['В эфире','Live','В ефірі'],['Эфир активен','Stream is live','Ефір активний'],['Эфир не идёт','Stream is offline','Ефір не йде'],['Локальная база','Local database','Локальна база'],['Связь установлена','Connected','Зв’язок встановлено'],['Тестовый режим: сеть отключена','Offline test: networking disabled','Тестовий режим: мережу вимкнено'],
    ['Streamer.bot сейчас открыт','Streamer.bot is open','Streamer.bot зараз відкрито'],['Закройте его через Exit в меню значка трея, затем нажмите «Продолжить». Сохранится резервная копия, установится связка, и Streamer.bot запустится снова.','Choose Exit in the Streamer.bot tray menu, then Continue. Setup creates a backup, installs the bridge and starts Streamer.bot again.','Закрийте його через Exit у меню трея, потім натисніть «Продовжити». Буде створено резервну копію, встановлено міст і знову запущено Streamer.bot.'],
    ['Пока бот закрыт, его действия недоступны. OBS и трансляция не затрагиваются.','Bot actions are unavailable while it is closed. OBS and your stream are not changed.','Поки бот закрито, його дії недоступні. OBS та трансляція не змінюються.'],
    ['Отмена','Cancel','Скасувати'],['Продолжить','Continue','Продовжити'],['Готово','Done','Готово'],['Подключиться','Connect','Підключитися'],['Назад','Back','Назад'],['Закрыть настройку','Close setup','Закрити налаштування'],['Приложение Twitch','Twitch application','Застосунок Twitch'],['Вход через Twitch','Twitch sign-in','Вхід через Twitch'],['Ваш канал','Your channel','Ваш канал'],['Проверка подключения','Connection check','Перевірка підключення'],
    ['Разрешите чтение чата и отправку шотаутов в своём канале. Пароль вводится только на сайте Twitch.','Allow reading chat and sending shoutouts in your own channel. Enter your password only on Twitch.','Дозвольте читати чат і надсилати відмітки у своєму каналі. Пароль вводиться лише на сайті Twitch.'],
    ['Код подтверждения','Confirmation code','Код підтвердження'],['Скопировать код','Copy code','Скопіювати код'],['Открыть страницу Twitch','Open Twitch','Відкрити Twitch'],
    ['Для этого канала должен работать только один экземпляр автоотметок: приложение или OBS-плагин.','Run only one auto-shoutout instance for this channel: the app or the OBS plugin.','Для цього каналу має працювати лише один екземпляр автовідміток: програма або OBS-плагін.'],
    ['Проверяем авторизацию и подписку на события чата. Тестовые шотауты не отправляются.','Checking sign-in and chat subscriptions. No test shoutouts are sent.','Перевіряємо вхід і підписку на події чату. Тестові відмітки не надсилаються.'],['Повторить подключение','Retry connection','Повторити підключення'],['Подключаемся к Twitch','Connecting to Twitch','Підключаємося до Twitch'],['Код скопирован','Code copied','Код скопійовано'],['Установлена актуальная версия.','You are up to date.','Встановлено актуальну версію.']
  ];
  const map=new Map(rows.map(row=>[row[0],row]));let language='ru-RU';
  const originals=new WeakMap(),attributes=new WeakMap();
  function translate(value){
    const column=language==='en-US'?1:language==='uk-UA'?2:0;if(!column)return value;
    const trimmed=value.trim(),row=map.get(trimmed);if(row)return value.replace(trimmed,row[column]);
    const patterns=[[/^(\d+) ч (\d+) мин$/,column===1?'$1 h $2 min':'$1 год $2 хв'],[/^(\d+) ч$/,column===1?'$1 h':'$1 год'],[/^(\d+) мин$/,column===1?'$1 min':'$1 хв'],[/^Таймаут (\d+) ч$/,column===1?'Cooldown $1 h':'Таймаут $1 год'],[/^(\d+) записей$/,column===1?'$1 entries':'$1 записів'],[/^ШАГ (\d+) ИЗ (\d+)$/,column===1?'STEP $1 OF $2':'КРОК $1 З $2'],[/^Канал (.+)$/,column===1?'Channel $1':'Канал $1'],[/^Удалить (.+)$/,column===1?'Remove $1':'Видалити $1'],[/^Добавить (.+) в список$/,column===1?'Add $1 to list':'Додати $1 до списку'],[/^Свой канал: (.+)$/,column===1?'Your channel: $1':'Свій канал: $1']];
    for(const [pattern,replacement] of patterns)if(pattern.test(trimmed))return value.replace(trimmed,trimmed.replace(pattern,replacement).replace(/\s+(min|хв)$/,' $1'));
    return value;
  }
  function update(){
    observer.disconnect();
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
    while((node=walk.nextNode())){
      if(['SCRIPT','STYLE'].includes(node.parentElement?.tagName))continue;
      const saved=originals.get(node),source=saved&&node.nodeValue===saved.translated?saved.source:node.nodeValue,translated=translate(source);
      if(node.nodeValue!==translated)node.nodeValue=translated;originals.set(node,{source,translated});
    }
    for(const element of document.querySelectorAll('[title],[placeholder],[aria-label]')){
      const saved=attributes.get(element)||{};
      for(const key of ['title','placeholder','aria-label']){if(!element.hasAttribute(key))continue;const value=element.getAttribute(key),old=saved[key],source=old&&value===old.translated?old.source:value,translated=translate(source);if(value!==translated)element.setAttribute(key,translated);saved[key]={source,translated};}
      attributes.set(element,saved);
    }
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
  }
  const observer=new MutationObserver(update);
  window.deskI18n={setLanguage(value){if(language!==value){language=value;document.documentElement.lang=value;update();}}};update();
})();
