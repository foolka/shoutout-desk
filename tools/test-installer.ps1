param([Parameter(Mandatory=$true)][string]$Compiler)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$version=(Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
$payload=Join-Path $root 'release\ShoutoutDesk'
$testRoot=Join-Path $root ('.test-data\installer-'+[Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
& $Compiler '/Qp' "/DAppVersion=$version" "/DPackageDir=$payload" "/DOutputDir=$testRoot" "/DTestRoot=$testRoot" (Join-Path $PSScriptRoot 'installer.iss')
if($LASTEXITCODE -ne 0){throw 'Test compilation failed'}
$setup=Join-Path $testRoot "shoutout-desk-$version-test-setup.exe"
$target=Join-Path $testRoot 'app'
$profile=Join-Path $testRoot 'profile'
New-Item -ItemType Directory -Path $profile | Out-Null
[IO.File]::WriteAllText((Join-Path $profile 'history-sentinel.txt'),'keep-private-data')
$sentinel=Get-FileHash -LiteralPath (Join-Path $profile 'history-sentinel.txt')
function Install-Test([string]$name){
    $p=Start-Process -FilePath $setup -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART','/LANG=en',"/LOG=`"$(Join-Path $testRoot ($name+'.log'))`"") -WindowStyle Hidden -PassThru -Wait
    return $p.ExitCode
}
function Verify-Files {
    foreach($file in Get-ChildItem -LiteralPath $payload -File -Recurse){
        $relative=$file.FullName.Substring($payload.Length+1)
        if($relative -eq 'Portable.cmd'){continue}
        if((Get-FileHash -LiteralPath (Join-Path $target $relative)).Hash -ne (Get-FileHash -LiteralPath $file.FullName).Hash){throw "Mismatch: $relative"}
    }
}
if((Install-Test 'fresh') -ne 0){throw 'Fresh install failed'}
Verify-Files
[IO.File]::WriteAllText((Join-Path $target 'resources\app.asar'),'test-damaged-payload')
if((Install-Test 'repair') -ne 0){throw 'Repair failed'}
Verify-Files
& node (Join-Path $PSScriptRoot 'test-installer-running.cjs') (Join-Path $target 'ShoutoutDesk.exe') $setup $profile
if($LASTEXITCODE -ne 0){throw 'Running-app guard test failed'}
$uninstall=Start-Process -FilePath (Join-Path $target 'unins000.exe') -ArgumentList @('/VERYSILENT','/SUPPRESSMSGBOXES','/NORESTART') -WindowStyle Hidden -PassThru -Wait
if($uninstall.ExitCode -ne 0 -or (Test-Path -LiteralPath (Join-Path $target 'ShoutoutDesk.exe'))){throw 'Uninstall failed'}
if((Get-FileHash -LiteralPath $sentinel.Path).Hash -ne $sentinel.Hash){throw 'Personal data sentinel changed'}
if(-not (Test-Path -LiteralPath (Join-Path $profile 'shoutouts.sqlite'))){throw 'App profile was removed'}
Write-Output "PASS: fresh install, repair, open-app guard, uninstall, data retention. $testRoot"
