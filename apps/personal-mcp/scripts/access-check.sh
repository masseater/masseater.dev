#!/bin/sh
set -eu

origin="https://personal-mcp.masseater.dev"

status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$@"
}

mcp="$(status -X POST -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' "$origin/mcp")"
case "$mcp" in
  2??)
    echo "$origin/mcp answered $mcp without Access" >&2
    exit 1
    ;;
esac

metadata="$(status "$origin/.well-known/oauth-protected-resource")"
if [ "$metadata" != "200" ]; then
  echo "$origin/.well-known/oauth-protected-resource answered $metadata, so MCP clients cannot find the Access OAuth server" >&2
  exit 1
fi

echo "$origin/mcp is refused without Access ($mcp) and advertises its OAuth server"
