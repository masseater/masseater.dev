#!/usr/bin/env bash
set -euo pipefail
audience="masseater-dev-credential-broker"
oidc="$(curl -fsS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$audience" | jq -er .value)"
echo "::add-mask::$oidc"
response="$(curl -fsS --retry 3 -X POST -H "Authorization: Bearer $oidc" "https://credentials.masseater.dev/?only=github")"
token="$(jq -r '.githubToken // empty' <<<"$response")"
if [ -z "$token" ]; then
  echo "::error::The credential broker returned no GitHub token: check https://credentials.masseater.dev/github-app and the broker logs"
  exit 1
fi
echo "::add-mask::$token"
GH_TOKEN="$token" gh api --paginate installation/repositories \
  --jq '.repositories[] | select(.private and (.archived | not)) | "::add-mask::" + .name'
echo "GITHUB_TOKEN=$token" >>"$GITHUB_ENV"
