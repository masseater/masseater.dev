#!/usr/bin/env bash
set -euo pipefail

llama_tag=b12228
model_repository=pfnet/plamo-3-translate-0.8b-GGUF
model_revision=1cf96ae02133958a20074bfdfab76517bb737d00

case "${1:?usage: fetch-runtime.sh linux-x64|macos-arm64|windows-x64}" in
  linux-x64)
    asset="llama-$llama_tag-bin-ubuntu-x64.tar.gz"
    asset_sha256=61672e52aefe54ef3f90babf6a9fa4489f019ae61a5bdcd55d91caa6dc6e1cee
    ;;
  macos-arm64)
    asset="llama-$llama_tag-bin-macos-arm64.tar.gz"
    asset_sha256=253fd52bd0127e1d6627c35aec75694a94c72e3ce552c016dbb3b54be9084b3c
    ;;
  windows-x64)
    asset="llama-$llama_tag-bin-win-cpu-x64.zip"
    asset_sha256=58e0dfefb963c0031ee10a390db6203f9a225528000b2fd6a5d16c20aa044384
    ;;
  *)
    echo "unknown platform: $1" >&2
    exit 1
    ;;
esac

resources="$(cd "$(dirname "$0")/../src-tauri" && pwd)/resources"
downloads="$(mktemp -d)"
trap 'rm -rf "$downloads"' EXIT

checksum() {
  if command -v sha256sum >/dev/null; then
    echo "$1  $2" | sha256sum --check --quiet -
  else
    echo "$1  $2" | shasum --algorithm 256 --check --quiet -
  fi
}

download() {
  curl --fail --silent --show-error --location --retry 3 --output "$2" "$1"
}

keep_server_closure() {
  local llama="$1" licenses="$2" kept="$1.kept" file link target name user changed direct=""
  for file in "$llama"/LICENSE-*; do
    [ -e "$file" ] || continue
    name="$(basename "$file")"
    mv "$file" "$licenses/${name#LICENSE-}-LICENSE.txt"
  done
  for link in "$llama"/*; do
    if [ -L "$link" ] && [ ! -L "$llama/$(readlink "$link")" ]; then
      direct="$direct$link"$'\n'
    fi
  done
  while read -r link; do
    [ -n "$link" ] || continue
    target="$llama/$(readlink "$link")"
    rm "$link"
    mv "$target" "$link"
  done <<<"$direct"
  find "$llama" -type l -delete
  rm -rf "$kept"
  mkdir "$kept"
  for file in "$llama"/llama-server "$llama"/llama-server.exe "$llama"/*ggml-cpu*; do
    if [ -f "$file" ]; then
      mv "$file" "$kept/"
    fi
  done
  changed=1
  while [ "$changed" -eq 1 ]; do
    changed=0
    for file in "$llama"/*; do
      name="$(basename "$file")"
      case "$name" in
        *.so | *.so.* | *.dylib | *.dll) ;;
        *) continue ;;
      esac
      for user in "$kept"/*; do
        if grep -qaF "$name" "$user"; then
          mv "$file" "$kept/"
          changed=1
          break
        fi
      done
    done
  done
  rm -rf "$llama"
  mv "$kept" "$llama"
}

archive="$resources/archives/$asset"
if ! { [ -f "$archive" ] && checksum "$asset_sha256" "$archive"; }; then
  rm -rf "$resources/archives"
  mkdir -p "$resources/archives"
  download "https://github.com/ggml-org/llama.cpp/releases/download/$llama_tag/$asset" "$downloads/$asset"
  checksum "$asset_sha256" "$downloads/$asset"
  mv "$downloads/$asset" "$archive"
fi
rm -rf "$resources/llama"
mkdir -p "$resources/llama" "$resources/licenses"
case "$asset" in
  *.zip) unzip -q "$archive" -d "$resources/llama" ;;
  *) tar -xzf "$archive" -C "$resources/llama" --strip-components=1 ;;
esac
keep_server_closure "$resources/llama" "$resources/licenses"

download "https://huggingface.co/$model_repository/resolve/$model_revision/LICENSE/ja" "$resources/licenses/PLaMo-Community-License-ja.txt"
download "https://huggingface.co/$model_repository/resolve/$model_revision/LICENSE/en" "$resources/licenses/PLaMo-Community-License-en.txt"
download "https://raw.githubusercontent.com/ggml-org/llama.cpp/$llama_tag/LICENSE" "$resources/licenses/llama.cpp-LICENSE.txt"
