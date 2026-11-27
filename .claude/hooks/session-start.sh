#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if ! vp env --help >/dev/null 2>&1; then
  vp_version="$(sed -nE 's/^ +vite-plus: ([0-9.]+)$/\1/p' "$CLAUDE_PROJECT_DIR/pnpm-workspace.yaml" | head -n 1)"
  curl -fsSL https://vite.plus | VP_VERSION="$vp_version" VP_NODE_MANAGER=no bash >&2
  echo ". \"$HOME/.config/vite-plus/env\"" >>"$CLAUDE_ENV_FILE"
  . "$HOME/.config/vite-plus/env"
fi

for chrome in /opt/pw-browsers/chromium-*/chrome-linux*/chrome; do
  if [ -x "$chrome" ] && [ -z "${CHROME_PATH:-}" ]; then
    echo "export CHROME_PATH=\"$chrome\"" >>"$CLAUDE_ENV_FILE"
  fi
done

cd "$CLAUDE_PROJECT_DIR"
mapfile -t linux_packages <.github/actions/setup/linux-packages.txt
if ! dpkg -s "${linux_packages[@]}" >/dev/null 2>&1; then
  apt-get update -qq >&2
  apt-get install -y -qq "${linux_packages[@]}" >&2
fi
if ! command -v mise >/dev/null 2>&1; then
  curl -fsSL https://mise.run | MISE_VERSION=v2026.11.13 sh >&2
  export PATH="$HOME/.local/bin:$PATH"
fi
mise trust --quiet mise.toml
mise install --locked >&2
if ! grep -qs "^\[profile.dev\]" "$HOME/.cargo/config.toml"; then
  printf "[profile.dev]\ndebug = 0\n\n[profile.test]\ndebug = 0\n" >>"$HOME/.cargo/config.toml"
fi
echo "export PATH=\"$CLAUDE_PROJECT_DIR/.pnpm/rust/bin:$HOME/.local/bin:$HOME/.local/share/mise/shims:\$PATH\" DOTNET_NOLOGO=1 DOTNET_CLI_TELEMETRY_OPTOUT=1 VP_RUN_CONCURRENCY_LIMIT=1" >>"$CLAUDE_ENV_FILE"
vp env on >&2
vp install --frozen-lockfile >&2
if [ ! -d node_modules/.vite/task-cache ]; then
  repository="$(git remote get-url origin | sed -E 's#\.git$##; s#.*[/:]([^/]+/[^/]+)$#\1#')"
  artifact="$(gh api "repos/$repository/actions/artifacts?name=vp-cache.tar&per_page=5" --jq '[.artifacts[] | select((.expired | not) and .workflow_run.head_branch == "main" and .workflow_run.head_repository_id == .workflow_run.repository_id)][0].id // empty' 2>/dev/null || true)"
  if [ -n "$artifact" ]; then
    gh api "repos/$repository/actions/artifacts/$artifact/zip" | tar -x >&2 || rm -rf node_modules/.vite/task-cache
  fi
fi
if ! claude mcp get sts2 >/dev/null 2>&1; then
  claude mcp add --scope user sts2 -- node "$CLAUDE_PROJECT_DIR/tools/sts2-mcp/bin/sts2-mcp.ts" >&2
fi

settings="$HOME/.claude/settings.json"
[ -s "$settings" ] || echo "{}" >"$settings"
collector="pgrep -x otelcol >/dev/null || [ -z \"\${CLAUDE_CODE_REMOTE_SESSION_ID:-}\" ] || { export OTEL_FILES=\"\$HOME/.claude/otel/\$CLAUDE_CODE_REMOTE_SESSION_ID\"; mkdir -p \"\$OTEL_FILES\"; setsid $(mise which otelcol) --config $CLAUDE_PROJECT_DIR/.github/actions/setup/otelcol.yaml --config $CLAUDE_PROJECT_DIR/.claude/otelcol.yaml >\"\$OTEL_FILES/collector.log\" 2>&1 </dev/null & }"
keep="[ -d /mnt/project-files ] && [ -n \"\${CLAUDE_CODE_REMOTE_SESSION_ID:-}\" ] && mkdir -p /mnt/project-files/telemetry/claude-code/\$CLAUDE_CODE_REMOTE_SESSION_ID/ && cp \$HOME/.claude/otel/\$CLAUDE_CODE_REMOTE_SESSION_ID/*.jsonl /mnt/project-files/telemetry/claude-code/\$CLAUDE_CODE_REMOTE_SESSION_ID/ || true"
jq --arg start "$collector" --arg stop "$keep" '
  def own($event; $command): [.hooks[$event] // [] | .[] | select((.hooks[0].command // "") | test("otelcol|telemetry/claude-code") | not)] + [{hooks: [{type: "command", command: $command}]}];
  .env += {
    CLAUDE_CODE_ENABLE_TELEMETRY: "1",
    CLAUDE_CODE_ENHANCED_TELEMETRY_BETA: "1",
    OTEL_METRICS_EXPORTER: "otlp",
    OTEL_LOGS_EXPORTER: "otlp",
    OTEL_TRACES_EXPORTER: "otlp",
    OTEL_EXPORTER_OTLP_PROTOCOL: "http/json",
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318"
  }
  | .hooks.SessionStart = own("SessionStart"; $start)
  | .hooks.Stop = own("Stop"; $stop)
' "$settings" >"$settings.tmp" && mv "$settings.tmp" "$settings"
