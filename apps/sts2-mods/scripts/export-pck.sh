#!/usr/bin/env bash
# Mod のアセット (mods/<Mod>/<Mod>/) を MegaDot で .pck に書き出す。
# C# のビルドはしないので、ゲーム本体 (sts2.dll) が無い環境でも動く。
#
# 使い方:
#   scripts/export-pck.sh <ModName> [出力フォルダ]
#   出力フォルダの既定はゲームの mods/<ModName>/
#   MegaDot の場所は local.props の GodotPath か、環境変数 GODOT_PATH で指定する
set -euo pipefail

mod="${1:?使い方: scripts/export-pck.sh <ModName> [出力フォルダ]}"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
proj="$repo_root/mods/$mod/$mod.csproj"
[ -f "$proj" ] || { echo "Mod が見つかりません: $proj" >&2; exit 1; }
[ -d "$repo_root/mods/$mod/$mod" ] || { echo "$mod にはアセットフォルダ (mods/$mod/$mod/) が無いので .pck は不要です"; exit 0; }

args=(-restore -t:ExportPck -p:SkipSts2Check=true -nologo -v:m)
[ -n "${GODOT_PATH:-}" ] && args+=("-p:GodotPath=$GODOT_PATH")
if [ -n "${2:-}" ]; then
  mkdir -p "$2"
  args+=("-p:PckOutputDir=$(cd "$2" && pwd)/")
fi
# MegaDot (C# 版) が .NET を見つけられるようにする
export DOTNET_ROOT="${DOTNET_ROOT:-$(dirname "$(readlink -f "$(command -v dotnet)")")}"
dotnet msbuild "$proj" "${args[@]}"
