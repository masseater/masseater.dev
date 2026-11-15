#!/usr/bin/env bash
set -euo pipefail
component="${1:?usage: component-tag.sh <component> <package>}"
package="${2:?}"
version="$(jq -er --arg package "$package" '.[$package]' ".github/release-please/$component-manifest.json")"
tag="$component-v$version"
if ! gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$tag" >/dev/null 2>&1; then
  gh api -X POST "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$tag" -f "sha=$GITHUB_SHA" >/dev/null
fi
