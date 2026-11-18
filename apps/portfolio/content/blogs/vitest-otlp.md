---
title: "vitest-otlp" description: "@r_masseater/vitest-otlp は、各 Vitest テストファイルに対して OTLP レシーバーを起動し、OpenTelemetry SDK を向けることで、テストがプロセスを実際に離脱したスパン、ログ、およびメトリクスに対してアサーションを行えるようにする。レイテンシの測定およびインメモリエクスポーターとの比較を含む。" tags: ["OpenTelemetry", "Vitest", "Vite+", "Testing"] published: true
---

[@r_masseater/vitest-otlp](https://www.npmjs.com/package/@r_masseater/vitest-otlp) は、テスト中に OTLP を受け取る Vitest プラグインである。これにより、テストでは、テスト対象のコードが実際にネットワーク経由でエクスポートしたスパン、ログレコード、およびメトリクスをアサートできる。また、こうしたテストは、自動インストルメンテーションや `OTEL_*` 環境変数が機能していることも示すが、これはインメモリエクスポーターを用いたテストでは確認できない。ここで説明するバージョンは 0.2.0 であり、[Vite+](https://viteplus.dev/) および Node.js 26 以降を必要とする。

```ts
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp()],
});
```

## 各テストファイルには専用のレシーバーが割り当てられる。

このプラグインは、テストファイルごとに1回実行されるセットアップファイルを追加する。このセットアップファイルは、無料ポートでHTTPおよびgRPCの両方を用いてOTLPレシーバーを起動し、`process.env`に以下の変数を書き込む。テストから起動した子プロセスはこれらの変数を継承するため、CLIまたはテストによって生成されたサーバーは、同じレシーバーにエクスポートする。

| Variable                                                                                                        | Value                                                                                           |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                                                                                   | The receiver's HTTP endpoint, or its gRPC endpoint when `OTEL_EXPORTER_OTLP_PROTOCOL` is `grpc` |
| `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`, `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`, `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` | Empty, so that test telemetry never reaches a real collector                                    |
| `OTEL_TRACES_EXPORTER`, `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER`                                           | `otlp`                                                                                          |
| `OTEL_BSP_SCHEDULE_DELAY`, `OTEL_BLRP_SCHEDULE_DELAY`                                                           | `50`, unless already set                                                                        |
| `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_METRIC_EXPORT_TIMEOUT`                                                     | `100`, unless already set                                                                       |

短い遅延は、見た目以上に重要である。OpenTelemetryの仕様では、バッチスパンプロセッサのデフォルト遅延は5,000 ms[^otel-env]に設定されている。このデフォルト設定では、バッチがまだ送信されていないため、1つのスパンを5秒間待機するテストは失敗する。実際に`OTEL_BSP_SCHEDULE_DELAY=5000`でこのテストを実行したところ、`Expected 1 spans within 5s, received 0 matching of 0.`と表示され、失敗した。

レシーバーは、gzip圧縮の有無にかかわらずprotobufおよびJSONを読み込み、opentelemetry-proto v1.11.1のprotobuf-esによって生成されたコードを用いてprotobufをデコードする。モックコレクターパッケージやDockerコンテナは使用しない。

## テストは想定通りに待機する。

`waitForSpans`、`waitForLogs`、`waitForMetrics`は、一致するアイテムが指定された数に達するまで20 msごとにレシーバーをポーリングし、デフォルトでは5秒後に失敗する。それぞれ `where`、`count`、`timeout`、`interval` を受け取る。これらの関数はEffect値を返し、`effect`はピア依存関係であるため、テストとプラグインが同一のEffectコピーを共有する。

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

上記の`NodeSDK`はオプションを一切指定しない。セットアップファイルが書き込んだ環境からエンドポイントとエクスポーターを読み込み、テストの結果、その動作が確認されている。`clearTelemetry`は、同一ファイル内のケース間でレシーバーを空にする。

## テストに約60 ms追加される。

2026年11月18日、Node.js 26.13.1を搭載した4コアのLinuxコンテナでコストを測定した。レシーバーの起動に1.3〜2.3 ms、停止に0.7〜2.9 msかかり、5回の実行で完了した。往復のテストでは、`shutdown`を呼び出さずにNスパンを終了させ、`waitForSpans`が全スパンを返したまでの時間を、Nごとに3回測定した。

| Spans | Time until all were received |
| ----- | ---------------------------- |
| 1     | 61.0 to 69.4 ms              |
| 10    | 61.5 to 62.9 ms              |
| 100   | 62.9 to 64.6 ms              |
| 1,000 | 76.0 to 87.9 ms              |

100スパンまでのほぼすべてのケースにおいて、50 msのスケジュール遅延に20 msのポーリング間隔が1回加算される。パッケージ独自の9つのテストファイルと16個のテストからなるスイートは14.8秒で実行され、そのうち6.5秒が後述するWeaverを起動する2つのテストに充てられる。

## テレメトリの他のテスト手法との違い

一般的な代替手段はインメモリエクスポーターで、プロセス内にスパンを保持し、OTLPを経由しない。[autotel-vitest](https://jagreehal.github.io/autotel/testing/vitest/)もプロセス内でスパンを収集し、各テストに個別の親スパンを付与する。Vitestの組み込み[OpenTelemetryサポート](https://main.vitest.dev/guide/open-telemetry)は、テスト対象のコードではなく、テスト実行自体をトレースする。

| Approach                                      | Goes through OTLP | Child processes | Needs Docker |
| --------------------------------------------- | ----------------- | --------------- | ------------ |
| In-memory exporter                            | No                | No              | No           |
| autotel-vitest                                | No                | No              | No           |
| Collector container such as grafana/otel-lgtm | Yes               | Yes             | Yes          |
| vitest-otlp                                   | Yes               | Yes             | No           |

## Weaverによるセマンティック規約の確認

`otlp({ semconv: true })` は、受信したすべてのアイテムを OpenTelemetry のセマンティック規約に照らして検証する。グローバル設定で 1 つの [Weaver](https://github.com/open-telemetry/weaver) ライブチェックを開始し、各レシーバーが受信した内容を gRPC 経由で転送する。最終的に、レポートの判定結果が `failOn` 以上となった場合に実行は失敗する。デフォルトのレジストリはセマンティック規約 v1.45.0 であり、`weaver` バイナリを `PATH` に含める必要がある。

## Miniflare 配下の Cloudflare Workers

`@r_masseater/vitest-otlp/workers` の `tailWorker()` は、Miniflare の `streamingTails` に渡すテールワーカーを返す。このワーカーの呼び出しごとに OTLP プロトバッファに変換してレシーバーにポストするため、ワーカーのテストでも `kv_put` などのスパンを同様に待機する。

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

ローカルでは、Miniflare はワーカーのスクリプト名を tail に報告しないため、これらのスパンの `service.name` は `worker` となる。

[^otel-env]: [環境変数仕様、OpenTelemetry](https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/)
