#!/usr/bin/env bash
set -euo pipefail
version="$(jq -er '."apps/yohaku-desktop"' .github/release-please/yohaku-manifest.json)"
bundle="target/release/bundle"
mkdir -p dist
case "$RUNNER_OS" in
  Windows)
    installer="$(find "$bundle/nsis" -name '*-setup.exe' | head -n 1)"
    cp "$installer" "dist/yohaku_${version}_x64-setup.exe"
    cp "$installer.sig" "dist/yohaku_${version}_x64-setup.exe.sig"
    ;;
  macOS)
    cp "$(find "$bundle/dmg" -name '*.dmg' | head -n 1)" "dist/yohaku_${version}_aarch64.dmg"
    archive="$(find "$bundle/macos" -name '*.app.tar.gz' | head -n 1)"
    cp "$archive" "dist/yohaku_${version}_aarch64.app.tar.gz"
    cp "$archive.sig" "dist/yohaku_${version}_aarch64.app.tar.gz.sig"
    ;;
  *)
    echo "::error::no installer for $RUNNER_OS"
    exit 1
    ;;
esac
ls -l dist
