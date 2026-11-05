#!/usr/bin/env bash
set -euo pipefail
audience="masseater-dev-credential-broker"
oidc="$(curl -fsS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$audience" | jq -er .value)"
echo "::add-mask::$oidc"
response="$(curl -fsS --retry 3 -X POST -H "Authorization: Bearer $oidc" "https://credentials.masseater.dev/")"
token="$(jq -r '.githubToken // empty' <<<"$response")"
if [ -z "$token" ]; then
  echo "::notice::GitHub App is not set up yet: open https://credentials.masseater.dev/github-app"
  echo "issued=false" >>"$GITHUB_OUTPUT"
  exit 0
fi
echo "::add-mask::$token"
GH_TOKEN="$token" gh api --paginate installation/repositories \
  --jq '.repositories[] | select(.private and (.archived | not)) | "::add-mask::" + .name'
echo "GITHUB_TOKEN=$token" >>"$GITHUB_ENV"
echo "issued=true" >>"$GITHUB_OUTPUT"
