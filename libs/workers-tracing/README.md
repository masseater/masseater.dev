# @r_masseater/workers-tracing

Cloudflare Workers already traces each request on its own. It records a span for
every call to D1, KV, R2, Durable Objects and `fetch`. What it cannot see is
your code. It does not know which route ran or which server function was called,
nor which step of an Effect program took the time. This package puts those steps
into the same trace, nested above the platform's spans.

```text
GET (736 ms)                         ← Cloudflare: the request
  GET / (362 ms)                     ← TanStack Start: the page
    serverFn getInvite (361 ms)      ← TanStack Start: a server function
      invite.load (360 ms)           ← Effect.withSpan / Effect.fn
        d1_all (361 ms)              ← Cloudflare: the D1 query
```

## Requirements

- A Workers Paid plan, because traces are only kept there
- [Effect](https://effect.website) 4
- [Alchemy](https://alchemy.run) 2, [TanStack Start](https://tanstack.com/start) 1 or [Elysia](https://elysiajs.com) 1, for the parts you use
- Node.js 26 or later

```sh
vp add @r_masseater/workers-tracing
```

## Setup

Turn on logs, traces and Workers Issues for every Worker of an Alchemy stack.

```ts
import { providers, state } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack } from "alchemy";

export default Stack(
  "my-app",
  { providers: withWorkersTracing()(providers()), state: state() },
  app,
);
```

Trace each request and server function of TanStack Start in `src/start.ts`.

```ts
import { requestSpan, serverFnSpan } from "@r_masseater/workers-tracing/tanstack-start";
import { createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [requestSpan],
  functionMiddleware: [serverFnSpan],
}));
```

Run every Effect through the package, so that each `Effect.withSpan` and `Effect.fn` becomes a span of the request.

```ts
import { run, runner } from "@r_masseater/workers-tracing/effect";

await run(loadInvite(id));

const runWithDb = runner(DatabaseLive);
await runWithDb(saveItem(item));
```

To check in CI that the spans arrive, deploy `traceSink` once per account as its own stack. Then name its destination in `withWorkersTracing`.

```ts
export default Stack("trace-sink", { providers: providers(), state: state() }, traceSink());
```

```ts
withWorkersTracing({ destinations: ["workers-tracing"] })(providers());
```

## License

MIT
