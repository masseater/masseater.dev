# watashi-mcp

This workspace is the MCP server `watashi.masseater.dev/mcp`. It holds the owner's personal data: life records, AI agents' work notes and the household ledger.

Do not write life records from work notes. The reverse is fine; keep the grounds in `evidence`. Tools for what the owner makes and publishes go in sundries, not here.

The ledger tables (`ledger_*`) take bank and card CSVs as the source of truth, so writes keep no revisions. They are therefore exempt from the lint rule that limits writes to `*-writer.server.ts`. The data shape is based on team-mirai/marumie (AGPL-3.0).

- Searched tables have a `search_key` column that SQLite triggers in the migrations keep up to date (see `@masseater.dev/like-pattern`). When a searched column changes, recreate its triggers in a new migration.
