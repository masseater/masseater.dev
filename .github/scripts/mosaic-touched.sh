#!/usr/bin/env bash
set -euo pipefail
api="repos/$GITHUB_REPOSITORY"
window=50
compare_file_limit=300
decide() {
  echo "mosaic=$1" >> "$GITHUB_OUTPUT"
  echo "web=$2" >> "$GITHUB_OUTPUT"
  exit 0
}
superseded="$(mktemp)"
trap 'rm -f "$superseded"' EXIT
GITHUB_OUTPUT="$superseded" "$(dirname "${BASH_SOURCE[0]}")/mosaic-superseded.sh"
if grep -qxF "superseded=true" "$superseded"; then
  decide false false
fi
if [ "$GITHUB_EVENT_NAME" = "schedule" ]; then
  decide true true
fi
base=""
if ! older="$(gh api "$api/actions/workflows/verify.yml/runs?branch=main&per_page=100" \
  --jq '.workflow_runs[] | select(.run_number < (env.GITHUB_RUN_NUMBER | tonumber)) | "\(.id) \(.head_sha) \(.status)"')"; then
  echo "::warning::The older runs could not be listed, so mosaic is judged from this push alone"
  older=""
fi
while read -r run sha status; do
  if [ -z "$run" ]; then
    continue
  fi
  if [ -n "$(RUN_STATUS="$status" gh api "$api/actions/runs/$run/jobs?per_page=100" --jq '
    select(any(.jobs[] | select(.name == "mosaic-plan") | .steps[]?; .name == "rebuild" and .conclusion == "success"))
    | [.jobs[] | select(.name == "mosaic-deploy")]
    | select(
        any(.[] | .steps[]?; .name == "deploy" and .conclusion == "success")
        or (env.RUN_STATUS != "completed" and all(.status != "completed"))
      )
    | "covered"')" ]; then
    base="$sha"
    break
  fi
done < <(head -n "$window" <<<"$older")
if [ -n "$base" ]; then
  echo "last mosaic deploy: $base"
elif [[ "${BEFORE_SHA:-}" =~ ^0*$ ]]; then
  echo "no earlier mosaic rebuild was found and this push has no previous commit, so mosaic is rebuilt"
  decide true true
else
  base="$(head -n "$window" <<<"$older" | tail -n 1 | cut -d " " -f 2)"
  base="${base:-$BEFORE_SHA}"
  echo "no earlier mosaic rebuild was found, so mosaic is judged from the changes since $base"
fi
if ! files="$(gh api "$api/compare/$base...$HEAD_SHA" --jq '.files[].filename')" \
  || [ "$(grep -c . <<<"$files")" -ge "$compare_file_limit" ]; then
  echo "::warning::The files changed since $base could not be listed completely, so mosaic is rebuilt"
  decide true true
fi
files="$(grep -v '\.md$' <<<"$files" || true)"
if grep -E '^((libs|tools)/mosaic/|\.github/scripts/mosaic-touched\.sh$)' <<<"$files"; then
  decide true true
fi
if grep -E '^(apps/mosaic/|\.github/scripts/mosaic-live\.sh$)' <<<"$files"; then
  decide false true
fi
decide false false
