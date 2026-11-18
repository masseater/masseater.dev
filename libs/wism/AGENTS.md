# @r_masseater/wism

This workspace is the engine of a linter for file structure and dependencies. The Rust core (`native/core`) only reads the tracked files and resolves their imports, `use` paths and Markdown links into one graph, which the napi addon (`native/node`) hands to TypeScript as one `Uint32Array` without copying. Every rule is TypeScript and lives in a plugin package such as `@r_masseater/wism-presets`. Its settings go in `wism` in vite.config.ts.

- Keep rules out of this workspace. Move work into Rust only where OTel spans show the TypeScript side is too slow.
- Give Rust code tracing spans. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans go under the caller's trace.
- Build the addon with `vp run native`. The tests depend on that task.
