<#
App Sandbox のゲスト (VM sts2-dev) の中で、Slay the Spire 2 の mod をビルドして入れ、ゲームを起動する。
tools/sts2-mcp がゲストのリポジトリを指定のコミットにしてから SSH で呼ぶ。

  powershell -NoProfile -ExecutionPolicy Bypass -File dev-loop.ps1 -BridgeBasePort P -JoinClientIdBase B [-Mods A,B] [-Instances N] [-NoLaunch] [-SkipBuild]

- AgentBridge は指定が無くても常にビルドして入れる。エージェントはこの mod を通してゲームを読み、操作する。
- -Instances 1 (既定) は Steam 経由で 1 つ起動する。ゲストの Steam がオフラインモードでなければ起動しない
  (同じアカウントで持ち主がホストで遊んでいるとき、オンラインで起動すると持ち主のゲームを止めるため)。
- -Instances 2 以上は、ゲームの開発用の起動引数で同じゲストに複数起動し、localhost で協力プレイにつなぐ。
  1 つ目は --fastmp=host_standard (プレイヤー ID 1)、2 つ目以降は --fastmp=join --clientId=1000,1001,... で、
  --force-steam=off で Steam を使わない (プロファイルとセーブは user://default/<ID>/ に分かれる)。
- 起動したインスタンスの番号・ログ・ブリッジのポートを C:\dev\logs\instances.json に書く。
- 最後の 1 行に結果を RESULT={JSON} で出す。終了コードは 0 成功 / 1 ビルド失敗 / 2 起動できない / 3 mod の読み込みや接続を確かめられない。
#>
param(
  [string[]]$Mods = @(),
  [ValidateRange(1, 4)][int]$Instances = 1,
  [switch]$NoLaunch,
  [switch]$SkipBuild,
  [int]$LaunchTimeoutSec = 240,
  [int]$LoadWaitSec = 120,
  [Parameter(Mandatory)][int]$BridgeBasePort,
  [Parameter(Mandatory)][int]$JoinClientIdBase
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$Mods     = @(@('AgentBridge') + @($Mods | ForEach-Object { $_ -split ',' }) | Where-Object { $_ } | Select-Object -Unique)
$modsDir  = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$repo     = Resolve-Path (Join-Path $modsDir '..\..')
$steamDir = 'C:\Program Files (x86)\Steam'
$steam    = Join-Path $steamDir 'steam.exe'
$game     = Join-Path $steamDir 'steamapps\common\Slay the Spire 2'
$gameExe  = Join-Path $game 'SlayTheSpire2.exe'
$userData = Join-Path $env:APPDATA 'SlayTheSpire2'
$logDir   = 'C:\dev\logs'
$stamp    = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force $logDir | Out-Null
$result = [ordered]@{ time = (Get-Date).ToString('o'); ref = ''; instances = @(); mods = [ordered]@{}; checks = [ordered]@{} }

function Say($m) { Write-Host "$(Get-Date -f 'HH:mm:ss') $m" }
function Stop-Game { $p = Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue; if ($p) { $p | Stop-Process -Force; $p | Wait-Process -Timeout 30 -ErrorAction SilentlyContinue; Say "game stopped ($(@($p).Count))" } }
function Finish($code) {
  $result.gameRunning = @(Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue).Count
  $result.exitCode = $code
  Write-Host ('RESULT=' + ($result | ConvertTo-Json -Compress -Depth 6))
  exit $code
}
trap { Say "ERROR $($_.Exception.Message)"; $result.error = $_.Exception.Message; Finish 1 }

# ゲストのデスクトップ (対話セッション) で起動する。SSH のセッションから直接起動すると画面に出ない
function Start-OnDesktop([string]$exe, [string]$arguments, [string]$name) {
  $a = New-ScheduledTaskAction -Execute $exe -Argument $arguments -WorkingDirectory (Split-Path $exe)
  $p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
  Register-ScheduledTask -TaskName $name -Action $a -Principal $p -Force | Out-Null
  Start-ScheduledTask -TaskName $name
  Start-Sleep 2
  Unregister-ScheduledTask -TaskName $name -Confirm:$false
}
function Read-Lines([string]$path) { if (Test-Path $path) { @(Get-Content $path -Encoding UTF8 | ForEach-Object { [string]$_ }) } else { @() } }

$result.ref = (git -C $repo log -1 --format='%h %s')
Say "source: $($result.ref)"

Stop-Game

# ビルドと導入
if (-not $SkipBuild) {
  foreach ($mod in $Mods) {
    $proj = Join-Path $modsDir "mods\$mod\$mod.csproj"
    if (-not (Test-Path $proj)) { $result.mods[$mod] = [ordered]@{ build = 'missing' }; Say "mod が無い: $proj"; Finish 1 }
    $blog = Join-Path $logDir "build-$mod-$stamp.log"
    Say "dotnet publish $mod (log $blog)"
    Push-Location $modsDir
    try { & dotnet publish $proj -nologo -v:m *> $blog; $code = $LASTEXITCODE } finally { Pop-Location }
    $errs = @(Select-String -Path $blog -Pattern ': error [A-Z]+\d+' | ForEach-Object { $_.Line.Trim() } | Select-Object -Unique -First 20)
    $manifest = Get-Content (Join-Path $modsDir "mods\$mod\$mod.json") -Raw | ConvertFrom-Json
    $installed = [ordered]@{}
    foreach ($ext in 'dll', 'json', 'pck') { $f = Join-Path $game "mods\$mod\$mod.$ext"; if (Test-Path $f) { $installed[$ext] = (Get-Item $f).LastWriteTime.ToString('o') } }
    $ok = ($code -eq 0) -and $installed.dll -and $installed.json -and ((-not $manifest.has_pck) -or $installed.pck)
    $result.mods[$mod] = [ordered]@{ build = $(if ($ok) { 'ok' } else { 'failed' }); exitCode = $code; errors = $errs; installed = $installed; buildLog = $blog }
    Say "$mod build exit=$code errors=$($errs.Count) installed=$($installed.Keys -join ',')"
    if (-not $ok) { $errs | ForEach-Object { Say "  $_" }; Finish 1 }
  }
}
if ($NoLaunch) { Finish 0 }

# 起動
$modList = @($Mods + 'BaseLib' | Select-Object -Unique | ForEach-Object { [ordered]@{ id = $_; is_enabled = $true; source = 'mods_directory' } })
function Set-Settings([string]$file, [hashtable]$values) {
  $s = if (Test-Path $file) { Get-Content $file -Raw | ConvertFrom-Json } else { [pscustomobject]@{} }
  foreach ($k in $values.Keys) { $s | Add-Member -NotePropertyName $k -NotePropertyValue $values[$k] -Force }
  [IO.File]::WriteAllText($file, ($s | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
}
$instancesInfo = @()
if ($Instances -eq 1) {
  $lu = Join-Path $steamDir 'config\loginusers.vdf'
  if (-not (Select-String -Path $lu -Pattern '"WantsOfflineMode"\s+"1"' -Quiet)) { Say 'ゲストの Steam がオフラインモードの設定でない。オンラインで起動すると持ち主のゲームを止めるので起動しない'; Finish 2 }
  if (-not (Get-Process steam -ErrorAction SilentlyContinue)) {
    Say 'start Steam (offline) on the desktop'
    Start-OnDesktop $steam '-silent' 'sts2-dev-loop-steam'
    $d = (Get-Date).AddSeconds(90)
    while (-not (Select-String -Path (Join-Path $steamDir 'logs\steamui_login.txt') -Pattern 'Start offline - 1' -Quiet) -and (Get-Date) -lt $d) { Start-Sleep 3 }
  }
  $lastStart = Read-Lines (Join-Path $steamDir 'logs\steamui_login.txt') | Where-Object { $_ -match 'Start offline - ' } | Select-Object -Last 1
  if ($lastStart -notmatch 'Start offline - 1') { Say "Steam がオフラインで動いていない ($lastStart)。起動しない"; Finish 2 }
  Get-ChildItem (Join-Path $userData 'steam') -Recurse -Filter settings.save -ErrorAction SilentlyContinue | ForEach-Object { Set-Settings $_.FullName @{ mod_settings = [ordered]@{ mod_list = $modList; mods_enabled = $true } } }
  $gameLog = Join-Path $userData 'logs\godot.log'
  $since = if (Test-Path $gameLog) { (Get-Item $gameLog).LastWriteTime } else { Get-Date 0 }
  Start-OnDesktop $steam 'steam://rungameid/2868840' 'sts2-dev-loop-launch'
  $instancesInfo += [pscustomobject]@{ instance = 0; clientId = $null; role = 'single'; log = $gameLog; since = $since; port = $BridgeBasePort }
} else {
  $template = Get-ChildItem (Join-Path $userData 'steam') -Recurse -Filter settings.save -ErrorAction SilentlyContinue | Select-Object -First 1
  $w = 960; $h = 540
  for ($i = 0; $i -lt $Instances; $i++) {
    $id = if ($i -eq 0) { 1 } else { $JoinClientIdBase + $i }
    $dir = Join-Path $userData "default\$id"
    New-Item -ItemType Directory -Force $dir | Out-Null
    $sf = Join-Path $dir 'settings.save'
    if (-not (Test-Path $sf) -and $template) { Copy-Item $template.FullName $sf }
    Set-Settings $sf @{ fullscreen = $false; window_size = [ordered]@{ X = $w; Y = $h }; window_position = [ordered]@{ X = ($i % 2) * $w; Y = [math]::Floor($i / 2) * $h }
                        limit_fps_in_background = $false; seen_ea_disclaimer = $true; skip_intro_logo = $true; mod_settings = [ordered]@{ mod_list = $modList; mods_enabled = $true } }
    $log = Join-Path $logDir "sts2-$id.log"
    Remove-Item $log -ErrorAction SilentlyContinue
    $role = if ($i -eq 0) { 'host' } else { 'join' }
    $args0 = if ($i -eq 0) { '--fastmp=host_standard' } else { "--fastmp=join --clientId=$id" }
    Start-OnDesktop $gameExe "--force-steam=off $args0 --log-file $log" "sts2-dev-loop-$id"
    $instancesInfo += [pscustomobject]@{ instance = $i; clientId = $(if ($i -eq 0) { $null } else { $id }); role = $role; log = $log; since = (Get-Date 0); port = $BridgeBasePort + $i }
    Say "launched $role (id $id)"
    if ($i -eq 0) {
      # ホストが協力プレイのホスト画面を開くまで待ってから参加側を起動する
      $d = (Get-Date).AddSeconds(90)
      while (-not ((Read-Lines $log) -match 'multiplayer_host_submenu|StartRunLobby') -and (Get-Date) -lt $d) { Start-Sleep 2 }
      Start-Sleep 5
    }
  }
}
$result.instances = @($instancesInfo | ForEach-Object { [ordered]@{ instance = $_.instance; clientId = $_.clientId; role = $_.role; log = $_.log; port = $_.port } })
[IO.File]::WriteAllText((Join-Path $logDir 'instances.json'), (ConvertTo-Json -InputObject @($result.instances) -Depth 4), (New-Object Text.UTF8Encoding($false)))

$d = (Get-Date).AddSeconds($LaunchTimeoutSec)
while (@(Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue).Count -lt $Instances -and (Get-Date) -lt $d) { Start-Sleep 2 }
if (@(Get-Process SlayTheSpire2 -ErrorAction SilentlyContinue).Count -lt $Instances) { Say "ゲームが $Instances つ起動しない"; Finish 2 }

# ログで確かめる: 各インスタンスで mod の初期化が終わったか、複数起動ならホストと参加側がつながったか
$deadline = (Get-Date).AddSeconds($LoadWaitSec)
do {
  Start-Sleep 5
  $allOk = $true
  foreach ($inst in $instancesInfo) {
    $lines = Read-Lines $inst.log
    if ($inst.role -eq 'single' -and (Test-Path $inst.log) -and (Get-Item $inst.log).LastWriteTime -le $inst.since) { $lines = @() }
    $c = [ordered]@{ role = $inst.role }
    foreach ($mod in $Mods) { $c["mod:$mod"] = [bool]($lines -match ("Finished mod initialization for '" + [regex]::Escape($mod) + "'")) }
    if ($lines -match 'has not yet seen the mods warning') { $c.modsWarning = 'mod の読み込みに同意していない (設定の mod_settings を確かめる)' }
    if ($inst.role -eq 'host') { foreach ($o in $instancesInfo | Where-Object role -eq 'join') { $c["client:$($o.clientId)"] = [bool]($lines -match "Client $($o.clientId) connected") } }
    if ($inst.role -eq 'join') { $c.joined = [bool]($lines -match 'Received ClientLobbyJoinResponseMessage') }
    $c.errors = @($lines | Where-Object { $_ -match '^\[ERROR\]' } | Select-Object -Last 5)
    $result.checks["$($inst.instance)"] = $c
    foreach ($k in @($c.Keys)) { if ($k -match '^(mod:|client:|joined)' -and -not $c[$k]) { $allOk = $false } }
  }
} while (-not $allOk -and (Get-Date) -lt $deadline)
if (-not $allOk) { Finish 3 }
Finish 0
