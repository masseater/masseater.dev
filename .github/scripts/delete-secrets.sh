#!/usr/bin/env bash
set -euo pipefail
list() { jq -r --arg key "$1" '.inputs[$key] // ""' "$GITHUB_EVENT_PATH" | tr ',' '\n' | tr -d ' ' | grep -v '^$' || true; }
repositories="$(list repositories)"
secrets="$(list secrets)"
while read -r name; do
  [ -n "$name" ] && echo "::add-mask::$name"
done <<<"$repositories"
if [ -z "$repositories" ] || [ -z "$secrets" ]; then
  echo "::error::repositories and secrets are required"
  exit 1
fi
while read -r name; do
  if ! [[ "$name" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "::error::invalid name"
    exit 1
  fi
done <<<"$repositories"$'\n'"$secrets"
if grep -qxF "masseater.dev" <<<"$repositories"; then
  echo "::error::masseater.dev holds the broker's own secrets"
  exit 1
fi
installed="$(gh api --paginate installation/repositories --jq '.repositories[] | select(.owner.login == "masseater") | .name')"
while read -r repository; do
  if ! grep -qxF "$repository" <<<"$installed"; then
    echo "::error::$repository is not installed for the GitHub App"
    exit 1
  fi
  present="$(gh api --paginate "repos/masseater/$repository/actions/secrets" --jq '.secrets[].name')"
  while read -r secret; do
    if grep -qxF "$secret" <<<"$present"; then
      gh api -X DELETE "repos/masseater/$repository/actions/secrets/$secret"
      echo "deleted $secret from $repository"
    else
      echo "$secret is not in $repository"
    fi
  done <<<"$secrets"
done <<<"$repositories"
