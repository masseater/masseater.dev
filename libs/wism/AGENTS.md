# @r_masseater/wism

This workspace is a linter for file structure and dependencies. The core is written in Rust (`native/core`) and called from TypeScript through a napi addon (`native/node`). Its settings go in `wism` in vite.config.ts.

- Put rule logic in `native/core/src/features`, apart from file listing, settings and diagnostic output, so that only the rules need to move when switching to an engine shared with other linters.
- Give Rust code tracing spans. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans go under the caller's trace.
- Build the addon with `vp run native`. The tests depend on that task.
