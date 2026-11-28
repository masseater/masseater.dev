# work-metrics

This workspace reads how work flows from the records that GitHub, Cloudflare and git already keep. It adds no store and no receiver of its own; telemetry it reads comes from files that an OpenTelemetry Collector wrote.

The results name private repositories, Workers and databases. Write them only to private places such as the project's files, never to this public repository or its CI logs and artifacts.

In a cloud session, run with `NODE_USE_ENV_PROXY=1` so that requests go through the session's proxy.

`work-metrics ci --repo <owner/name> --days <n> --out <dir>` downloads the `ci.jsonl` artifact of each recent run of a workflow and prints the time per span, by kind: queued, job, step, composite action, vp task. `work-metrics spans --dir <dir>...` prints the same table for any directory that holds `traces.jsonl` or `ci.jsonl` from an OpenTelemetry Collector: a CI job's telemetry artifact, a local hook run or a desktop app's log folder.
