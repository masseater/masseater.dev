---
title: "Alchemy: putting infrastructure definitions and the code that uses them in one TypeScript program"
description: "An example of defining a Worker with a D1 binding in Alchemy where referencing a binding that is not in the Stack stops at tsc, a Worker written with Effect, and how state and stages work."
tags: ["Alchemy", "Cloudflare", "Effect"]
published: true
---

In [Terraform](https://developer.hashicorp.com/terraform) and [Pulumi](https://www.pulumi.com/), the definition that creates a D1 database and the code of the Worker that reads that D1 live in separate files, and the only thing connecting them is the binding name `DB`. Whether `env.DB` really exists on the Worker side is not known until you deploy and run it. In [Alchemy](https://alchemy.run/), the definition and its use are placed in the same TypeScript program, and whether a binding exists and what type it has can be checked at compile time[^alchemy-what-is-alchemy].

The IaC engine itself is written in TypeScript, and providers are imported and run as they are. Unlike Pulumi and Terraform, there is no layer that bridges providers into a Go engine[^alchemy-compare]. The current version on npm is 2.0.0-beta.84, so it is still in beta[^npm-alchemy-www-npmjs-com-package-alchemy].

| Aspect          | Alchemy                                                                                  | Pulumi, Terraform, SST, CDK                                          |
| --------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Engine          | TypeScript. Providers are imported and run directly                                      | Providers are bridged into a Go engine                               |
| Language        | TypeScript and [Effect](https://effect.website/)                                         | Pulumi supports multiple languages, Terraform uses HCL               |
| Testing         | Deploying a real stack, running tests and tearing it down, all from `bun test` or Vitest | Nothing equivalent                                                   |
| Permissions     | Derived from the bindings the code uses                                                  | SST grants them with links, Pulumi and Terraform do not enforce them |
| Running locally | Emulation with `alchemy dev`                                                             | None                                                                 |

The source is the official comparison page[^alchemy-compare].

## Writing a Stack

A program starts from the `Stack` in `alchemy.run.ts`. You pass it a name, the provider and state settings, and a body written with `Effect.gen`, and create resources inside the body with `yield*`[^alchemy-getting-started]. Here we define a D1 database and a Worker that receives it as a binding.

```ts
// alchemy.run.ts
import { Stack } from "alchemy";
import { D1, Workers, providers, state } from "alchemy/Cloudflare";
import type { InferEnv } from "alchemy/Cloudflare";
import { Effect } from "effect";

const api = Effect.gen(function* () {
  const DB = yield* D1.Database("DB", { migrations: "./migrations" });
  return yield* Workers.Worker("Api", {
    main: "./worker.ts",
    env: { DB },
  });
});

export type ApiEnv = InferEnv<typeof api>;

export default Stack(
  "demo",
  { providers: providers(), state: state() },
  Effect.gen(function* () {
    const { url } = yield* api;
    return { url };
  }),
);
```

The SQL in the directory given by `migrations` is applied in numbered order on every deploy, and files that have already been applied are skipped[^alchemy-cloudflare-d1]. The object returned by the body of the Stack is treated as output, and the CLI shows it after the deploy[^alchemy-getting-started].

## The Worker receives the type of env

`InferEnv<typeof api>` is a type that maps each resource passed to `env: { DB }` to its runtime type. A D1 database becomes `D1Database`, and an R2 bucket becomes `R2Bucket`[^alchemy-cloudflare-workers]. The Worker's code receives `env` with this type.

```ts
// worker.ts
import type { ApiEnv } from "./alchemy.run";

export default {
  async fetch(_request: Request, env: ApiEnv): Promise<Response> {
    const { results } = await env.DB.prepare("SELECT id, name FROM users").all();
    const cached = await env.CACHE.get("users");
    return Response.json({ results, cached });
  },
};
```

The KV namespace `CACHE` is not bound in the Stack. Type checking in this state stops before the deploy.

```text
$ tsc
worker.ts(6,30): error TS2339: Property 'CACHE' does not exist on type '{ readonly DB: D1Database; }'.
```

The type of `env` consists only of `{ readonly DB: D1Database }`, and bindings that are not written in the Stack are treated as nonexistent. If you want to use `env.CACHE` on the Worker side, the only way is to add a `KV.Namespace` on the Stack side and pass it to `env`, so the definition and its use cannot drift apart.

## Written with Effect, bindings become Layers

Besides the `async fetch` above, there is also a style in which the Worker itself is written with Effect and receives bindings with `yield*`.

```ts
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import * as HttpServerResponse from "effect/http/HttpServerResponse";

export const Uploads = Cloudflare.R2.Bucket("Uploads");

export default Cloudflare.Worker(
  "Api",
  { main: import.meta.url },
  Effect.gen(function* () {
    const bucket = yield* Cloudflare.R2.ReadWriteBucket(Uploads);
    return {
      fetch: Effect.gen(function* () {
        const obj = yield* bucket.get("hello.txt");
        if (!obj) return HttpServerResponse.text("Not found", { status: 404 });
        return HttpServerResponse.text(yield* obj.text());
      }).pipe(
        Effect.catch(() =>
          Effect.succeed(HttpServerResponse.text("storage error", { status: 500 })),
        ),
      ),
    };
  }).pipe(Effect.provide(Cloudflare.R2.ReadWriteBucketBinding)),
);
```

`ReadWriteBucket(Uploads)` is a contract that says "this Worker reads and writes Uploads." The `ReadWriteBucketBinding` Layer implements that contract as a Cloudflare binding[^alchemy-what-is-alchemy]. Because the contract and the implementation are separate, the handler can be pointed at a different storage just by swapping the Layer, without changing the handler. If you switch to `ReadBucket`, the write methods disappear from the client's type[^alchemy-cloudflare-workers].

```text
$ tsc
worker.ts(6,17): error TS2339: Property 'put' does not exist on type 'ReadBucketClient'.
```

On AWS, the same mechanism generates an IAM statement for each binding that targets only one resource, so there is no need to write policies by hand[^alchemy-what-is-alchemy]. If you provide a Layer meant only for Workers to a Lambda Function, it becomes a type error because the Lambda side has no `WorkerEnvironment`[^alchemy-binding].

## State and stages

The input, output, ID and status of each resource are saved as state, and are used on the next deploy to compute the difference from the code. By default they are written to the `.alchemy/` directory, so add it to `.gitignore`. To share state within a team, choose `Cloudflare.state()`, and a Worker that uses a Durable Object and SQLite is deployed automatically on the first run as the place to keep state. In CI, prepare it in advance with `alchemy state bootstrap`[^alchemy-state-store].

A stage is an independent copy of the stack, and a deploy always targets exactly one stage. The default for `alchemy deploy` is `live_$USER`, the default for `alchemy dev` is `dev_$USER`, and you can also specify one explicitly, as in `--stage production`. Because the stage is included in the physical resource names, environments for each developer, each PR and production can be created from the same program without interfering with each other[^alchemy-stages].

## Commands

`alchemy deploy` shows a plan and applies it after confirmation. Credentials are saved in a profile in `~/.alchemy/profiles.json`, so no environment variables need to be set[^alchemy-getting-started]. `alchemy dev` watches for file changes and redeploys, creating resources in the cloud while running the Worker in a local runtime. Even if applying fails, dev does not stop, and it deploys again once you fix the code and save[^alchemy-cli-dev]. `alchemy destroy` deletes the resources of a stage.

[^alchemy-what-is-alchemy]: Alchemy - What is Alchemy. https://alchemy.run/what-is-alchemy

[^alchemy-compare]: Alchemy - Compare. https://alchemy.run/compare

[^npm-alchemy-www-npmjs-com-package-alchemy]: npm の alchemy パッケージ。 https://www.npmjs.com/package/alchemy

[^alchemy-getting-started]: Alchemy - Getting Started. https://alchemy.run/getting-started

[^alchemy-cloudflare-d1]: Alchemy - Cloudflare D1. https://alchemy.run/cloudflare/data/d1

[^alchemy-cloudflare-workers]: Alchemy - Cloudflare Workers. https://alchemy.run/cloudflare/compute/workers

[^alchemy-binding]: Alchemy - Binding. https://alchemy.run/infrastructure-as-effects/binding

[^alchemy-state-store]: Alchemy - State Store. https://alchemy.run/state-store

[^alchemy-stages]: Alchemy - Stages. https://alchemy.run/environments/stages

[^alchemy-cli-dev]: Alchemy CLI - dev. https://alchemy.run/cli/dev
