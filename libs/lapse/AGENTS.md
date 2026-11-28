# lapse

This workspace is a Vite plugin, `lapse()`, that turns on Vitest's `experimental.openTelemetry` when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. CI sets it beside the Collector that setup starts, and `lap` sets it for the commands it runs, so the spans of test files, imports and tests land in the same files as the rest of the measurement. Without the variable the plugin changes nothing and tests run at full speed.

Measured on apps/portfolio (2026-11-28, five interleaved runs each): 16.7 s without spans, 18.6 s with them, about 11% slower, and one run writes about 4,000 spans (2.9 MB). That is why spans are on only where a Collector listens.

Every workspace that runs Vitest lists `lapse()` in its `plugins` and `lapse` in its `devDependencies`. Vitest loads `src/app/sdk.config.ts` straight through Node, which strips the types, so keep that file free of anything Node cannot run as is.

Vite Task passes only a fixed list of variables to a cached task, so a task that runs through `vp run` loses the endpoint and writes no spans, while `vp test run` by hand writes them. A package that defines its own `test` task sets `cache: { ...LOCKED, untrackedEnv: OTEL_ENV }`, and the root config wraps msch's `test` task in `withOtelEnv`. The root also lists `lapse()`, because its `vp test run` collects the packages as projects that do not inherit their plugins; most packages have no `test` task of their own, so the root run is what covers them. A session that exports a `TRACEPARENT` with the sampled flag off makes Vitest drop its spans, so unset it when measuring by hand.
