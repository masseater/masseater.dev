#!/usr/bin/env bash
set -euo pipefail
echo "slugs=$(jq -c '[.[].slug]' libs/mosaic/src/characters.json)" >> "$GITHUB_OUTPUT"
