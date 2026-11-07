#!/usr/bin/env bash
# Mod をビルドしてゲームの mods フォルダへ配置する。
#
# 使い方:
#   scripts/build.sh                 全 Mod をビルド (sts2-mods.sln)
#   scripts/build.sh ModA ModB       指定した Mod だけビルド
#   scripts/build.sh --publish ModA  .pck も書き出す (dotnet publish)
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cmd=build
if [ "${1:-}" = "--publish" ]; then cmd=publish; shift; fi

if [ $# -eq 0 ]; then
  if [ "$cmd" = publish ]; then
    # sln 単位の publish は出力先が衝突するので Mod ごとに回す
    mods=()
    for dir in "$repo_root"/mods/*/; do mods+=("$(basename "$dir")"); done
    set -- "${mods[@]}"
  else
    exec dotnet build "$repo_root/sts2-mods.sln"
  fi
fi

for mod in "$@"; do
  proj="$repo_root/mods/$mod/$mod.csproj"
  [ -f "$proj" ] || { echo "Mod が見つかりません: $proj" >&2; exit 1; }
  echo "== $mod =="
  dotnet "$cmd" "$proj"
done
