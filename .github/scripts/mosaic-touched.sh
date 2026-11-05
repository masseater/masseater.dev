#!/usr/bin/env bash
set -euo pipefail
base=""
for run in $(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/verify.yml/runs?branch=main&status=completed&per_page=50" \
  --jq '.workflow_runs[].id'); do
  if [ -n "$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run/jobs?per_page=100" \
    --jq '.jobs[] | select(.name == "mosaic-deploy" and .conclusion == "success") | .id')" ]; then
    base="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$run" --jq .head_sha)"
    break
  fi
done
if [ -z "$base" ]; then
  echo "mosaic=true" >> "$GITHUB_OUTPUT"
  exit 0
fi
echo "last mosaic deploy: $base"
if gh api "repos/$GITHUB_REPOSITORY/compare/$base...$HEAD_SHA" --jq '.files[].filename' \
  | grep -E '^((apps|libs|tools)/mosaic/|\.github/scripts/mosaic-touched\.sh$)'; then
  echo "mosaic=true" >> "$GITHUB_OUTPUT"
fi
