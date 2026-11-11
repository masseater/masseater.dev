#!/bin/sh
set -eu

origin="https://kikite.masseater.dev"

for path in / /api/question /api/summary; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H 'content-type: application/json' --data '{}' "$origin$path")"
  case "$code" in
    302 | 401 | 403) ;;
    *)
      echo "$origin$path answered $code without Access" >&2
      exit 1
      ;;
  esac
done

echo "$origin is refused without Access"
