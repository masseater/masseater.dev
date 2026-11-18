---
title: "Alchemy: インフラストラクチャの定義と、それを使用するコードを1つのTypeScriptプログラムにまとめる"
description: "AlchemyでD1バインディングを持つWorkerを定義し、Stackにないバインディングへの参照がtscで止まる例、Effectで記述したWorker、およびステートとステージの仕組みについて。"
tags: ["Alchemy", "Cloudflare", "Effect"]
published: true
---

[Terraform](https://developer.hashicorp.com/terraform) や [Pulumi](https://www.pulumi.com/) では、D1 データベースを作成する定義と、その D1 を読み込む Worker のコードは別々のファイルに存在し、両者をつないでいるのはバインディング名 `DB` だけである。`env.DB` が Worker 側に本当に存在するかどうかは、デプロイして実行してみるまで分からない。[Alchemy](https://alchemy.run/)では、定義とその用途は同じTypeScriptプログラム内に配置されており、バインディングの有無や種類はコンパイル時に確認できる[^alchemy-what-is-alchemy]。

IaCエンジン自体はTypeScriptで記述されており、プロバイダーはそのままインポートして実行される。PulumiやTerraformとは異なり、プロバイダーをGoエンジンに橋渡しするレイヤーは存在しない[^alchemy-compare]。npm上の現行バージョンは2.0.0-beta.84なので、まだベータ版である[^npm-alchemy-www-npmjs-com-package-alchemy]。

| 側面         | Alchemy                                                                                      | Pulumi, Terraform, SST, CDK                                      |
| ------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| エンジン     | TypeScript。プロバイダーはインポートされ、直接実行される                                     | プロバイダーはGoエンジンにブリッジされる                         |
| 言語         | TypeScriptと[Effect](https://effect.website/)                                                | Pulumiは複数の言語に対応しており、TerraformはHCLを使用している。 |
| テスト       | 実際のスタックをデプロイし、テストを実行して取り壊す。すべて `bun test` または Vitest から。 | 同等のものなし                                                   |
| 権限         | コードが使用するバインディングに由来する                                                     | SSTはリンクを付与するが、PulumiやTerraformはそれらを強制しない。 |
| 手元での実行 | `alchemy dev` によるエミュレーション                                                         | なし                                                             |

ソースは公式の比較ページ[^alchemy-compare]だ。

## スタックの記述

プログラムは `alchemy.run.ts` の `Stack` から開始する。名前、プロバイダーとステートの設定、そして `Effect.gen` で記述したボディを渡し、ボディ内に `yield*`[^alchemy-getting-started] でリソースを作成する。ここでは、D1データベースと、それをバインディングとして受け取るWorkerを定義する。

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

`migrations` で指定されたディレクトリ内のSQLは、デプロイごとに番号順に適用され、既に適用済みのファイルはスキップされる[^alchemy-cloudflare-d1]。Stackの本体が返すオブジェクトが出力として扱われ、CLIではデプロイ[^alchemy-getting-started]の後にそれが表示される。

## Workerはenvの型を受け取る

`InferEnv<typeof api>` は、`env: { DB }` に渡される各リソースをそのランタイム型にマッピングする型である。D1データベースは`D1Database`になり、R2バケットは`R2Bucket`になる[^alchemy-cloudflare-workers]。Workerのコードはこの型の `env` を受け取る。

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

KV名前空間 `CACHE` はスタックにバインドされていない。この状態での型チェックは、デプロイ前に停止する。

```text
$ tsc
worker.ts(6,30): error TS2339: Property 'CACHE' does not exist on type '{ readonly DB: D1Database; }'.
```

`env` の型は `{ readonly DB: D1Database }` のみであり、Stack に記述されていないバインディングは存在しないものとして扱われる。Worker側で `env.CACHE` を使いたいなら、Stack側で `KV.Namespace` を追加して `env` に渡すしかなく、定義と用途が乖離しないようにする。

## Effectで記述すれば、バインディングはレイヤーになる

上記の `async fetch` 以外にも、Worker 自体を Effect で記述し、`yield*` でバインディングを受け取るスタイルもある。

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

`ReadWriteBucket(Uploads)` は、「この Worker は Uploads を読み書きする」という契約だ。`ReadWriteBucketBinding` レイヤーは、そのコントラクトを Cloudflare バインディングとして実装している[^alchemy-what-is-alchemy]。コントラクトと実装が分離されているため、ハンドラを変更することなく、Layerを入れ替えるだけでハンドラを別のストレージに向けられる。`ReadBucket` に切り替えると、クライアントの型[^alchemy-cloudflare-workers]から書き込みメソッドが消える。

```text
$ tsc
worker.ts(6,17): error TS2339: Property 'put' does not exist on type 'ReadBucketClient'.
```

AWSでは、同じ仕組みで1つのリソースのみを対象とするバインディングごとにIAMステートメントを生成するため、ポリシーを手書きする必要がない[^alchemy-what-is-alchemy]。Worker専用のLayerをLambda関数に渡すと、Lambda側に`WorkerEnvironment`[^alchemy-binding]がないため型エラーになる。

## ステートとステージ

各リソースの入力、出力、ID、およびステータスは状態として保存され、次回のデプロイ時にコードとの差分を算出するために使用される。デフォルトでは `.alchemy/` ディレクトリに書き込まれるため、`.gitignore` に追加すること。チーム内で状態を共有するには、`Cloudflare.state()` を選択し、Durable Object と SQLite を使用する Worker を初回実行時に自動的に配置して状態を保持する。CIでは、`alchemy state bootstrap`[^alchemy-state-store]で事前に準備しておく。

ステージはスタックの独立したコピーであり、デプロイは常にちょうど1つのステージを対象とする。`alchemy deploy` のデフォルトは `live_$USER`、`alchemy dev` のデフォルトは `dev_$USER` で、`--stage production` のように明示的に指定することもできる。ステージが物理リソース名に含まれているため、各開発者の環境、各PR、本番環境を、互いに干渉することなく同一のプログラムから作成できる[^alchemy-stages]。

## コマンド

`alchemy deploy` はプランを表示し、確認後に適用する。認証情報は `~/.alchemy/profiles.json` のプロファイルに保存されるため、環境変数を設定する必要はない[^alchemy-getting-started]。`alchemy dev` はファイルの変更を監視して再デプロイを行い、ローカルランタイムで Worker を実行しながらクラウド上にリソースを作成する。適用に失敗しても dev は停止せず、コードを修正して保存[^alchemy-cli-dev]すれば再度デプロイされる。`alchemy destroy` はステージのリソースを削除する。

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
