---
title: "Elysia: サーバーの型定義をそのままクライアントの型として使う"
description: "Elysia のルート定義から Eden Treaty でクライアントの型が得られる仕組みを、サンプルコードと tsc の出力で示す。バリデーション、プラグイン、Cloudflare Workers での実行も扱う。"
tags: ["Elysia", "TypeScript", "Bun"]
published: true
---

REST API のクライアントを書くとき、レスポンスの型はサーバーのコードを見て手で写すか、OpenAPI からコード生成して用意する。どちらの方法でも、サーバーを変更した時点で古くなる。[Elysia](https://elysiajs.com/) では、サーバーの `app` の型をクライアント側に import するだけで、パス、パラメータ、ボディ、ステータスごとのレスポンスの型がコード生成なしに得られる[^eden-overview]。

Elysia は Bun 向けに設計された backend フレームワークだが、[WinterTC](https://wintertc.org/) 準拠のため Node.js、Deno、Cloudflare Workers でもアダプター経由で動作する[^elysia-at-glance]。

## サーバー

ユーザーを 1 件返す GET と、1 件作成する POST を定義する。

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

`t` は Elysia に同梱された [TypeBox](https://github.com/sinclairzx81/typebox) で、ここで書いたスキーマは実行時のバリデーションと、ハンドラ内の `params.id` や `body.name` の型付けの両方に使われる[^elysia-validation]。`:id` は URL 上では文字列だが、`t.Number()` を指定したので数値に変換された値がハンドラに届く。`status(404, ...)` で返した値は、200 とは別のレスポンス型として記録される。

最後の `export type App = typeof app` が、クライアント側に渡す情報のすべてになる。

## クライアント

[Eden Treaty](https://elysiajs.com/eden/treaty/overview.html) に `App` の型を渡す。

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

`api.api.users({ id: 1 }).get()` は、パス `/api/users/:id` をそのままプロパティのチェーンに写した呼び出しで、戻り値は `{ data, error }` の組になる[^eden-overview]。`error` がある分岐では `error.status` が `404`、`error.value` が `{ message: string }` に絞り込まれ、`data` の分岐では 200 のスキーマの型が付く。

存在しないプロパティの参照も、ボディのキーの打ち間違いも、コンパイル時に検出される。

```text
$ tsc
client.ts(12,20): error TS2339: Property 'email' does not exist on type '{ id: number; name: string; }'.
client.ts(15,28): error TS2353: Object literal may only specify known properties, and 'nmae' does not exist in type '{ name: string; }'.
```

サーバー側の `response` スキーマに `email` を追加すれば、1 つ目のエラーはクライアントを変更しなくても消える。

## HTTP を介さずに呼び出す

`treaty` には URL の代わりに Elysia のインスタンスも渡せる。この場合 fetch は使われず、内部で `app.handle(request)` が直接呼ばれる。テストでサーバーを起動する必要がなくなり、SSR 中にサーバー自身の API を呼ぶ場合も HTTP の往復が発生しない。

```ts
import { app } from "./server";

const api = treaty(app);
const created = await api.api.users.post({ name: "bob" });
console.log(created.data); // { id: 2, name: "bob" }

const invalid = await api.api.users.post({ name: "" });
console.log(invalid.status, invalid.error?.value);
```

`minLength: 1` に反したリクエストには 422 が返り、どのプロパティが何に反したかが含まれる。

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

## TypeBox 以外のバリデータ

[Standard Schema](https://standardschema.dev/) に対応しているので、`t` の代わりに Zod、Valibot、Effect Schema、ArkType のスキーマをそのまま `body` や `params` に指定できる。1 つのルートの `body` と `query` で別のライブラリを混在させることもできる[^elysia-1-4-supersymmetry]。JSON Schema を出力できないバリデータについては、TypeScript の型から OpenAPI スキーマを生成する経路が用意されている[^elysia-1-4-supersymmetry]。

## プラグイン

ルートのまとまりは別の `Elysia` インスタンスとして定義し、`.use()` で親に取り込む。親の型にはプラグイン側のルートが合成されるので、`App` の型を export するのは根の 1 箇所で足りる。ライフサイクルフック（`onBeforeHandle` など）は既定ではそのインスタンスの中に閉じていて、`scoped` を指定すると親へ、`global` を指定すると全体へ適用範囲が広がる[^elysia-plugin]。

```ts
const todos = new Elysia({ prefix: "/todos" }).get("/", () => [...]);
const app = new Elysia().use(todos);
```

## Cloudflare Workers での実行

`elysia/adapter/cloudflare-worker` の `CloudflareAdapter` を指定する。AoT コンパイルはそのまま使える[^elysia-integration-with-cloudflare-worker]。

```ts
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", () => "Hello Cloudflare Worker!")
  .compile();
```

Workers には `fs` がないため、`Elysia.file`、Static プラグイン、OpenAPI Type Gen は使えない。起動前に Response を生成する `.get('/', 'Hello')` のような inline の値もエラーになる[^elysia-integration-with-cloudflare-worker]。このアダプターは experimental の扱いである[^elysia-integration-with-cloudflare-worker]。

[^eden-overview]: Eden - Overview. https://elysiajs.com/eden/overview.html

[^elysia-at-glance]: Elysia - At glance. https://elysiajs.com/at-glance.html

[^elysia-1-4-supersymmetry]: Elysia 1.4 - Supersymmetry. https://elysiajs.com/blog/elysia-14

[^elysia-validation]: Elysia - Validation. https://elysiajs.com/essential/validation.html

[^elysia-plugin]: Elysia - Plugin. https://elysiajs.com/essential/plugin.html

[^elysia-integration-with-cloudflare-worker]: Elysia - Integration with Cloudflare Worker. https://elysiajs.com/integrations/cloudflare-worker
