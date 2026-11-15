#!/usr/bin/env bash
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
export DOTNET_ROOT="${DOTNET_ROOT:-$(dirname "$(readlink -f "$(command -v dotnet)")")}"
dotnet msbuild "$proj" "${args[@]}"
