---
title: "2026年11月1日〜5日にやったこと"
description: "11月の最初の週の記録。開発の基盤をコードに移し、AI から使える入口を増やし、計測を部品にし、見て触れるものを作った。"
tags: ["振り返り", "Cloudflare", "GitHub", "MCP"]
published: true
---

11月1日から5日までにやったことを書き残す。並べてみると、やったことは 4 つの流れに分かれる。

| 流れ                        | 対象                                                          |
| --------------------------- | ------------------------------------------------------------- |
| 開発の基盤をコードに移した  | CI の秘密、GitHub の設定、リポジトリの統合、lint              |
| AI から使える入口を増やした | MCP のポータル、konomi、Sloppedia、mirucord                   |
| 計測を部品にした            | measure-everything                                            |
| 見て触れるものを作った      | mosaic、rpp-kit、撮影ラボ、背面打ちスプリットパッド、記事の図 |

## 開発の基盤をコードに移した

これまでは、リポジトリを作るたびに Cloudflare のトークンを作って secret に登録し、GitHub の設定を画面で揃えていた。この週で、その作業をすべてコードに置き換えた。

CI の秘密は、リポジトリに置かなくなった。credentials.masseater.dev の Worker が GitHub Actions の OIDC トークンを確かめ、1 時間で切れる Cloudflare のトークンをその場で発行する。週の途中から、OpenRouter のキー、Claude Code のトークン、GitHub App のトークンも同じ仕組みで配るようにした。リポジトリごとの権限は 1 つの表に書き、登録済みだった古い secret は全リポジトリから消した。

GitHub の設定は、Alchemy のスタックで管理するようにした。ルールセット、secret scanning、description などを全リポジトリでコードから揃える。IaC は public の masseater.dev に置き、private のリポジトリの名前は実行時に GitHub App から取ってくるので、コードとログのどちらにも出ない。

設定を IaC にしたことで、リポジトリの改名・archive・削除もワークフローから行えるようになった。そこで、増えすぎていたリポジトリを整理した。統合したものは履歴ごと移し、元のリポジトリは archive した。空のリポジトリは削除した。

| 元のリポジトリ                | 移した先                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| oxlint-plugin-decision        | [lint-kit](https://github.com/masseater/lint-kit) に改名                     |
| oxlint-typed-rules・vocablint | lint-kit                                                                     |
| mst-ja-decision-bench         | [decision-experiments](https://github.com/masseater/decision-experiments)    |
| thumb-mosaic                  | [masseater.dev](https://github.com/masseater/masseater.dev) の `apps/mosaic` |

lint では、型情報の要る ESLint のルールを oxlint で動かすパッケージを作り、全リポジトリから ESLint を外した。このパッケージは lint-kit に入っている。

## AI から使える入口を増やした

個人で使う MCP サーバーは、Cloudflare の MCP server portals で `mcp.masseater.dev` の 1 か所にまとめた。エージェントにはこの URL だけを繋げば、ここに挙げるサーバーがすべて使える。

[konomi](https://konomi.masseater.dev) は11月2日に作り始めた。見たもの・聴いたもの・遊んだもの・読んだものを YouTube・Spotify・Steam・Netflix などから集め、好みの度合いを出して、AI が MCP で引けるようにする。API の無いサービスは、公式の書き出しファイルを取り込む。他人向けにはホスティングせず、各自が自分で置く OSS として作っている。

[Sloppedia](https://masseater.dev/sloppedia/) は、masseater.dev の scrap を置き換えた Wikipedia 風の個人の百科事典もどきである。百科事典の硬い体裁で、中身は僕の趣味と意見が強く出る。AI は MCP から PR を出して記事を書ける。blog を書くツールは、意図して MCP に足していない。

[mirucord](https://mirucord.masseater.dev) は、Discord のサーバーを読む MCP である。メンバー名簿、通話の入退室、リアクションと投票を返せるようにした。サーバーのイベントや監査ログも一度入れたが、使う予定が無いので消した。

## 計測を部品にした

[measure-everything](https://github.com/masseater/measure-everything) を作った。各サービスとツールの公式機能と自動計装を先に使い、そこで足りない部分だけを、OpenTelemetry かツールの公式の拡張点に差し込む部品として置く。

| パッケージ                                                                                 | すること                                                             |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [@r_masseater/vitest-otlp](https://www.npmjs.com/package/@r_masseater/vitest-otlp)         | テストの中で届いたスパンを確かめる                                   |
| [@r_masseater/web-vitals-flow](https://www.npmjs.com/package/@r_masseater/web-vitals-flow) | Lighthouse の user flow を何度か回し、ステップごとの中央値で判定する |

リポジトリは Claude Code のプラグインを兼ね、どの場面でどの手段を使うかをスキルに書いた。CI のジョブとステップの時間は、全リポジトリから masseater.dev の Worker へ送る形にした。

## 見て触れるものを作った

[mosaic](https://masseater.dev/mosaic/) は、キャラクターの絵を、そのキャラクターを使った動画のサムネイルだけで描くモザイクである。この週に、3,000 曲以上ある歌声合成キャラ 27 体を足した。

[rpp-kit](https://masseater.dev/rpp-kit/) は、REAPER の .rpp を TypeScript 7.1 の content mapper で型つきで読む。.rpp を書き換えると型がどう変わるかを、ブラウザの playground で試せる。

[撮影ラボ](https://masseater.dev/projects/satsuei-lab) は、アニメの撮影処理を工程ごとに切り替えて試せるページである。[背面打ちスプリットパッド](https://masseater.dev/projects/split-pad) は、ABXY と十字キーを背面に移して中指と薬指で押すコントローラーの 3D モデルである。

masseater.dev の記事には、`::figure` の 1 行で対話的な図を埋め込めるようにした。
