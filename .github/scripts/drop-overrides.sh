#!/usr/bin/env bash
set -euo pipefail
report="$(mktemp)"
node tools/msch/src/cli.ts overrides --json >"$report"
jq -r '.[] | "\(.key): \(.verdict)"' "$report"
mapfile -t candidates < <(jq -r '.[] | select(.verdict != "keep") | .key' "$report")
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
dropped=()
for key in "${candidates[@]}"; do
  echo "::group::verify without $key"
  node tools/msch/src/cli.ts overrides --remove "$key"
  vp install --no-frozen-lockfile
  if vp run --log grouped verify; then
    git commit -qam "chore(deps): 不要になった override $key を外す"
    dropped+=("$key")
  else
    git checkout -- .
    vp install --frozen-lockfile
  fi
  echo "::endgroup::"
done
if [ "${#dropped[@]}" -eq 0 ]; then
  echo "Every override is still needed."
  exit 0
fi
if [ -z "${GITHUB_APP_TOKEN:-}" ]; then
  echo "::error::credentials.masseater.dev issued no GitHub App token; a push with GITHUB_TOKEN leaves the up-to-date check waiting for approval"
  exit 1
fi
export GH_TOKEN="$GITHUB_APP_TOKEN"
gh auth setup-git
branch="claude/drop-overrides-$GITHUB_RUN_ID"
git push --no-verify origin "HEAD:refs/heads/$branch"
title="chore(deps): 不要になった override を外す"
if [ "${#dropped[@]}" -eq 1 ]; then
  title="$(git log -1 --format=%s)"
fi
url="$(gh pr create --base main --head "$branch" --title "$title" --body "$title")"
gh pr merge "$url" --squash --auto --delete-branch
