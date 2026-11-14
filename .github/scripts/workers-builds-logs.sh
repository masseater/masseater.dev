#!/usr/bin/env bash
set -euo pipefail
api="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID"
auth=(-H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
builds_auth=(-H "Authorization: Bearer $CLOUDFLARE_BUILDS_TOKEN")
tag="$(curl -sS "${auth[@]}" "$api/workers/scripts" | jq -r --arg name "$WORKER" '.result[] | select(.id == $name) | .tag')"
if [ -z "$tag" ]; then
  echo "worker not found" >&2
  exit 1
fi
builds="$(curl -sS "${builds_auth[@]}" "$api/builds/workers/$tag/builds?per_page=$COUNT")"
jq -c '{ success, errors }' <<<"$builds"
jq -c '.result // [] | .[] | { build_uuid, status, build_outcome, created_on, stopped_on }' <<<"$builds"
for build in $(jq -r '.result // [] | .[].build_uuid' <<<"$builds"); do
  log="$(mktemp)"
  cursor=""
  while :; do
    page="$(curl -sS "${builds_auth[@]}" "$api/builds/builds/$build/logs${cursor:+?cursor=$cursor}")"
    jq -r '.result.lines // [] | .[] | map(tostring) | join("\t")' <<<"$page" >>"$log"
    cursor="$(jq -r '.result.cursor // empty' <<<"$page")"
    [ "$(jq -r '.result.truncated // false' <<<"$page")" = true ] && [ -n "$cursor" ] || break
  done
  key="workers-builds/$WORKER/$build.log"
  curl -sS -X PUT "${auth[@]}" -H "Content-Type: text/plain" --data-binary "@$log" \
    "$api/r2/buckets/$BUCKET/objects/$key" -o /dev/null -w "$build lines=$(wc -l <"$log") upload=%{http_code}\n"
done
