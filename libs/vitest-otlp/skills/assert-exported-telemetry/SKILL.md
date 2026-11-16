---
name: assert-exported-telemetry
description: >
  Use when a Vitest test must prove which OpenTelemetry spans, logs or metrics the code under test
  really exported: the otlp() plugin, waitForSpans, waitForLogs, waitForMetrics, clearTelemetry,
  the semconv check with Weaver, and tailWorker for Cloudflare Workers under Miniflare.
metadata:
  type: core
  library: "@r_masseater/vitest-otlp"
  library_version: 0.2.0
sources:
  - src/app/**
  - src/features/receive-otlp/**
  - README.md
---

# assert-exported-telemetry

`otlp()` starts an OTLP receiver in every Vitest worker and points the `OTEL_*` variables at it. A test then waits for the telemetry that actually left the process, instead of mocking the exporter. Use it to show that auto-instrumentation, `OTEL_*` settings and attribute names work end to end.

## Setup

```sh
vp add -D @r_masseater/vitest-otlp effect
```

```ts
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp()],
});
```

The plugin adds a setup file. Before the tests run it sets these variables:

| Variable                                                    | Value                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                               | The receiver's HTTP endpoint, or its gRPC endpoint when `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT`         | Emptied so the shared endpoint wins                                                        |
| `OTEL_{TRACES,METRICS,LOGS}_EXPORTER`                       | `otlp`                                                                                     |
| `OTEL_BSP_SCHEDULE_DELAY`, `OTEL_BLRP_SCHEDULE_DELAY`       | `50`, unless already set                                                                   |
| `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_METRIC_EXPORT_TIMEOUT` | `100`, unless already set                                                                  |

Start the SDK inside the test, after the setup file has run, so it reads these values.

## Waiting for telemetry

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { clearTelemetry, waitForSpans } from "@r_masseater/vitest-otlp";
import { Effect } from "effect";
import { beforeEach, expect, test } from "vite-plus/test";

declare const checkout: Effect.Effect<void>;

beforeEach(() => Effect.runPromise(clearTelemetry));

test("checkout is traced", () =>
  Effect.gen(function* () {
    const sdk = new NodeSDK();
    sdk.start();
    yield* checkout;
    yield* Effect.promise(() => sdk.shutdown());

    const spans = yield* waitForSpans({ where: (span) => span.name === "checkout" });
    expect(spans).toMatchObject([{ attributes: { "order.id": "o-1" } }]);
  }).pipe(Effect.runPromise));
```

`waitForSpans`, `waitForLogs` and `waitForMetrics` poll the receiver and succeed with every matching item once enough have arrived. They take these options:

| Option     | Default    | Meaning                                                              |
| ---------- | ---------- | -------------------------------------------------------------------- |
| `where`    | every item | Predicate on `ReceivedSpan`, `ReceivedLogRecord` or `ReceivedMetric` |
| `count`    | `1`        | How many matching items must arrive                                  |
| `timeout`  | 5 seconds  | `Duration` before failing with `TelemetryNotReceived`                |
| `interval` | 20 ms      | `Duration` between polls                                             |

`receivedSpans`, `receivedLogs` and `receivedMetrics` return what has arrived so far without waiting. `receiverAddress` gives the HTTP and gRPC endpoints. All of them fail with `ReceiverNotRunning` when the plugin is not configured.

## Semantic conventions

`otlp({ semconv: true })` also runs OpenTelemetry Weaver against everything received and fails the run on violations of the semantic conventions. Pass an object to change `registry`, the `weaver` binary or `failOn` (`violation`, `improvement` or `information`). Weaver must be on `PATH` unless `weaver` names it.

## Cloudflare Workers

`tailWorker()` from `@r_masseater/vitest-otlp/workers` bundles a tail worker that forwards a Worker's traces and logs to the receiver. Add it to Miniflare's `workers` and list its name in the traced Worker's `streamingTails`.

```ts
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { tailWorker } from "@r_masseater/vitest-otlp/workers";
import { Effect } from "effect";
import { Miniflare } from "miniflare";
import { test } from "vite-plus/test";

test("caching writes to KV", () =>
  Effect.gen(function* () {
    const tail = yield* tailWorker({ serviceName: "app" });
    const miniflare = new Miniflare({
      workers: [
        {
          name: "app",
          scriptPath: "worker.js",
          kvNamespaces: ["CACHE"],
          streamingTails: [tail.name],
        },
        tail,
      ],
    });
    yield* Effect.promise(() => miniflare.dispatchFetch("http://localhost/"));
    yield* waitForSpans({ where: (span) => span.name === "kv_put" });
    yield* Effect.promise(() => miniflare.dispose());
  }).pipe(Effect.runPromise));
```

`tailWorker` takes `name` (default `vitest-otlp-tail`), `compatibilityDate` and `serviceName` (default `worker`). It fails with `TailWorkerBuildFailed` when bundling fails.

## Common mistakes

- Starting the OpenTelemetry SDK at module top level in a file that is imported before the setup file runs. The SDK then keeps the old endpoint.
- Asserting right after the code runs without `waitFor*`. Batch processors export later, so read through `waitFor*` or shut the SDK down first.
- Sharing received telemetry between tests. Call `clearTelemetry` in `beforeEach` when tests check counts.
- Mocking the exporter instead. That proves nothing about what leaves the process.
