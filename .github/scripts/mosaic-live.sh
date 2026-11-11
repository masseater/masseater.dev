#!/usr/bin/env bash
set -euo pipefail
origin="https://masseater.dev/mosaic"
files="apps/mosaic/public/files"
for slug in $(jq -r '.[].slug' libs/mosaic/src/characters.json); do
  mkdir -p "$files/$slug"
  if ! curl -fsS --retry 3 -o "$files/$slug/manifest.json" "$origin/files/$slug/manifest.json"; then
    echo "::warning::$slug has no published manifest, so its page is not prerendered"
    rm -f "$files/$slug/manifest.json"
    continue
  fi
  candidates="$(jq -r '.candidates' "$files/$slug/manifest.json")"
  curl -fsS --retry 3 -o "$files/$slug/$candidates" "$origin/files/$slug/$candidates"
done
