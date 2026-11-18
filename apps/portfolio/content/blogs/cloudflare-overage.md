---
title: 「Cloudflare Workers AI およびコンテナの従量課金（2026-11-17時点）」 description: 「Workers AI およびコンテナが Workers Paid の対象外となった要因には、Workers AI が AI ゲートウェイを経由しなかったこと、およびホストされていた翻訳サーバーが削除されたことが含まれる。」 tags: ["Cloudflare", "Workers AI", "コスト"] published: true
---

2026年11月15日および2026年11月16日、CloudflareはWorkers Paidプランに加えて従量課金制の利用分を請求した。Workers AI（Regular Twitch Neurons）とContainersは、いずれもプランに含まれる範囲を超えた。以下は、請求対象利用APIおよびGraphQL Analyticsによる数値と、変更された内容である。

## 請求額

| Date       | Workers AI                        | Containers  |
| ---------- | --------------------------------- | ----------- |
| 2026-11-15 | 771k neurons, $5.41               | $0.19       |
| 2026-11-16 | 118k neurons, $1.30               | $0.17       |
| 2026-11-17 | 5.7k neurons, within the free 10k | about $0.13 |

Workers AIは1日あたり1万個のニューロンを含み、それを超える分は1,000ニューロンあたり0.011ドルとなる[^workers-ai-pricing]。毎日請求されたわけではなく、2日だけ超過した。

## Workers AI: 決定事項のリントとゲートウェイ外の呼び出し

11〜15日には、利用の大部分がGitHub Actionsのリントによるものだった。AI Gatewayのキャッシュが機能していない間、54万5,000ニューロンに対して`qwen3.8-27b`を、20万7,000ニューロンに対して`gemma-sea-lion`を呼び出していた。11〜16日には、リントが`@cf/cloudflare/clef-flash`に移行する前も、`qwen3.8-27b`は依然として6万6,000ニューロンを使用していた。11〜17日までには、AI Gatewayの1日あたりの支出上限11セントの`default`および`clef-flash`への移行がすでに適用されていた。

支出制限は、ゲートウェイを経由するリクエストのみを対象とする。モデルごとに `aiInferenceAdaptiveGroups` と `aiGatewayRequestsAdaptiveGroups` を比較したところ、推論側にのみ出現するモデルが確認された。これらの呼び出しはゲートウェイをスキップしていた。

| Caller                       | Model           | Why it skipped the gateway                                                    | Fix                                                                         |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| mirucord web                 | gemma, bge-m3   | `@r_masseater/workers-tracing` 0.3.0 does not add the gateway to `env.AI.run` | Upgrade to 0.5.0 and pass the options `runWorkersAi` builds to `env.AI.run` |
| personal-space slide indexer | qwen3-embedding | It calls the REST `/ai/run` endpoint directly                                 | Send the `cf-aig-gateway-id` and `cf-aig-metadata` headers                  |

金額は少額だったが、上限はなかった。

## コンテナ: plamo-translate

Containersの使用例は、plamo-jaプラグインが使用していた翻訳サーバーのplamo-translateによるものだ。このサーバーは4 GiBを割り当てる`standard-1`インスタンスタイプで動作し、1時間ごとに約10分間ウェイクしていた。

コンテナのメモリ使用量は月間25 GiB-hoursで、それを超える分は1 GiB-secondあたり0.0000025ドルとなる[^containers-pricing]。月間の割り当て量は11〜15分で上限に達した。それ以降は、使用される1分ごとに課金された。最大メモリ使用量は約1.15 GiBであり、必要量の約3倍のメモリを保持していた。

コンテナに支出上限はない。spend-policies APIが対象とするのは`workers`と`durable_objects`のみである。コストを抑える唯一の方法は、実行頻度を下げるか、メモリ使用量を減らすか、あるいは削除することだった。

## ホスト型翻訳の削除

計画では、4 GiBから2 GiBに縮小することになっていた。その後、Masseater氏は、ClaudeのクラウドセッションVM内で動作するモデルは、MCPツールとして提供する必要はないと指摘した。

:::masseater まあplamo翻訳はツール自体削除かもなあこれ。どうせclaudeのクラウド環境のvmでも動くくらいだから、mcpとして提供する必要はないかも :::

つまり、ホスト型翻訳は縮小ではなく、削除されたということだ。置き換え版は、何も削除される前に準備が整い、テストも完了していた。

| Use                                         | Before                                 | After                                                                                              |
| ------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Translating documents                       | `sundries_translate` on the MCP portal | The plamo-ja `translate` skill, using the `llama-server` that plamo-ja already runs in the session |
| watashi-mcp translating traits and profiles | The plamo-translate container          | `@cf/google/gemma-4-26b-a4b-it` through the AI Gateway `default`                                   |

コードは [masseater.dev#1292](https://github.com/masseater/masseater.dev/pull/1292) で削除された。ただし、コードを削除しても本番環境のリソースは削除されない。Worker、コンテナアプリケーション、Durable Object 名前空間、カスタムドメイン、および Access アプリケーションは Alchemy の状態のままとなる。MCP ポータル上の Cloudflare トークンは読み取り専用であるため、API で直接削除することはできなかった。一度限りの手順として、古いスタックを sundries にデプロイするための `alchemy destroy` が追加され（[masseater.dev#1317](https://github.com/masseater/masseater.dev/pull/1317)）、次の PR でその手順が再び削除された。

## 変更後のチェック

デプロイ後、Cloudflare API の確認により、Worker、コンテナアプリケーション、ドメイン、および Access アプリケーションが消失していた。11-17日の 22:30 から 23:50 UTC までの間、コンテナの利用はゼロであった。この時間帯の Workers AI リクエストはすべてゲートウェイを経由しており、`clef-flash` が 1,194 件、`plamo-embedding-1b` が 20 件であった。

Cloudflareの日次コストチェックでは、請求コストが0を超える日もフラグ立てされ、モデルごとのゲートウェイリクエストと推論を比較して、ゲートウェイをスキップする呼び出しを検出する。また、呼び出し元がモデルを実行できる場合に、コンテナにモデルをホストしないというルールも備えている。

[^workers-ai-pricing]: [Workers AIの料金](https://developers.cloudflare.com/workers-ai/platform/pricing/)

[^containers-pricing]: [Workersの料金: コンテナ](https://developers.cloudflare.com/workers/platform/pricing/#containers)
