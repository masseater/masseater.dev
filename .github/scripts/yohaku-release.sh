#!/usr/bin/env bash
set -euo pipefail
version="$(gh api -H "Accept: application/vnd.github.raw" \
  "repos/$GITHUB_REPOSITORY/contents/.github/release-please/yohaku-manifest.json?ref=$GITHUB_SHA" |
  jq -er '."apps/yohaku-desktop"')"
tag="yohaku-v$version"
feed="yohaku-updater"
if ! gh api "repos/$GITHUB_REPOSITORY/git/ref/tags/$tag" >/dev/null 2>&1; then
  gh api -X POST "repos/$GITHUB_REPOSITORY/git/refs" -f "ref=refs/tags/$tag" -f "sha=$GITHUB_SHA"
fi
if ! gh release view "$tag" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release create "$tag" --repo "$GITHUB_REPOSITORY" --verify-tag --latest=false \
    --title "余白: v$version" --notes ""
fi
gh pr list --repo "$GITHUB_REPOSITORY" --state merged --label "autorelease: pending" \
  --head release-please--branches--main--components--yohaku --json number --jq '.[].number' |
  while read -r pr; do
    gh pr edit "$pr" --repo "$GITHUB_REPOSITORY" \
      --remove-label "autorelease: pending" --add-label "autorelease: tagged"
  done
assets="$(gh release view "$tag" --repo "$GITHUB_REPOSITORY" --json assets --jq '.assets | length')"
if [ "$assets" -ne 0 ]; then
  echo "$tag is already published"
  exit 0
fi
for file in "dist/yohaku_${version}_x64-setup.exe" "dist/yohaku_${version}_aarch64.app.tar.gz"; do
  if [ ! -f "$file" ] || [ ! -f "$file.sig" ]; then
    echo "::error::$file and its signature are missing; the installers were built from another revision"
    exit 1
  fi
done
gh release upload "$tag" dist/*.exe dist/*.dmg dist/*.app.tar.gz --repo "$GITHUB_REPOSITORY" --clobber
download="https://github.com/$GITHUB_REPOSITORY/releases/download/$tag"
jq -n \
  --arg version "$version" \
  --arg date "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --arg windows "$download/yohaku_${version}_x64-setup.exe" \
  --rawfile windowsSignature "dist/yohaku_${version}_x64-setup.exe.sig" \
  --arg mac "$download/yohaku_${version}_aarch64.app.tar.gz" \
  --rawfile macSignature "dist/yohaku_${version}_aarch64.app.tar.gz.sig" \
  '{version: $version, notes: "", pub_date: $date, platforms: {
    "windows-x86_64": {url: $windows, signature: $windowsSignature},
    "darwin-aarch64": {url: $mac, signature: $macSignature}
  }}' >dist/latest.json
if ! gh release view "$feed" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release create "$feed" --repo "$GITHUB_REPOSITORY" --target "$GITHUB_SHA" --latest=false \
    --title "余白: 更新の配信" --notes ""
fi
gh release upload "$feed" dist/latest.json --repo "$GITHUB_REPOSITORY" --clobber
