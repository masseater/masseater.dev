---
title: "Elysia: using the server's type definitions as the client's types"
description: "How Eden Treaty gives you client types from Elysia's route definitions, shown with sample code and tsc output. It also covers validation, plugins and running on Cloudflare Workers."
tags: ["Elysia", "TypeScript", "Bun"]
published: true
---

When you write a client for a REST API, you prepare the response types either by copying them by hand from the server's code or by generating code from OpenAPI. Either way, they become stale the moment the server changes. In [Elysia](https://elysiajs.com/), just importing the type of the server's `app` on the client side gives you the types of paths, parameters, bodies and responses for each status, without code generation[^eden-overview].

Elysia is a backend framework designed for Bun, but because it conforms to [WinterTC](https://wintertc.org/), it also runs on Node.js, Deno and Cloudflare Workers through adapters[^elysia-at-glance].

## The server

We define a GET that returns one user and a POST that creates one.

```ts
// server.ts
import { Elysia, t } from "elysia";

const users = new Map<number, { id: number; name: string }>([[1, { id: 1, name: "alice" }]]);

export const app = new Elysia({ prefix: "/api" })
  .get(
    "/users/:id",
    ({ params, status }) => {
      const user = users.get(params.id);
      if (!user) return status(404, { message: "not found" });
      return user;
    },
    {
      params: t.Object({ id: t.Number() }),
      response: {
        200: t.Object({ id: t.Number(), name: t.String() }),
        404: t.Object({ message: t.String() }),
      },
    },
  )
  .post(
    "/users",
    ({ body }) => {
      const id = users.size + 1;
      const user = { id, ...body };
      users.set(id, user);
      return user;
    },
    {
      body: t.Object({ name: t.String({ minLength: 1 }) }),
    },
  );

export type App = typeof app;
```

`t` is [TypeBox](https://github.com/sinclairzx81/typebox), bundled with Elysia, and the schemas written here are used both for validation at run time and for typing `params.id` and `body.name` inside the handlers[^elysia-validation]. `:id` is a string in the URL, but because `t.Number()` is specified, the handler receives the value converted to a number. A value returned with `status(404, ...)` is recorded as a response type separate from 200.

The final `export type App = typeof app` is all the information passed to the client side.

## The client

Pass the `App` type to [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html).

```ts
// client.ts
import { treaty } from "@elysiajs/eden";

import type { App } from "./server";

const api = treaty<App>("localhost:3000");

const { data, error } = await api.api.users({ id: 1 }).get();
if (error) {
  console.log(error.status, error.value.message); // 404 のときだけここに来る
} else {
  console.log(data.id, data.name);
}

await api.api.users.post({ name: "bob" });
```

`api.api.users({ id: 1 }).get()` is a call that maps the path `/api/users/:id` directly onto a chain of properties, and it returns a pair of `{ data, error }`[^eden-overview]. In the branch where `error` exists, `error.status` is narrowed to `404` and `error.value` to `{ message: string }`, and in the `data` branch the type of the 200 schema applies.

References to properties that do not exist and typos in body keys are both caught at compile time.

```text
$ tsc
client.ts(12,20): error TS2339: Property 'email' does not exist on type '{ id: number; name: string; }'.
client.ts(15,28): error TS2353: Object literal may only specify known properties, and 'nmae' does not exist in type '{ name: string; }'.
```

If you add `email` to the `response` schema on the server side, the first error disappears without changing the client.

## Calling without going through HTTP

You can also pass an Elysia instance to `treaty` instead of a URL. In this case fetch is not used, and `app.handle(request)` is called directly inside. Tests no longer need to start a server, and calling the server's own API during SSR does not cause an HTTP round trip.

```ts
import { app } from "./server";

const api = treaty(app);
const created = await api.api.users.post({ name: "bob" });
console.log(created.data); // { id: 2, name: "bob" }

const invalid = await api.api.users.post({ name: "" });
console.log(invalid.status, invalid.error?.value);
```

A request that violates `minLength: 1` gets a 422, which includes which property violated what.

```text
422 {
  type: "validation",
  on: "body",
  property: "/name",
  message: "Expected string length greater or equal to 1",
  expected: { name: " " },
  found: { name: "" },
  ...
}
```

## Validators other than TypeBox

Because Elysia supports [Standard Schema](https://standardschema.dev/), you can specify Zod, Valibot, Effect Schema or ArkType schemas directly in `body` and `params` instead of `t`. You can even mix different libraries in the `body` and `query` of a single route[^elysia-1-4-supersymmetry]. For validators that cannot output JSON Schema, there is a path that generates the OpenAPI schema from TypeScript types[^elysia-1-4-supersymmetry].

## Plugins

A group of routes is defined as a separate `Elysia` instance and brought into the parent with `.use()`. The plugin's routes are merged into the parent's type, so exporting the `App` type from the single root is enough. Lifecycle hooks (such as `onBeforeHandle`) are confined to their own instance by default; specifying `scoped` extends them to the parent, and specifying `global` extends them to everything[^elysia-plugin].

```ts
const todos = new Elysia({ prefix: "/todos" }).get("/", () => [...]);
const app = new Elysia().use(todos);
```

## Running on Cloudflare Workers

Specify `CloudflareAdapter` from `elysia/adapter/cloudflare-worker`. AoT compilation works as it is[^elysia-integration-with-cloudflare-worker].

```ts
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", () => "Hello Cloudflare Worker!")
  .compile();
```

Workers have no `fs`, so `Elysia.file`, the Static plugin and OpenAPI Type Gen cannot be used. Inline values such as `.get('/', 'Hello')`, which create a Response before startup, also cause errors[^elysia-integration-with-cloudflare-worker]. This adapter is treated as experimental[^elysia-integration-with-cloudflare-worker].

[^eden-overview]: Eden - Overview. https://elysiajs.com/eden/overview.html

[^elysia-at-glance]: Elysia - At glance. https://elysiajs.com/at-glance.html

[^elysia-1-4-supersymmetry]: Elysia 1.4 - Supersymmetry. https://elysiajs.com/blog/elysia-14

[^elysia-validation]: Elysia - Validation. https://elysiajs.com/essential/validation.html

[^elysia-plugin]: Elysia - Plugin. https://elysiajs.com/essential/plugin.html

[^elysia-integration-with-cloudflare-worker]: Elysia - Integration with Cloudflare Worker. https://elysiajs.com/integrations/cloudflare-worker
