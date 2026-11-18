---
title: "Elysia: サーバーの型定義をクライアントの型として使用する"
description: "「Eden Treaty」では、Elysiaのルート定義からクライアントタイプを取得し、サンプルコードとtsc出力で示している。また、バリデーションやプラグイン、Cloudflare Workersでの運用についても解説している。"
tags: ["Elysia", "TypeScript", "Bun"]
published: true
---

REST API のクライアントを書く際は、サーバーのコードから手作業でコピーするか、OpenAPI からコードを生成してレスポンスタイプを用意する。いずれにせよ、サーバーが変わった途端に古くなってしまう。[Elysia](https://elysiajs.com/)では、クライアント側でサーバーの`app`の型をインポートするだけで、コード生成なしに各ステータスのパス、パラメータ、ボディ、レスポンスの型を取得できる[^eden-overview]。

ElysiaはBun向けに設計されたバックエンドフレームワークだが、[WinterTC](https://wintertc.org/)に準拠しているため、アダプター[^elysia-at-glance]を介してNode.js、Deno、Cloudflare Workersでも動作する。

## サーバー

1人のユーザーを返すGETと、1人を作成するPOSTを定義する。

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

`t` は Elysia に同梱されている [TypeBox](https://github.com/sinclairzx81/typebox) で、ここで記述したスキーマは実行時のバリデーションと、ハンドラ内での `params.id` や `body.name` の型付けの両方に使用される[^elysia-validation]。`:id` は URL 内の文字列だが、`t.Number()` が指定されているため、ハンドラは数値に変換された値を受け取る。`status(404, ...)` で返される値は、200とは別のレスポンスタイプとして記録される。

最後の `export type App = typeof app` は、クライアント側に渡されたすべての情報である。

## クライアント

`App` 型を [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html) に渡す。

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

`api.api.users({ id: 1 }).get()` は、パス `/api/users/:id` をプロパティの連鎖に直接マッピングする呼び出しであり、`{ data, error }`[^eden-overview] のペアを返す。`error` が存在するブランチでは `error.status` が `404` に、`error.value` が `{ message: string }` に絞り込まれ、`data` ブランチでは 200 スキーマの型が適用される。

存在しないプロパティへの参照とbodyキーの型ミスは、いずれもコンパイル時に検出される。

```text
$ tsc
client.ts(12,20): error TS2339: Property 'email' does not exist on type '{ id: number; name: string; }'.
client.ts(15,28): error TS2353: Object literal may only specify known properties, and 'nmae' does not exist in type '{ name: string; }'.
```

サーバー側の `response` スキーマに `email` を追加すると、クライアントを変更することなく最初のエラーが消える。

## HTTPを介さない呼び出し

URLの代わりに Elysia インスタンスを `treaty` に渡すこともできる。このケースでは fetch は使用されず、内部で直接 `app.handle(request)` が呼び出されている。テストはサーバーを起動する必要がなくなり、SSR時にサーバー自身のAPIを呼び出してもHTTPラウンドトリップが発生しない。

```ts
import { app } from "./server";

const api = treaty(app);
const created = await api.api.users.post({ name: "bob" });
console.log(created.data); // { id: 2, name: "bob" }

const invalid = await api.api.users.post({ name: "" });
console.log(invalid.status, invalid.error?.value);
```

`minLength: 1` に違反するリクエストには 422 が返される。これには、どのプロパティが何に違反したかが含まれる。

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

## TypeBox以外のバリデータ

Elysiaは[Standard Schema](https://standardschema.dev/)に対応しているため、`t`の代わりに`body`と`params`でZod、Valibot、Effect Schema、またはArkTypeスキーマを直接指定できる。単一のルートの `body` と `query` で異なるライブラリを混在させることさえできる[^elysia-1-4-supersymmetry]。JSON Schema を出力できないバリデータには、TypeScript の型から OpenAPI スキーマを生成するパスがある[^elysia-1-4-supersymmetry]。

## プラグイン

ルートのグループは個別の `Elysia` インスタンスとして定義され、`.use()` で親に組み込まれる。プラグインのルートは親の型にマージされているので、単一ルートから `App` 型をエクスポートすれば十分だ。ライフサイクルフック（`onBeforeHandle` など）はデフォルトで自身のインスタンスに限定されており、`scoped` を指定すると親に拡張され、`global` を指定するとすべてに拡張される[^elysia-plugin]。

```ts
const todos = new Elysia({ prefix: "/todos" }).get("/", () => [...]);
const app = new Elysia().use(todos);
```

## Cloudflare Workersで動作中

`elysia/adapter/cloudflare-worker` から `CloudflareAdapter` を指定する。AoTのコンパイルはそのまま動作する[^elysia-integration-with-cloudflare-worker]。

```ts
import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

export default new Elysia({ adapter: CloudflareAdapter })
  .get("/", () => "Hello Cloudflare Worker!")
  .compile();
```

ワーカーには `fs` がないため、`Elysia.file`、Static プラグイン、および OpenAPI Type Gen は利用できない。起動前に Response を作成する `.get('/', 'Hello')` のようなインライン値もエラーの原因となる[^elysia-integration-with-cloudflare-worker]。このアダプターは実験的なものとして扱われる[^elysia-integration-with-cloudflare-worker]。

[^eden-overview]: Eden - Overview. https://elysiajs.com/eden/overview.html

[^elysia-at-glance]: Elysia - At glance. https://elysiajs.com/at-glance.html

[^elysia-1-4-supersymmetry]: Elysia 1.4 - Supersymmetry. https://elysiajs.com/blog/elysia-14

[^elysia-validation]: Elysia - Validation. https://elysiajs.com/essential/validation.html

[^elysia-plugin]: Elysia - Plugin. https://elysiajs.com/essential/plugin.html

[^elysia-integration-with-cloudflare-worker]: Elysia - Integration with Cloudflare Worker. https://elysiajs.com/integrations/cloudflare-worker
