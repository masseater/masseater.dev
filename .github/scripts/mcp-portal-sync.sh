#!/usr/bin/env bash
set -euo pipefail
api="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/access/ai-controls/mcp/servers"
auth="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
for id in $(curl -fsS -H "$auth" "$api?per_page=100" | jq -r '.result[].id'); do
  echo "== $id"
  curl -sS -X POST -H "$auth" "$api/$id/sync" | jq -c .
done
