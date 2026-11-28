# lapse

This workspace is a Vite plugin, `lapse()`, that turns on Vitest's `experimental.openTelemetry` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. CI sets it beside the Collector that setup starts, and `lap` sets it for the commands it runs, so the spans of test files, imports and tests land in the same files as the rest of the measurement. Without the variable the plugin changes nothing and tests run at full speed.

Measured on apps/portfolio (2026-11-28, five interleaved runs each): 16.7 s without spans, 18.6 s with them, about 11% slower, and one run writes about 4,000 spans (2.9 MB). That is why spans are on only where a Collector listens.

Every workspace that runs Vitest lists `lapse()` in its `plugins` and `lapse` in its `devDependencies`. Vitest loads `src/app/sdk.config.ts` straight through Node, which strips the types, so keep that file free of anything Node cannot run as is.
