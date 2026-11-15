#!/usr/bin/env bash
set -euo pipefail
cargo build --release --locked -p mosaic
echo "pool=tools/mosaic/.cache/pool.tar" >> "$GITHUB_OUTPUT"
