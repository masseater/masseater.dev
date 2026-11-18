# work-metrics

This workspace reads how work flows from the records that GitHub, Cloudflare and git already keep. It adds no store and no receiver of its own.

- `pull-requests --repo <owner/name>...` splits each merged PR's time into before the queue, CI and waiting in the queue, and counts branch updates, ejections and check reruns.
- `cloudflare` shares each billed Cloudflare meter among the Workers, D1 databases, buckets, queues and Workers AI models that used it.
- `translations --repo <owner/name>...` counts the lines changed by the commit that fixes a raw PLaMo translation, against the lines of the translated files.

Every command takes `--days` and `--out <dir>` and writes `<name>.json` and `<name>.md` there.

The results name private repositories, Workers and databases. Write them only to private places such as the project's files, never to this public repository or its CI logs and artifacts.

In a cloud session, run with `NODE_USE_ENV_PROXY=1` so that requests go through the session's proxy.
