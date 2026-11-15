#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cmd=build
if [ "${1:-}" = "--publish" ]; then cmd=publish; shift; fi

if [ $# -eq 0 ]; then
  if [ "$cmd" = publish ]; then
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
