---
title: "Cloudflare Workers AI およびコンテナの従量課金（2026-11-17時点）"
description: "Workers AI およびコンテナが Workers Paid の対象を超えた要因、AI ゲートウェイを経由しなかった Workers AI の呼び出し、ホストされていた翻訳サーバーの削除。"
tags: ["Cloudflare", "Workers AI", "コスト"]
published: true
---

2026年11月15日および2026年11月16日、CloudflareはWorkers Paidプランに加えて従量課金制の利用分を請求した。Workers AI（Regular Twitch Neurons）とContainersは、いずれもプランに含まれる範囲を超えた。以下は、請求対象利用APIおよびGraphQL Analyticsによる数値と、変更された内容である。

## 請求額

| 日付       | Workers AI                    | Containers |
| ---------- | ----------------------------- | ---------- |
| 2026-11-15 | 771k neurons, $5.41           | $0.19      |
| 2026-11-16 | 118k neurons, $1.30           | $0.17      |
| 2026-11-17 | 5.7kニューロン、無料の10k以内 | 約0.13ドル |

Workers AIは1日あたり1万個のニューロンを含み、それを超える分は1,000ニューロンあたり0.011ドルとなる[^workers-ai-pricing]。毎日請求されたわけではなく、2日だけ超過した。

## Workers AI: decision lintとゲートウェイ外の呼び出し

11月15日には、利用の大部分がGitHub Actionsのdecision lintによるものだった。AI Gatewayのキャッシュが機能していない間、54万5,000ニューロンに対して`qwen3.8-27b`を、20万7,000ニューロンに対して`gemma-sea-lion`を呼び出していた。11月16日には、リントが`@cf/cloudflare/clef-flash`に移行する前も、`qwen3.8-27b`は依然として6万6,000ニューロンを使用していた。11月17日までには、AI Gateway `default` の1日あたり11セントの支出上限および`clef-flash`への移行がすでに適用されていた。

支出制限は、ゲートウェイを経由するリクエストのみを対象とする。モデルごとに `aiInferenceAdaptiveGroups` と `aiGatewayRequestsAdaptiveGroups` を比較したところ、推論側にのみ出現するモデルが確認された。これらの呼び出しはゲートウェイをスキップしていた。

| 呼び出し元                            | モデル          | なぜゲートウェイをスキップしたのか                                                  | 修正                                                                           |
| ------------------------------------- | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| mirucord web                          | gemma, bge-m3   | `@r_masseater/workers-tracing` 0.3.0 では `env.AI.run` にゲートウェイが追加されない | 0.5.0にアップグレードし、`runWorkersAi` が作るオプションを `env.AI.run` に渡す |
| personal-space のスライドインデクサー | qwen3-embedding | RESTの `/ai/run` エンドポイントを直接呼び出す                                       | `cf-aig-gateway-id` および `cf-aig-metadata` ヘッダーを送信する                |

金額は少額だったが、上限はなかった。

## コンテナ: plamo-translate

Containersの使用量は、plamo-jaプラグインが使用していた翻訳サーバーのplamo-translateによるものだ。このサーバーは4 GiBを割り当てる`standard-1`インスタンスタイプで動作し、1時間ごとに約10分間起動していた。

コンテナのメモリは月間25 GiB-hoursまで含まれ、それを超える分は1 GiB-secondあたり0.0000025ドルとなる[^containers-pricing]。月間の割り当て量は11月15日に上限に達した。それ以降は、使用される1分ごとに課金された。最大メモリ使用量は約1.15 GiBであり、必要量の約3倍のメモリを保持していた。

コンテナに支出上限はない。spend-policies APIが対象とするのは`workers`と`durable_objects`のみである。コストを抑える唯一の方法は、実行頻度を下げるか、メモリ使用量を減らすか、あるいは削除することだった。

## ホスト型翻訳の削除

計画では、4 GiBから2 GiBに縮小することになっていた。その後、masseaterは、ClaudeのクラウドセッションVM内で動作するモデルは、MCPツールとして提供する必要はないと指摘した。

:::masseater
まあplamo翻訳はツール自体削除かもなあこれ。どうせclaudeのクラウド環境のvmでも動くくらいだから、mcpとして提供する必要はないかも
:::

つまり、ホスト型翻訳は縮小ではなく、削除されたということだ。置き換え版は、何も削除される前に準備が整い、テストも完了していた。

| 用途                                       | 以前                               | 以後                                                                                                 |
| ------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 文書の翻訳                                 | MCPポータルの `sundries_translate` | plamo-ja がすでにセッション内で実行している `llama-server` を使用した plamo-ja の `translate` スキル |
| watashi-mcp のトレイトとプロファイルの翻訳 | plamo-translateコンテナ            | AIゲートウェイ `default` 経由の `@cf/google/gemma-4-26b-a4b-it`                                      |

コードは [masseater.dev#1292](https://github.com/masseater/masseater.dev/pull/1292) で削除された。ただし、コードを削除しても本番環境のリソースは削除されない。Worker、コンテナアプリケーション、Durable Object 名前空間、カスタムドメイン、および Access アプリケーションは Alchemy の state に残る。MCP ポータル上の Cloudflare トークンは読み取り専用であるため、API で直接削除することはできなかった。一度限りの手順として、sundries のデプロイに古いスタックの `alchemy destroy` が追加され（[masseater.dev#1317](https://github.com/masseater/masseater.dev/pull/1317)）、次の PR でその手順が再び削除された。

## 変更後のチェック

デプロイ後、Cloudflare API の確認により、Worker、コンテナアプリケーション、ドメイン、および Access アプリケーションが消失していた。11月17日の 22:30 から 23:50 UTC までの間、コンテナの利用はゼロであった。この時間帯の Workers AI リクエストはすべてゲートウェイを経由しており、`clef-flash` が 1,194 件、`plamo-embedding-1b` が 20 件であった。

Cloudflareの日次コストチェックでは、請求コストが0を超える日もフラグ立てされ、モデルごとのゲートウェイリクエストと推論を比較して、ゲートウェイをスキップする呼び出しを検出する。また、呼び出し元がモデルを実行できる場合に、コンテナにモデルをホストしないというルールも備えている。

[^workers-ai-pricing]: [Workers AIの料金](https://developers.cloudflare.com/workers-ai/platform/pricing/)

[^containers-pricing]: [Workersの料金: コンテナ](https://developers.cloudflare.com/workers/platform/pricing/#containers)
