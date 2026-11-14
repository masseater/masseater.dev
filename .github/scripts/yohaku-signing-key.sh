#!/usr/bin/env bash
set -euo pipefail
environment="yohaku-release"
gh api -X PUT "repos/$GITHUB_REPOSITORY/environments/$environment" >/dev/null
present="$(gh api "repos/$GITHUB_REPOSITORY/environments/$environment/secrets" --jq '.secrets[].name')"
if grep -qxF TAURI_SIGNING_PRIVATE_KEY <<<"$present"; then
  echo "::error::The signing key already exists. Installed apps trust its public key, so it is not replaced."
  exit 1
fi
keys="$(mktemp -d)"
trap 'rm -rf "$keys"' EXIT
(cd apps/yohaku-desktop && vp exec tauri signer generate --ci -w "$keys/yohaku.key" >/dev/null)
gh secret set TAURI_SIGNING_PRIVATE_KEY --env "$environment" --repo "$GITHUB_REPOSITORY" <"$keys/yohaku.key"
pubkey="$(cat "$keys/yohaku.key.pub")"
echo "pubkey=$pubkey"
echo "\`$pubkey\`" >>"$GITHUB_STEP_SUMMARY"
