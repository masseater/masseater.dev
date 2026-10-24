---
title: "Alchemy: インフラの定義とそれを使うコードを 1 つの TypeScript にまとめる"
description: "Alchemy で D1 を binding した Worker を定義し、Stack に無い binding を参照すると tsc で止まる例、Effect で書く Worker、state と stage の仕組み。"
tags: ["Alchemy", "Cloudflare", "Effect"]
published: true
---

[Terraform](https://developer.hashicorp.com/terraform) や [Pulumi](https://www.pulumi.com/) では、D1 のデータベースを作る定義と、その D1 を読む Worker のコードが別のファイルにあり、両者をつなぐのは `DB` という binding の名前だけになる。Worker 側の `env.DB` が本当に存在するかは、デプロイして動かすまで分からない。[Alchemy](https://alchemy.run/) では、定義と利用を同じ TypeScript のプログラムに置き、binding の有無と型をコンパイル時に検査できる[^alchemy-what-is-alchemy]。

IaC のエンジン自体が TypeScript で書かれていて、プロバイダーは import してそのまま実行される。Pulumi や Terraform のように、Go のエンジンにプロバイダーをブリッジする層がない[^alchemy-compare]。npm の現行版は 2.0.0-beta.84 で、ベータの段階にある[^npm-alchemy-www-npmjs-com-package-alchemy]。

| 観点         | Alchemy                                                                            | Pulumi、Terraform、SST、CDK                          |
| ------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| エンジン     | TypeScript。プロバイダーを import して直接実行                                     | Go のエンジンにプロバイダーをブリッジ                |
| 言語         | TypeScript と [Effect](https://effect.website/)                                    | Pulumi は複数言語、Terraform は HCL                  |
| テスト       | 実際のスタックをデプロイし、テストを流し、壊すまでを `bun test` や Vitest から実行 | 同等のものなし                                       |
| 権限         | コードが使う binding から導出                                                      | SST は link で付与、Pulumi と Terraform は強制しない |
| 手元での実行 | `alchemy dev` でエミュレーション                                                   | なし                                                 |

出典は公式の比較ページである[^alchemy-compare]。

## Stack を書く

プログラムは `alchemy.run.ts` の `Stack` から始まる。名前、プロバイダーと state の設定、`Effect.gen` で書いた本体を渡し、本体の中でリソースを `yield*` で作成する[^alchemy-getting-started]。D1 と、それを binding として受ける Worker を定義する。

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

`migrations` で指定したディレクトリの SQL は、デプロイのたびに番号順で適用され、適用済みのものは飛ばされる[^alchemy-cloudflare-d1]。Stack の本体が返したオブジェクトは出力として扱われ、デプロイ後に CLI が表示する[^alchemy-getting-started]。

## Worker 側は env の型を受け取る

`InferEnv<typeof api>` は、`env: { DB }` に渡したリソースを、それぞれの runtime の型に対応させた型である。D1 のデータベースは `D1Database` に、R2 のバケットは `R2Bucket` になる[^alchemy-cloudflare-workers]。Worker のコードはこの型で `env` を受け取る。

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

`CACHE` という KV は Stack で binding されていない。この状態で型検査すると、デプロイの前に止まる。

```text
$ tsc
worker.ts(6,30): error TS2339: Property 'CACHE' does not exist on type '{ readonly DB: D1Database; }'.
```

`env` の型は `{ readonly DB: D1Database }` だけで構成され、Stack に書かれていない binding は存在しない扱いになる。Worker 側で `env.CACHE` を使いたければ、Stack 側へ `KV.Namespace` を追加して `env` へ渡すしかなく、定義と利用の食い違いが起きない。

## Effect で書くと binding が Layer になる

上の `async fetch` のほかに、Worker 本体を Effect で書き、binding を `yield*` で受け取る形式もある。

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

`ReadWriteBucket(Uploads)` は「この Worker は Uploads を読み書きする」という契約である。`ReadWriteBucketBinding` の Layer が、その契約を Cloudflare の binding として実装する[^alchemy-what-is-alchemy]。契約と実装が分かれているため、ハンドラはそのままで、Layer の差し替えだけで別のストレージへ向けられる。`ReadBucket` に替えると、クライアントの型から書き込みのメソッドがなくなる[^alchemy-cloudflare-workers]。

```text
$ tsc
worker.ts(6,17): error TS2339: Property 'put' does not exist on type 'ReadBucketClient'.
```

AWS では、同じ仕組みで binding ごとに 1 リソースだけを対象にした IAM の statement が生成されるので、ポリシーを手で書く必要がない[^alchemy-what-is-alchemy]。Worker 専用の Layer を Lambda の Function に provide すると、Lambda 側に `WorkerEnvironment` がないため型エラーになる[^alchemy-binding]。

## state と stage

リソースごとの入力、出力、ID、状態は state として保存され、次のデプロイでコードとの差分の計算に使われる。既定では `.alchemy/` ディレクトリに書かれるので、`.gitignore` に入れる。チームで共有する場合は `Cloudflare.state()` を選ぶと、Durable Object と SQLite を使う Worker が state の置き場として初回に自動でデプロイされる。CI では `alchemy state bootstrap` で先に用意する[^alchemy-state-store]。

stage はスタックの独立したコピーで、デプロイは必ず 1 つの stage に対して行われる。`alchemy deploy` の既定は `live_$USER`、`alchemy dev` の既定は `dev_$USER` で、`--stage production` のように明示もできる。物理的なリソース名に stage が含まれるため、開発者ごと、PR ごと、本番の環境を同じプログラムから作っても互いに干渉しない[^alchemy-stages]。

## コマンド

`alchemy deploy` では、計画が表示され、確認の後に適用される。認証情報は `~/.alchemy/profiles.json` のプロファイルに保存され、環境変数の設定は要らない[^alchemy-getting-started]。`alchemy dev` ではファイルの変更が監視されて再デプロイされ、リソースはクラウドに作られつつ Worker は手元の runtime で動く。適用に失敗しても dev は止まらず、修正して保存すれば再度デプロイされる[^alchemy-cli-dev]。`alchemy destroy` で stage のリソースを削除する。

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
