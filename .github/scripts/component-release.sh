#!/usr/bin/env bash
set -euo pipefail
component="${1:?usage: component-release.sh <component> <package> <title>}"
package="${2:?}"
title="${3:?}"
version="$(jq -er --arg package "$package" '.[$package]' ".github/release-please/$component-manifest.json")"
tag="$component-v$version"
if ! gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$tag" >/dev/null 2>&1; then
  gh api -X POST "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$tag" -f "sha=$GITHUB_SHA" >/dev/null
fi
if ! gh release view "$tag" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release create "$tag" --repo "$GITHUB_REPOSITORY" --verify-tag --latest=false \
    --title "$title: v$version" --notes "" >/dev/null
fi
gh pr list --repo "$GITHUB_REPOSITORY" --state merged --label "autorelease: pending" \
  --head "release-please--branches--main--components--$component" --json number --jq '.[].number' |
  while read -r pr; do
    gh pr edit "$pr" --repo "$GITHUB_REPOSITORY" \
      --remove-label "autorelease: pending" --add-label "autorelease: tagged" >/dev/null
  done
assets="$(gh release view "$tag" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets | length')"
if [ "$assets" -eq 0 ]; then
  echo "$tag"
else
  echo "$tag is already published" >&2
fi
