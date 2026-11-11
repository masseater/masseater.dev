#!/usr/bin/env bash
set -euo pipefail
api="repos/$GITHUB_REPOSITORY/actions"
steps="$(jq -cn --arg steps "${SUPERSEDING_STEPS:-rebuild}" '$steps | split(" ")')"
export STEPS="$steps"
newer_rebuild() {
  local newer run rebuilds
  newer="$(gh api "$api/workflows/verify.yml/runs?branch=main&per_page=100" \
    --jq '.workflow_runs[] | select(.run_number > (env.GITHUB_RUN_NUMBER | tonumber)) | .id')" || return 2
  while read -r run; do
    if [ -z "$run" ]; then
      continue
    fi
    rebuilds="$(gh api "$api/runs/$run/jobs?per_page=100" \
      --jq '.jobs[] | select(.name == "mosaic-plan") | .steps[]? | select((.name as $name | env.STEPS | fromjson | index($name)) and .conclusion == "success") | .number')" || return 2
    if [ -n "$rebuilds" ]; then
      echo "run $run is newer and also deploys mosaic, so it supersedes this one"
      return 0
    fi
  done <<<"$newer"
  return 1
}
status=0
newer_rebuild || status="$?"
case "$status" in
  0) echo "superseded=true" >> "$GITHUB_OUTPUT" ;;
  1) echo "superseded=false" >> "$GITHUB_OUTPUT" ;;
  *)
    echo "::warning::The newer runs could not be read, so this mosaic rebuild is not treated as superseded"
    echo "superseded=false" >> "$GITHUB_OUTPUT"
    ;;
esac
