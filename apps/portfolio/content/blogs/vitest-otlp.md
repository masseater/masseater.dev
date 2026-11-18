---
title: "vitest-otlp: testing the telemetry that code really exports"
description: "vitest-otlp is a Vitest plugin that runs an OTLP receiver during tests. A test waits for the spans, logs and metrics that left the process and asserts on them, and OpenTelemetry Weaver can check them against the semantic conventions."
tags: ["OpenTelemetry", "Vitest", "Vite+"]
published: true
---

[@r_masseater/vitest-otlp](https://github.com/masseater/masseater.dev/tree/main/libs/vitest-otlp) is a Vitest plugin that I wrote. It runs an OTLP receiver in every Vitest worker. A test then asserts on the spans, logs and metrics that the code under test actually sent over the network. A mocked exporter proves only that the code called the exporter. This plugin also checks the `OTEL_*` settings, auto-instrumentation and the exporter itself.

## How it works

`otlp()` adds a setup file to the Vitest configuration.

```ts
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp()],
});
```

The setup file starts a receiver that accepts OTLP over both HTTP and gRPC. It then points the standard OpenTelemetry environment variables at that receiver.

| Variable                                                    | Value                                                                                      |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                               | The receiver's HTTP endpoint, or its gRPC endpoint when `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT`         | Emptied, so that the shared endpoint wins                                                  |
| `OTEL_{TRACES,METRICS,LOGS}_EXPORTER`                       | `otlp`                                                                                     |
| `OTEL_BSP_SCHEDULE_DELAY`, `OTEL_BLRP_SCHEDULE_DELAY`       | `50`, unless already set                                                                   |
| `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_METRIC_EXPORT_TIMEOUT` | `100`, unless already set                                                                  |

The code under test needs no special exporter. An SDK that reads its configuration from the environment sends everything to the receiver. The short batch delays make the data arrive within the test.

## Waiting for telemetry

`waitForSpans`, `waitForLogs` and `waitForMetrics` poll the receiver until enough matching items have arrived. By default they wait for one item, check every 20 ms and give up after 5 seconds.

The test below starts the Node.js SDK with no options except a service name. It ends a span named `checkout` but waits for a span named `charge`.

```ts
import { trace } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

test("checkout is traced", () =>
  Effect.gen(function* () {
    const sdk = new NodeSDK({ serviceName: "shop" });
    sdk.start();
    trace.getTracer("shop").startActiveSpan("checkout", (span) => {
      span.setAttribute("order.id", "o-1");
      span.end();
    });
    yield* Effect.promise(() => sdk.shutdown());
    const spans = yield* waitForSpans({ where: (span) => span.name === "charge" });
    expect(spans).toMatchObject([{ attributes: { "order.id": "o-1" } }]);
  }).pipe(Effect.runPromise));
```

The test fails after 5 seconds. The message says that one span arrived and none of them matched.

```text
TelemetryNotReceived: Expected 1 spans within 5s, received 0 matching of 1.
```

With `span.name === "checkout"`, the same test passes. The received span also carries the resource and the instrumentation scope, so the passing test also checked `resource: { "service.name": "shop" }`.

## Semantic conventions

`otlp({ semconv: true })` also runs [OpenTelemetry Weaver](https://github.com/open-telemetry/weaver). A global setup starts `weaver registry live-check` against the semantic conventions v1.45.0, and the receiver forwards everything it gets to Weaver. When the test run ends, the plugin stops Weaver and reads its report. Any finding at or above `failOn`, which is `violation` by default, fails the run.

The test fixture of the package exports one span whose `http.response.status_code` is the string `"200"`. Weaver 0.28.0 rejects it.

```text
SemconvCheckFailed: Telemetry does not follow the semantic conventions:
  violation type_mismatch: Attribute 'http.response.status_code' has type 'string'. Type should be 'int'. (work)
```

Weaver is a separate binary. It has to be on `PATH`, or the `weaver` option has to name it.

## Cloudflare Workers

A Worker running under Miniflare does not read `OTEL_*` variables. `tailWorker()` from `@r_masseater/vitest-otlp/workers` bundles a tail worker that turns the traces and logs of a Worker into OTLP and sends them to the receiver. The test adds the tail worker to Miniflare's `workers` and lists its name in `streamingTails` of the traced Worker.

```ts
const tail = yield * tailWorker({ serviceName: "app" });
const miniflare = new Miniflare({
  workers: [
    { name: "app", scriptPath: "worker.js", kvNamespaces: ["CACHE"], streamingTails: [tail.name] },
    tail,
  ],
});
yield * Effect.promise(() => miniflare.dispatchFetch("http://localhost/"));
yield * waitForSpans({ where: (span) => span.name === "kv_put" });
```

The Workers runtime creates spans such as `kv_put` by itself. The test asserts on these spans without any instrumentation code in the Worker.
