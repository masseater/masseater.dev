# @r_masseater/h56m

This workspace is a secret scanner. The core is written in Rust (`native/core`) and called from TypeScript through the napi addon (`native/node`). Settings go in the `h56m` key of vite.config.ts.

- Take the matching engine from kingfisher-rules and kingfisher-scanner as dependencies. Do not copy their code or rules into this workspace.
- The engine has no rules of its own. Do not add rules or default settings here; add them to `@r_masseater/h56m-presets`.
- Do not add live validation that sends secrets to services.
- Do not write real secrets, even in tests. Build test tokens by joining parts so that no source holds the whole value.
- Add trace spans to the Rust code. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans are sent under the caller's trace.
- `vp run native` builds the addon. The tests depend on this task.
