#!/usr/bin/env bash
set -euo pipefail

llama_tag=b12228
model_repository=pfnet/plamo-3-translate-0.8b-GGUF
model_revision=1cf96ae02133958a20074bfdfab76517bb737d00
model_file=plamo-3-translate-0.8b-Q4_K_M.gguf
model_sha256=70891ec70dc7ab4205745a38307867c2881b99239f20327927633abfe4bc9ec6

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

download "https://github.com/ggml-org/llama.cpp/releases/download/$llama_tag/$asset" "$downloads/$asset"
checksum "$asset_sha256" "$downloads/$asset"
rm -rf "$resources/llama"
mkdir -p "$resources/llama" "$resources/licenses"
case "$asset" in
  *.zip) unzip -q "$downloads/$asset" -d "$resources/llama" ;;
  *) tar -xzf "$downloads/$asset" -C "$resources/llama" --strip-components=1 ;;
esac

if ! { [ -f "$resources/model.gguf" ] && checksum "$model_sha256" "$resources/model.gguf"; }; then
  rm -f "$resources/model.gguf"
  download "https://huggingface.co/$model_repository/resolve/$model_revision/$model_file" "$downloads/$model_file"
  checksum "$model_sha256" "$downloads/$model_file"
  mv "$downloads/$model_file" "$resources/model.gguf"
fi

download "https://huggingface.co/$model_repository/resolve/$model_revision/LICENSE/ja" "$resources/licenses/PLaMo-Community-License-ja.txt"
download "https://huggingface.co/$model_repository/resolve/$model_revision/LICENSE/en" "$resources/licenses/PLaMo-Community-License-en.txt"
download "https://raw.githubusercontent.com/ggml-org/llama.cpp/$llama_tag/LICENSE" "$resources/licenses/llama.cpp-LICENSE.txt"
