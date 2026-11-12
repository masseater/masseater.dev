#!/bin/sh
set -eu

origin="https://yohaku.masseater.dev"

for path in / /api/changes; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$origin$path")"
  case "$code" in
    302 | 401 | 403) ;;
    *)
      echo "$origin$path answered $code without Access" >&2
      exit 1
      ;;
  esac
done

echo "$origin is refused without Access"
