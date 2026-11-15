#!/usr/bin/env bash
set -euo pipefail
cd tools/mosaic/.cache
files=()
for file in small target.png vocadb/songs.json vocadb/progress.json thumbs.json niconico-og.json; do
  if [ -e "$SLUG/$file" ]; then
    files+=("$SLUG/$file")
  fi
done
tar -cf pool.tar -- "${files[@]}"
hash="$(cat -- "$SLUG/vocadb/songs.json" "$SLUG/thumbs.json" "$SLUG/niconico-og.json" 2>/dev/null | sha256sum | cut -c 1-64)"
echo "key=mosaic-pool-$SLUG-$hash" >> "$GITHUB_OUTPUT"
