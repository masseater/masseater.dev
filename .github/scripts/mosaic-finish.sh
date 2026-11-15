#!/usr/bin/env bash
set -euo pipefail
if [ "$SAVED" = "success" ]; then
  gh cache list --repo "$GITHUB_REPOSITORY" --key "mosaic-pool-$SLUG-" --limit 100 --json key --jq ".[].key" |
    { grep -xE "mosaic-pool-$SLUG-[0-9a-f]{64}" || true; } | { grep -vxF "$KEEP" || true; } |
    xargs -r -n 1 gh cache delete --repo "$GITHUB_REPOSITORY"
fi
rm -rf tools/mosaic/.cache
if [ -d "apps/mosaic/public/files/$SLUG/0" ]; then
  echo "changed=true" >> "$GITHUB_OUTPUT"
fi
