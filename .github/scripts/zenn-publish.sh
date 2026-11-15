#!/usr/bin/env bash
set -euo pipefail
gh auth setup-git
tree="$(git rev-parse HEAD:apps/zenn-articles)"
parent=()
if git fetch --no-tags --depth=1 origin zenn; then
  if [ "$(git rev-parse 'FETCH_HEAD^{tree}')" = "$tree" ]; then
    exit 0
  fi
  parent=(-p FETCH_HEAD)
fi
commit="$(git commit-tree "$tree" "${parent[@]}" -m "deploy: $GITHUB_SHA")"
git push origin "$commit:refs/heads/zenn"
