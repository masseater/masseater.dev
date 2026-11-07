#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! command -v vp >/dev/null 2>&1; then
  curl -fsSL https://vite.plus | VP_NODE_MANAGER=no bash >&2
  echo ". \"$HOME/.config/vite-plus/env\"" >>"$CLAUDE_ENV_FILE"
  . "$HOME/.config/vite-plus/env"
fi

cd "$CLAUDE_PROJECT_DIR"
mapfile -t linux_packages <.github/actions/setup/linux-packages.txt
if ! dpkg -s "${linux_packages[@]}" >/dev/null 2>&1; then
  apt-get update -qq >&2
  apt-get install -y -qq "${linux_packages[@]}" >&2
fi
vp env on >&2
vp install --frozen-lockfile >&2
