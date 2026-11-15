#!/usr/bin/env bash
set -euo pipefail
names="$(gh api --paginate installation/repositories --jq '.repositories[] | select(.private) | .name')"
patterns=()
while IFS= read -r name; do
  [ -n "$name" ] || continue
  echo "::add-mask::$name"
  escaped="$(sed 's/[.[\*^$()+?{}|]/\\&/g' <<<"$name")"
  patterns+=("masseater/${escaped}([^A-Za-z0-9_.-]|$)")
  if [[ "$name" == *[-_]* ]]; then
    patterns+=("$(sed 's/[-_]/[-_]?/g' <<<"$escaped")")
  fi
done <<<"$names"
if [ "${#patterns[@]}" -eq 0 ]; then
  echo "::error::The GitHub App listed no private repository"
  exit 1
fi
regex="$(IFS='|'; echo "${patterns[*]}")"
found=0
for checkout in "$@"; do
  if hits="$(git -C "$checkout" grep -n -I -i -E "$regex" | cut -d: -f1,2)"; then
    while IFS= read -r hit; do
      echo "::error::${checkout}/${hit} names a private repository"
    done <<<"$hits"
    found=1
  fi
done
exit "$found"
