# @r_masseater/h56m

This workspace is a secret scanner. The core is written in Rust (`native/core`) and called from TypeScript through the napi addon (`native/node`). Settings go in the `h56m` key of vite.config.ts.

- The matching engine in `native/core` follows the semantics of Betterleaks: the rule tests of Betterleaks pass against it, and its findings on encoded text match Betterleaks. Keep it that way when changing the scanner, the expression functions, the search windows or the decoders. Do not add rules here.
- Update `THIRD-PARTY-NOTICES.txt` by hand when code or data from another project comes in.
- The engine has no rules of its own. Do not add rules or default settings here; add them to `@r_masseater/h56m-presets`.
- Do not add live validation that sends secrets to services.
- Do not write real secrets, even in tests. Build test tokens by joining parts so that no source holds the whole value.
- Add trace spans to the Rust code. When `OTEL_EXPORTER_OTLP_ENDPOINT` is set, the spans are sent under the caller's trace.
- `vp run native` builds the addon. The tests depend on this task.
- `src/app/fixtures/` holds every scan made by the Go tests of Betterleaks, recorded from the commit that `@r_masseater/h56m-presets` pins, with the findings Betterleaks returned. `betterleaks-scans.test.ts` runs them against h56m. Do not edit them by hand; `src/app/fixtures/README.md` says how to record them again. When a scan stops matching, fix the engine; list it in `betterleaks-scans-known-failures.txt` with the reason only when h56m lacks the option the scan needs.
