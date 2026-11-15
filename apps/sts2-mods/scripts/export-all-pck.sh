#!/usr/bin/env bash
set -euo pipefail
megadot_version="4.5.1-m.14"
megadot_sha256="d245de0cd79ebffa83c87ae505e944fefd6beafd1496e9ce413f3a6c272dec3c"
repo_root="$(cd "$(dirname "$0")/.." && pwd)"
out="${PCK_OUT:-$repo_root/out}"
if [ -z "${GODOT_PATH:-}" ]; then
  megadot="${RUNNER_TEMP:-${TMPDIR:-/tmp}}/megadot-$megadot_version"
  if [ ! -d "$megadot" ]; then
    mkdir -p "$megadot"
    curl -fsSL -o "$megadot/megadot.zip" "https://megadot.megacrit.com/$megadot_version/megadot-$megadot_version-linux-x86_64-editor-csharp.zip"
    echo "$megadot_sha256  $megadot/megadot.zip" | sha256sum --check --quiet -
    unzip -q "$megadot/megadot.zip" -d "$megadot" -x '*.debugsymbols'
    rm "$megadot/megadot.zip"
  fi
  GODOT_PATH="$(ls "$megadot"/MegaDot_*_mono_linux.x86_64)"
  export GODOT_PATH
fi
for dir in "$repo_root"/mods/*/; do
  mod="$(basename "$dir")"
  [ -d "$dir$mod" ] || continue
  "$repo_root/scripts/export-pck.sh" "$mod" "$out/$mod"
done
