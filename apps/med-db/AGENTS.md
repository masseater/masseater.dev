# med-db

This workspace is `med-db.masseater.dev`, a database of which songs and videos were used in Niconico medleys and collaborations.

The web pages are read-only. Data is written only through the remote MCP at `/mcp` with the owner's passkey. Read production logs by running the `worker-logs` task in the `task` workflow.

- Searched tables have a `search_key` column that SQLite triggers in the migrations keep up to date (see `@masseater.dev/like-pattern`). When a searched column changes, recreate its triggers in a new migration.
