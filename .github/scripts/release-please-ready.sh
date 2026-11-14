#!/usr/bin/env bash
set -euo pipefail
component="${1:?usage: release-please-ready.sh <component> <package>}"
package="${2:?}"
version="$(gh api -H "Accept: application/vnd.github.raw" \
  "repos/$GITHUB_REPOSITORY/contents/.github/release-please/$component-manifest.json?ref=main" |
  jq -er --arg package "$package" '.[$package]')"
if gh release view "$component-v$version" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  echo "ready=true" >>"$GITHUB_OUTPUT"
else
  echo "$component-v$version is not released yet; the run for its release commit runs release-please" >&2
fi
