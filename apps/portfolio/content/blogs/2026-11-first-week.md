---
title: "2026年11月1日〜5日にやったこと"
description: "11月の最初の週に、個人アカウントのリポジトリで手を動かしたことの記録。CI の秘密と GitHub の設定を IaC に寄せ、リポを統合し、MCP の入口を 1 つにまとめ、konomi と Sloppedia と measure-everything を作った。"
tags: ["振り返り", "Cloudflare", "GitHub", "MCP"]
published: true
---

11月1日から5日までに、GitHub の masseater アカウントのリポジトリでやったことを書き残す。仕事と、他人のリポジトリでの作業は入れていない。

## CI の秘密をリポジトリに置かない

各リポジトリの CI は、Cloudflare のトークンを secret に持たなくなった。代わりに credentials.masseater.dev の Worker が、GitHub Actions の OIDC トークンを確かめ、1 時間で切れるトークンをその場で発行する。発行するのは、持ち主が masseater で、main ブランチから動いたジョブにだけである。他人の PR から main の権限で動く `pull_request_target` と `workflow_run` は断る。リポジトリごとに渡す権限は、masseater.dev の `infra/repositories/credential-grants.ts` に表として書いた。

この仕組みは週の途中で配るものが増えた。

| 配るもの               | 使い道                      |
| ---------------------- | --------------------------- |
| Cloudflare のトークン  | デプロイ                    |
| OpenRouter のキー      | `vp check` の decision lint |
| Claude Code のトークン | CI で動く Claude            |
| GitHub App のトークン  | GitHub の設定の IaC         |

新しいリポジトリを作っても、secret を手で登録しなくてよくなった。登録済みだった古い secret は、全リポジトリから消すワークフローを作って消した。npm への公開だけは Trusted Publisher に寄せ、トークンを配る形はやめた。

## GitHub の設定を IaC にした

個人アカウントの GitHub の設定を、Alchemy のスタック `masseater-dev-github` で管理するようにした。既定ブランチのルールセット、secret scanning、ブランチの更新ボタン、Actions から PR を作る権限、description と homepage を、全リポジトリでコードから揃える。Alchemy に無い設定はカスタムリソースで足した。

IaC を書いていること自体は public の masseater.dev に置いた。ただ、private のリポジトリの名前はコードに書きたくない。そこでリポジトリの一覧は、実行時に GitHub App のインストール先から取ってくる形にした。ログにも private の名前は出ない。

IaC ができたので、増えすぎたリポジトリを整理した。統合したものは履歴ごと移し、元のリポジトリは archive した。

| 元のリポジトリ                | 移した先                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| oxlint-plugin-decision        | [lint-kit](https://github.com/masseater/lint-kit) に改名                     |
| oxlint-typed-rules・vocablint | lint-kit                                                                     |
| mst-ja-decision-bench         | [decision-experiments](https://github.com/masseater/decision-experiments)    |
| thumb-mosaic                  | [masseater.dev](https://github.com/masseater/masseater.dev) の `apps/mosaic` |

空のリポジトリと、中身がテンプレートの雛形のままだったリポジトリは、archive ではなく削除した。

## MCP の入口を 1 つにした

個人で使う MCP サーバーを、Cloudflare の MCP server portals で `mcp.masseater.dev` の 1 か所にまとめた。エージェントにはこの URL だけを繋げば、mirucord、medley-database、Twilog、atra などの上流がすべて使える。ポータルは Code Mode を既定で有効にし、ツールを検索と実行の 2 本に絞って見せる。

上流の認証は、それぞれのサーバーが普通に OAuth で通ることを前提にした。サービストークンで迂回する案は一度入れて取り消した。自前の Access で守っている MCP が通らなかった原因は、標準の OAuth メタデータのパスがサイト全体の Access に取られて 302 を返していたことだった。

## 好みを AI に渡す konomi

[konomi](https://github.com/masseater/konomi) を11月2日に作り始め、[konomi.masseater.dev](https://konomi.masseater.dev) に置いた。自分が見たもの・聴いたもの・遊んだもの・読んだものを各サービスから集め、AI が MCP で引けるようにする。好みの度合いは、反応の重みに時間の割引を掛けて出す。埋め込みで似たものを引き、AI が好みのメモを書き残せる。

取り込める先は、YouTube・Spotify・ニコニコのような視聴の記録から、Steam・PlayStation・Xbox の遊んだゲーム、はてなブックマーク・Letterboxd・Filmarks まで広げた。Netflix・Prime Video・Kindle のように API が無いものは、公式の書き出しファイルを取り込む。他人向けにホスティングはせず、各自が自分で置く OSS として作っている。

## scrap を Sloppedia に置き換えた

masseater.dev の scrap を、Wikipedia 風の個人の百科事典もどき [Sloppedia](https://masseater.dev/sloppedia/) に置き換えた。百科事典の硬い体裁で、中身は僕の趣味と意見が強く出る。slop は名前で自嘲している。検索エンジンには載せない。

AI が書ける経路は、MCP の `write_sloppedia_article` から PR を出す 1 本だけにした。blog を書くツールは MCP に足していない。見た目は npm の [sloppedia](https://www.npmjs.com/package/sloppedia) に切り出した。

## ESLint を全リポジトリから外した

型情報の要る ESLint のルールを oxlint の JS プラグインとして動かす `@r_masseater/oxlint-typed-rules` を作り、テンプレートと派生リポジトリのすべてから ESLint を外した。元のプラグインのテストは手を入れずに置き、すべて通るまで出していない。型検査器は途中から TypeScript 7.1 の tsgo の API に載せ替えた。このパッケージは lint-kit に統合した。

lint-kit を effect 4.1.2 で出し直したので、各リポジトリに残っていた effect 4.0.0 の固定も外せた。

## 計測の部品を集める measure-everything

[measure-everything](https://github.com/masseater/measure-everything) を作った。各サービスとツールの公式機能と自動計装を先に使い、そこで足りない部分だけを OpenTelemetry かツールの公式の拡張点に差し込む部品として置く。

| パッケージ                                                                                 | すること                                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| [@r_masseater/vitest-otlp](https://www.npmjs.com/package/@r_masseater/vitest-otlp)         | テストファイルごとに OTLP の受け口を立て、テストの中で届いたスパンを確かめる |
| [@r_masseater/web-vitals-flow](https://www.npmjs.com/package/@r_masseater/web-vitals-flow) | Lighthouse の user flow を何度か回し、ステップごとの中央値で判定する         |

vitest-otlp は Cloudflare Workers のスパンも tail worker で受け、semantic conventions に沿っているかを Weaver で検査できる。リポジトリは Claude Code のプラグインを兼ね、どの場面でどの手段を使うかをスキルに書いた。CI のジョブとステップの時間は、全リポジトリから masseater.dev の ci-telemetry Worker へ送る形にした。

## そのほかに作ったもの

| 対象                                                                 | やったこと                                                                                        |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [mosaic](https://masseater.dev/mosaic/)                              | 3,000 曲以上ある歌声合成キャラ 27 体を足し、masseater.dev に移した                                |
| [rpp-kit](https://masseater.dev/rpp-kit/)                            | REAPER の .rpp を TypeScript 7.1 の content mapper で型つきで読むデモと playground を作った       |
| [撮影ラボ](https://masseater.dev/projects/satsuei-lab)               | アニメの撮影処理を工程ごとに切り替えて試せるページを作った                                        |
| [背面打ちスプリットパッド](https://masseater.dev/projects/split-pad) | 背面のボタンを中指と薬指で押すコントローラーの 3D モデルを載せた                                  |
| masseater.dev の記事                                                 | `::figure` の 1 行で対話的な図を埋め込めるようにした                                              |
| masseater.dev 全体                                                   | CSP とセキュリティヘッダを付け、ZAP の警告をすべて直した                                          |
| [mirucord](https://mirucord.masseater.dev)                           | メンバー名簿、通話の入退室、リアクションと投票、本人が選んだ連携アカウントを MCP で返すようにした |
| medley-database                                                      | ログインをパスキーだけにした                                                                      |
| [skills](https://github.com/masseater/skills)                        | スライドを作る create-slides と build-explanation を移し、blog の書き方を writing に統合した      |

mirucord では、サーバーのイベント、スレッドの参加者、監査ログ、招待の記録も一度入れたが、使う予定が無いので消した。害が無いから残すのではなく、使わない機能は消す。

## 全リポジトリに入れた変更

全リポジトリに共通の変更も続けた。Node.js は 26 以上だけに対応し、TypeScript は 7.1 beta に上げた。alchemy を beta.85、effect を 4.1.2 に上げたのは、共有の state store が新しい形式になり、古いバージョンが 409 で落ちるようになったためである。README は writing スキルで、使う人の判断と手順に絞って書き直した。ライセンスは AGPL に揃えた。テンプレートから入ったまま使っていなかったデモの `apps/web` と、そのデプロイも消した。
