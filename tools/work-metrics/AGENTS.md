# work-metrics

This workspace reads how work flows from the records that GitHub, Cloudflare and git already keep. It adds no store and no receiver of its own; telemetry it reads comes from files that an OpenTelemetry Collector wrote.

- `pull-requests --repo <owner/name>...` splits each merged PR's time into before the queue, CI and waiting in the queue, and counts branch updates, ejections and check reruns.
- `cloudflare` shares each billed Cloudflare meter among the Workers, D1 databases, buckets, queues and Workers AI models that used it.
- `translations --repo <owner/name>...` counts the lines changed by the commit that fixes a raw PLaMo translation, against the lines of the translated files.
- `lint --dir <dir>...` reads `traces.jsonl` and `metrics.jsonl` in each directory and adds up the time of every `<linter>.rule` span by its `<linter>.rule.id`, with the `lint.diagnostics` that msch counted. The `telemetry-<job>-<attempt>` artifacts of `verify.yml` hold such files.
- `claude --dir <dir>` reads `<session>/logs.jsonl` under the directory and sums each Claude Code session's requests, tokens, cost, API errors and tool calls.

The GitHub commands take `--days`. Every command takes `--out <dir>` and writes `<name>.json` and `<name>.md` there.

The results name private repositories, Workers and databases. Write them only to private places such as the project's files, never to this public repository or its CI logs and artifacts.

In a cloud session, run with `NODE_USE_ENV_PROXY=1` so that requests go through the session's proxy.

In cloud sessions, `.claude/hooks/session-start.sh` turns on Claude Code's OpenTelemetry export, starts a collector with `.github/actions/setup/otelcol.yaml` and `.claude/otelcol.yaml` (which also scrapes the plamo-ja llama-server), and copies the files to `/mnt/project-files/telemetry/claude-code/<session>/` at the end of every turn.
