#!/usr/bin/env bash
set -euo pipefail
for prefix in vite-plus- vite-task-; do
  gh cache list --repo "$GITHUB_REPOSITORY" --ref refs/heads/main --key "$prefix" --sort created_at --order desc --limit 100 --json key --jq '.[1:][].key' |
    xargs -r -n 1 gh cache delete --repo "$GITHUB_REPOSITORY"
done
