# Publish 済みの Mod ファイル (json / dll / pck) を、ゲームの mods フォルダから
# ワークショップ用ワークスペース workshop/<ModName>/content/<ModName>/ へコピーする。
#
# 使い方 (リポジトリ直下で):
#   .\scripts\stage.ps1 -ModName MyFirstMod
#   .\scripts\stage.ps1 -ModName MyFirstMod -Sts2Path "D:\SteamLibrary\steamapps\common\Slay the Spire 2"
param(
    [Parameter(Mandatory)] [string]$ModName,
    [string]$Sts2Path = "C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2"
)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path $PSScriptRoot -Parent
$src = Join-Path $Sts2Path "mods\$ModName"
$workspace = Join-Path $repoRoot "workshop\$ModName"
$dst = Join-Path $workspace "content\$ModName"

if (-not (Test-Path $workspace)) { throw "ワークスペースがありません: $workspace" }
# アップローダは dependencies を数値として読むので、文字列だとアップロード時にパースで止まる
$workshopConfig = Get-Content (Join-Path $workspace "workshop.json") -Raw | ConvertFrom-Json
if (@($workshopConfig.dependencies | Where-Object { $_ -is [string] }).Count -gt 0) { throw "workshop.json の dependencies は数値で書いてください (例: [3737335127])" }
if (-not (Test-Path $src)) { throw "Mod が見つかりません: $src (先に dotnet publish してください)" }

$manifest = Get-Content (Join-Path $src "$ModName.json") -Raw | ConvertFrom-Json
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force $dst | Out-Null

Copy-Item (Join-Path $src "$ModName.json") $dst
foreach ($ext in @(@{ Name = "dll"; Flag = $manifest.has_dll }, @{ Name = "pck"; Flag = $manifest.has_pck })) {
    $file = Join-Path $src "$ModName.$($ext.Name)"
    if ($ext.Flag) {
        if (-not (Test-Path $file)) { throw "マニフェストは has_$($ext.Name)=true ですが $file がありません" }
        Copy-Item $file $dst
    }
}
Write-Host "コピーしました ($($manifest.version)):"
Get-ChildItem $dst | ForEach-Object { Write-Host "  $($_.Name)" }
