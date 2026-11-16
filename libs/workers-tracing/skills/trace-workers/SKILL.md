---
name: trace-workers
description: >
  Use when adding application spans to Cloudflare Workers traces with @r_masseater/workers-tracing:
  withWorkersTracing for Alchemy stacks, TanStack Start and Elysia middleware, running Effect
  programs so withSpan and fn become spans, browser spans, runWorkersAi, traceSink and the
  workers-traces CLI that checks spans in CI.
metadata:
  type: core
  library: "@r_masseater/workers-tracing"
  library_version: 0.4.0
sources:
  - src/app/**
  - src/features/sink-traces/**
  - bin/**
  - README.md
---

# trace-workers

Cloudflare Workers traces each request and every binding call (D1, KV, R2, Durable Objects, `fetch`) by itself. This package nests the application's own steps above those spans in the same trace: the route, the server function and each `Effect.withSpan` or `Effect.fn`. Traces are kept only on the Workers Paid plan.

## Entries

| Entry              | Use                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `./alchemy`        | `withWorkersTracing` turns on logs, traces and Workers Issues for every Worker of a stack. `traceSink` deploys the sink the CLI reads |
| `./tanstack-start` | `requestSpan` and `serverFnSpan` middleware                                                                                           |
| `./elysia`         | Drop-in `Elysia` whose requests and routes become spans, and `routeHandlers` for mounting it in a file route                          |
| `./effect`         | `run`, `runner` and `layer`, which send Effect spans and logs into the Workers trace                                                  |
| `./browser-spans`  | `browserSpans({ service })`, a handler that accepts OTLP JSON spans from the browser                                                  |
| `./workers-ai`     | `runWorkersAi`, which retries out-of-capacity errors and records `gen_ai.*` attributes                                                |
| `./oxlint`         | `restrictedSyntax`, which bans `env.AI.run` outside `runWorkersAi`                                                                    |

On Node.js and in the browser, `./effect`, `./tanstack-start` and `./elysia` resolve to pass-through versions, so the same imports work in tests and client bundles.

## Setup

```ts no-check
import { providers, state } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack } from "alchemy";

export default Stack(
  "my-app",
  { providers: withWorkersTracing()(providers()), state: state() },
  app,
);
```

TanStack Start, in `src/start.ts`:

```ts no-check
import { requestSpan, serverFnSpan } from "@r_masseater/workers-tracing/tanstack-start";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [requestSpan],
  functionMiddleware: [serverFnSpan],
}));
```

Elysia: import `Elysia` from `@r_masseater/workers-tracing/elysia` instead of `elysia`.

## Running Effect programs

Every Effect that should appear in the trace runs through `run` or a `runner`. Running it with `Effect.runPromise` loses the Workers tracer, so its spans never reach the trace.

```ts no-check
import { run, runner } from "@r_masseater/workers-tracing/effect";

await run(loadInvite(id));

const runWithDb = runner(DatabaseLive);
await runWithDb(saveItem(item));
```

Use `layer` when another runtime must own the program, for example `ManagedRuntime.make(Layer.merge(layer, AppLive))`.

## Workers AI

```ts no-check
import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";

const answer =
  yield *
  runWorkersAi({
    operation: "chat",
    model: "@cf/cloudflare/clef-flash",
    call: () => env.AI.run("@cf/cloudflare/clef-flash", { messages }),
  });
```

It fails with `WorkersAiError` and logs a cut-off answer. Add `restrictedSyntax` from `./oxlint` to `no-restricted-syntax` so direct `env.AI.run` calls are caught.

## Checking spans in CI

Deploy `traceSink()` once per account as its own stack, then name its destination in `withWorkersTracing({ destinations: ["workers-tracing"] })`. The sink logs every received span, and `workers-traces` reads them back through the Workers Observability API.

```sh
workers-traces --request https://app.example.com/ --expect "GET /" --expect invite.load --wait 60
```

| Flag        | Default                                            | Meaning                                               |
| ----------- | -------------------------------------------------- | ----------------------------------------------------- |
| `--account` | `CLOUDFLARE_ACCOUNT_ID`                            | Cloudflare account ID                                 |
| `--sink`    | `WORKERS_TRACES_SINK`, else `workers-tracing-sink` | The traceSink Worker name                             |
| `--service` | all                                                | Show only this Worker's spans                         |
| `--minutes` | `15`                                               | How far back to look                                  |
| `--limit`   | `500`                                              | Most spans to read                                    |
| `--request` | none                                               | Send a GET first and look only at the trace it starts |
| `--expect`  | none                                               | Span name that must be present; repeatable            |
| `--wait`    | `0`                                                | Seconds to retry until every expected span arrives    |

The CLI needs a Cloudflare API token that can read Workers Observability.

## Common mistakes

- Calling `Effect.runPromise` in a Worker. The spans exist but are not attached to the request's trace.
- Adding a tracer layer from `@effect/opentelemetry` as well. Workers already exports the trace, and a second exporter duplicates spans.
- Expecting spans on the Workers Free plan. Traces are not kept there.
