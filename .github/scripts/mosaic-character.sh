#!/usr/bin/env bash
set -euo pipefail
mosaic=target/release/mosaic
cache=tools/mosaic/.cache
if [ -n "${MATCHED:-}" ]; then
  if tar -tf "$cache/pool.tar" -- "$SLUG" > /dev/null; then
    tar -xf "$cache/pool.tar" -C "$cache" -- "$SLUG"
  fi
  rm "$cache/pool.tar"
fi
sleep "$((JOB_INDEX % 6 * 30))"
if ! timeout 180m "$mosaic" songs "$SLUG"; then
  echo "::warning::The songs of $SLUG were not all fetched, so the pool is built from what was fetched"
fi
"$mosaic" pool "$SLUG"
"$mosaic" solve "$SLUG"
"$mosaic" site "$SLUG"
