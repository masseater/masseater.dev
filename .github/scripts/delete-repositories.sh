#!/usr/bin/env bash
set -euo pipefail
names="$(jq -r '.inputs.repositories // ""' "$GITHUB_EVENT_PATH" | tr ',' '\n' | tr -d ' ' | grep -v '^$' || true)"
while read -r name; do
  [ -n "$name" ] && echo "::add-mask::$name"
done <<<"$names"
if [ -z "$names" ]; then
  echo "::error::no repositories given"
  exit 1
fi
while read -r name; do
  if ! [[ "$name" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "::error::invalid repository name"
    exit 1
  fi
done <<<"$names"
installed="$(gh api --paginate installation/repositories --jq '.repositories[] | select(.owner.login == "masseater") | .name')"
while read -r name; do
  if ! grep -qxF "$name" <<<"$installed"; then
    echo "::error::$name is not installed for the GitHub App"
    exit 1
  fi
  gh api -X DELETE "repos/masseater/$name"
  echo "deleted $name"
done <<<"$names"
