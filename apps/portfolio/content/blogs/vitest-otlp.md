---
title: "vitest-otlp: コードが実際にエクスポートするテレメトリのテスト"
description: "vitest-otlpは、テスト中にOTLPレシーバーを実行するVitestプラグインである。テストは、プロセスから出たスパン、ログ、メトリクスを待ってそれらにアサーションを行い、OpenTelemetry Weaverはこれらをセマンティック規約に照らして検証できる。"
tags: ["OpenTelemetry", "Vitest", "Vite+"]
published: true
---

[@r_masseater/vitest-otlp](https://github.com/masseater/masseater.dev/tree/main/libs/vitest-otlp)は、私が書いたVitestプラグインだ。すべてのVitestワーカーでOTLPレシーバーを実行する。次に、テストでは、テスト対象のコードが実際にネットワーク経由で送信したスパン、ログ、およびメトリクスについてアサーションを行う。モック化したエクスポーターは、コードがエクスポーターを呼んだことしか証明しない。このプラグインは、`OTEL_*` 設定、自動インストルメンテーション、およびエクスポーター自体のチェックも行う。

## 仕組み

`otlp()` は Vitest の設定にセットアップファイルを追加する。

```ts
import { otlp } from "@r_masseater/vitest-otlp";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [otlp()],
});
```

セットアップファイルは、HTTPとgRPCの両方でOTLPを受け付けるレシーバーを起動する。次に、標準的なOpenTelemetry環境変数をそのレシーバーに向ける。

| 変数                                                        | 値                                                                                                 |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                               | レシーバのHTTPエンドポイント、または `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` の場合のgRPCエンドポイント |
| `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT`         | 共有エンドポイントが優先されるように空にする                                                       |
| `OTEL_{TRACES,METRICS,LOGS}_EXPORTER`                       | `otlp`                                                                                             |
| `OTEL_BSP_SCHEDULE_DELAY`, `OTEL_BLRP_SCHEDULE_DELAY`       | `50`（既に設定されていない限り）                                                                   |
| `OTEL_METRIC_EXPORT_INTERVAL`, `OTEL_METRIC_EXPORT_TIMEOUT` | `100`（既に設定されていない限り）                                                                  |

テスト対象のコードに特別なエクスポーターは不要である。環境から設定を読み込むSDKは、すべてを受信側に送信する。短時間のバッチ遅延により、データがテストの間に届く。

## テレメトリ待ち

`waitForSpans`、`waitForLogs`、`waitForMetrics`は、一致する項目が十分に届くまでレシーバーをポーリングする。デフォルトでは1つの項目を待機し、20ミリ秒ごとにチェックを行い、5秒後に終了する。

以下のテストでは、サービス名以外のオプションなしでNode.js SDKを起動する。`checkout` という名前のスパンを終了し、`charge` という名前のスパンを待機する。

```ts
import { trace } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

test("checkout is traced", () =>
  Effect.gen(function* () {
    const sdk = new NodeSDK({ serviceName: "shop" });
    sdk.start();
    trace.getTracer("shop").startActiveSpan("checkout", (span) => {
      span.setAttribute("order.id", "o-1");
      span.end();
    });
    yield* Effect.promise(() => sdk.shutdown());
    const spans = yield* waitForSpans({ where: (span) => span.name === "charge" });
    expect(spans).toMatchObject([{ attributes: { "order.id": "o-1" } }]);
  }).pipe(Effect.runPromise));
```

テストは5秒後に失敗する。メッセージには、1つのスパンが到着したが、いずれも一致しなかったと記載されている。

```text
TelemetryNotReceived: Expected 1 spans within 5s, received 0 matching of 1.
```

`span.name === "checkout"` とすると、同じテストがパスする。受信したスパンにはリソースとインストルメンテーションスコープも含まれているため、パスしたテストでは `resource: { "service.name": "shop" }` もチェックした。

## セマンティック規約

`otlp({ semconv: true })` は [OpenTelemetry Weaver](https://github.com/open-telemetry/weaver) も実行する。グローバルセットアップがセマンティック規約 v1.45.0 に対する `weaver registry live-check` を開始し、レシーバーは受け取ったすべてを Weaver に転送する。テスト実行が終了すると、プラグインはWeaverを停止し、そのレポートを読み込む。`failOn`（デフォルトは`violation`）以上の指摘が見つかった場合、実行は失敗する。

パッケージのテストフィクスチャは、`http.response.status_code` が文字列 `"200"` であるスパンを1つエクスポートする。Weaver 0.28.0 では拒否される。

```text
SemconvCheckFailed: Telemetry does not follow the semantic conventions:
  violation type_mismatch: Attribute 'http.response.status_code' has type 'string'. Type should be 'int'. (work)
```

Weaverは独立したバイナリである。`PATH` 上に置くか、`weaver` オプションで名前を指定する必要がある。

## Cloudflare Workers

Miniflare で動作する Worker は、`OTEL_*` 変数を読み取らない。`@r_masseater/vitest-otlp/workers` の `tailWorker()` は、Worker のトレースとログを OTLP に変換して受信側に送信するテールワーカーをバンドルする。このテストでは、Miniflare の `workers` にテールワーカーを追加し、トレース対象の Worker の `streamingTails` にその名前を列挙している。

```ts
Effect.gen(function* () {
  const tail = yield* tailWorker({ serviceName: "app" });
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
});
```

Workersランタイムは、`kv_put`などのスパンを自ら生成する。このテストは、Workerにインストルメンテーションコードを一切記述せずに、これらのスパンに対してアサーションを行う。
