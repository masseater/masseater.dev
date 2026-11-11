#!/usr/bin/env bash
set -euo pipefail
to="$(($(date +%s) * 1000))"
from="$((to - MINUTES * 60 * 1000))"
body="$(jq -n --argjson from "$from" --argjson to "$to" --arg needle "$NEEDLE" --arg service "$SERVICE" '{
  queryId: "worker-logs",
  view: "events",
  limit: 500,
  timeframe: { from: $from, to: $to },
  parameters: ({ filters: [{ key: "$metadata.service", operation: "includes", type: "string", value: $service }] }
    + (if $needle == "" then {} else { needle: { value: $needle } } end))
}')"
response="$(curl -sS -X POST \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/observability/telemetry/query" \
  -d "$body")"
jq -c '{ success, errors, count: (.result.events.events // [] | length) }' <<<"$response"
jq -r '.result.events.events // [] | .[0] // {} | [paths(scalars) | map(tostring) | join(".")] | .[]' <<<"$response" | sed 's/^/key: /' | head -80
jq -c '.result.events.events // [] | .[] | {
  t: .timestamp,
  level: .["$metadata"].level,
  service: .["$metadata"].service,
  message: .["$metadata"].message,
  error: .["$metadata"].error,
  reason: .source.annotations.reason,
  url: (.["$metadata"].url // .["$workers"].event.request.url // null),
  outcome: .["$workers"].outcome,
  status: .["$workers"].event.response.status,
  wallMs: .["$workers"].wallTimeMs,
  cpuMs: .["$workers"].cpuTimeMs
}' <<<"$response" | sed -E 's/\?[^"]*"/"/g; s/(context|token)=[^&" ]*/\1=***/g'
