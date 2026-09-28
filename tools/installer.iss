#ifndef AppVersion
  #error AppVersion is required
#endif
#ifndef PackageDir
  #error PackageDir is required
#endif
#ifndef OutputDir
  #error OutputDir is required
#endif
[Setup]
#ifdef TestRoot
AppId=ShoutoutDesk.IsolatedInstallerTest
DefaultDirName={#TestRoot}\app
Uninstallable=yes
CreateUninstallRegKey=no
OutputBaseFilename=shoutout-desk-{#AppVersion}-test-setup
#else
AppId={{AFC7E0E6-8D63-42B3-8A41-76C28D90E29B}
DefaultDirName={localappdata}\Programs\Shoutout Desk
OutputBaseFilename=shoutout-desk-{#AppVersion}-windows-x64-setup
#endif
AppName=Shoutout Desk
AppVersion={#AppVersion}
AppPublisher=FermionaPlay
AppPublisherURL=https://github.com/foolka/shoutout-desk
AppSupportURL=https://github.com/foolka/shoutout-desk/issues
AppUpdatesURL=https://github.com/foolka/shoutout-desk/releases/latest
DefaultGroupName=Shoutout Desk
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
DisableDirPage=yes
DisableProgramGroupPage=yes
WizardStyle=modern
WizardSizePercent=110
SetupIconFile={#PackageDir}\resources\app.ico
UninstallDisplayIcon={app}\ShoutoutDesk.exe
OutputDir={#OutputDir}
Compression=lzma2/ultra64
SolidCompression=yes
CloseApplications=no
RestartApplications=no
[Languages]
Name: "en"; MessagesFile: "compiler:Default.isl"
Name: "ru"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "uk"; MessagesFile: "compiler:Languages\Ukrainian.isl"
[CustomMessages]
en.CloseDesk=Close Shoutout Desk using Exit in its tray menu, then try again. No files were changed.
ru.CloseDesk=Закройте Shoutout Desk через «Выход» в меню трея и повторите. Файлы не изменены.
uk.CloseDesk=Закрийте Shoutout Desk через «Вихід» у меню трея та повторіть. Файли не змінено.
en.ProcessCheckFailed=Cannot check running applications. Installation stopped to protect your data.
ru.ProcessCheckFailed=Не удалось проверить запущенные приложения. Установка остановлена для защиты данных.
uk.ProcessCheckFailed=Не вдалося перевірити запущені програми. Встановлення зупинено для захисту даних.
en.DesktopIcon=Create a desktop shortcut
ru.DesktopIcon=Создать ярлык на рабочем столе
uk.DesktopIcon=Створити ярлик на робочому столі
[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; Flags: unchecked
[Files]
Source: "{#PackageDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "Portable.cmd"
[Icons]
#ifndef TestRoot
Name: "{group}\Shoutout Desk"; Filename: "{app}\ShoutoutDesk.exe"
Name: "{autodesktop}\Shoutout Desk"; Filename: "{app}\ShoutoutDesk.exe"; Tasks: desktopicon
#endif
[Code]
function ProcessGuard(): String;
var Locator, Services, Items: Variant;
begin
  Result := '';
  try
    Locator := CreateOleObject('WbemScripting.SWbemLocator');
    Services := Locator.ConnectServer('.', 'root\CIMV2');
    Items := Services.ExecQuery('SELECT ProcessId FROM Win32_Process WHERE Name = ''ShoutoutDesk.exe''');
    if Items.Count > 0 then Result := CustomMessage('CloseDesk');
  except
    Result := CustomMessage('ProcessCheckFailed');
  end;
end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
begin
  Result := ProcessGuard();
end;
function InitializeUninstall(): Boolean;
var Reason: String;
begin
  Reason := ProcessGuard();
  Result := Reason = '';
  if not Result then MsgBox(Reason, mbError, MB_OK);
end;
