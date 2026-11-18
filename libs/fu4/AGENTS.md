# @r_masseater/fu4

This workspace is the engine of a GitHub Actions linter. Rust (`native/core`) parses YAML and run scripts and encodes the trees into one buffer; TypeScript reads that buffer without copying it and runs the rules that configs load as plugins. Its settings go in `fu4` in vite.config.ts. Build the addon with `vp run native`; the tests depend on that task.

The engine ships no rules. The official rules live in `libs/fu4-presets`. Keep rule logic there and keep only parsing, the rule API and running rules here. Give Rust code tracing spans. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans go under the caller's trace.
