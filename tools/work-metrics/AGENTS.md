# work-metrics

This workspace reads how work flows from the records that GitHub, Cloudflare and git already keep. It adds no store and no receiver of its own; telemetry it reads comes from files that an OpenTelemetry Collector wrote.

The results name private repositories, Workers and databases. Write them only to private places such as the project's files, never to this public repository or its CI logs and artifacts.

In a cloud session, run with `NODE_USE_ENV_PROXY=1` so that requests go through the session's proxy.
