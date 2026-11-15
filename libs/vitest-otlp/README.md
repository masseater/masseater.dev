# @r_masseater/vitest-otlp

A Vitest plugin that receives OTLP during tests. A test can then assert the
spans, metrics and logs that the code under test really exported. It shows that
auto-instrumentation and `OTEL_*` settings work. It also shows that telemetry
actually leaves the process.

It requires [Vite+](https://viteplus.dev/) and Node.js 26 or later. `effect` is a
peer dependency, so the tests and the plugin share one copy of Effect.

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

```ts
import { NodeSDK } from "@opentelemetry/sdk-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

test("checkout is traced", () =>
  Effect.gen(function* () {
    const sdk = new NodeSDK();
    sdk.start();
    yield* checkout;
    yield* Effect.promise(() => sdk.shutdown());

    const spans = yield* waitForSpans({
      where: (span) => span.name === "checkout",
    });
    expect(spans).toMatchObject([{ attributes: { "order.id": "o-1" } }]);
  }).pipe(Effect.runPromise));
```

## Cloudflare Workers

For a Worker under [Miniflare](https://developers.cloudflare.com/workers/testing/miniflare/), add the tail worker from `tailWorker()` to receive what the Worker traces and logs.

```ts
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { tailWorker } from "@r_masseater/vitest-otlp/workers";
import { Effect } from "effect";
import { Miniflare } from "miniflare";

test("caching writes to KV", () =>
  Effect.gen(function* () {
    const tail = yield* tailWorker();
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

## License

MIT
