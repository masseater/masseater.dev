# @r_masseater/y8

This workspace is a Markdown linter. The core is written in Rust (`native/core`) and called from TypeScript through a napi addon (`native/node`). Its settings go in `y8` in vite.config.ts.

- Built-in rules return the same results as markdownlint's rules. `native/core/tests/fixtures/markdownlint/` holds fixtures and expected results taken from markdownlint; do not edit them by hand. Check that `cargo test -p y8-core` matches them all. `lint-calls.json` there holds every lint call that markdownlint's own test suite makes, with the errors it returned; the same tests check it, and `lint-calls-known-failures.txt` lists the calls y8 cannot run, with the reason.
- Give Rust code tracing spans. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans go under the caller's trace.
- Build the addon with `vp run native`. The tests depend on that task.
