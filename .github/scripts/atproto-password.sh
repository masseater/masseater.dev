#!/usr/bin/env bash
set -euo pipefail
audience="masseater-dev-credential-broker"
oidc="$(curl -fsS -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN" \
  "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=$audience" | jq -er .value)"
echo "::add-mask::$oidc"
response="$(curl -fsS --retry 3 -X POST -H "Authorization: Bearer $oidc" "https://credentials.masseater.dev/?only=atproto")"
password="$(jq -r '.atpAppPassword // empty' <<<"$response")"
if [ -z "$password" ]; then
  echo "::notice::No AT Protocol app password yet: POST it to https://credentials.masseater.dev/atproto/app-password"
  exit 0
fi
echo "::add-mask::$password"
echo "ATP_APP_PASSWORD=$password" >>"$GITHUB_ENV"
