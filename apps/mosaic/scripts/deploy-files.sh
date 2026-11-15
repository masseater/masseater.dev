#!/usr/bin/env bash
set -euo pipefail
exec alchemy deploy alchemy.files.ts --stage "${SLUG:?SLUG names the character whose files are deployed}" --yes
