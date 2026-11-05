---
title: "2026年11月1日〜5日にやったこと"
description: "11月の最初の週の記録。CI の秘密と GitHub の設定をコードに移し、リポジトリを統合し、TypeScript 7.1 に上げ、個人の MCP を 1 つの入口にまとめ、konomi・Sloppedia・measure-everything を作った。"
tags: ["振り返り", "Cloudflare", "GitHub", "MCP"]
published: true
---

11月1日から5日までに、個人の GitHub のリポジトリでやったことの記録である。

| 目的                           | やったこと                                                     |
| ------------------------------ | -------------------------------------------------------------- |
| リポジトリごとの手作業をなくす | CI の秘密の発行、GitHub の設定の IaC、リポジトリの統合         |
| ツールチェーンを新しくする     | TypeScript 7.1、ESLint の撤去、Node.js 26、effect 4.1          |
| 公開しているサイトを守る       | CSP とセキュリティヘッダ、ZAP の警告の修正、パスキーのログイン |
| AI に自分の情報を渡す          | MCP のポータル、konomi、Sloppedia、mirucord                    |
| 計測を先に置く                 | measure-everything、CI の計測の集約                            |
| 文章の書き方を揃える           | README の書き直し、ライセンス、masseater/skills                |
| 作って見せる                   | mosaic、rpp-kit、撮影ラボ、背面打ちスプリットパッド、記事の図  |

## リポジトリごとの手作業の撤去

これまでは、リポジトリを作るたびに Cloudflare のトークンを作って secret に登録し、GitHub の設定を画面で揃えていた。権限が足りなくなるたびに同じやり取りを繰り返していたので、場当たり的に secret を足すのをやめ、根本からコードに置き換えた。

CI の秘密は、リポジトリに置かなくなった。GitHub Actions のジョブは OIDC トークンを credentials.masseater.dev の Worker に送り、1 時間で切れる Cloudflare のトークンと引き換える。トークンが出るのは、持ち主が masseater で、main ブランチから動いたジョブだけである。週の途中からは、OpenRouter のキー、Claude Code のトークン、GitHub App のトークンも同じ仕組みで受け取れるようにした。リポジトリごとの権限は masseater.dev の 1 つの表に書き、登録済みだった古い secret は全リポジトリから消した。

GitHub の設定は、Alchemy のスタック `masseater-dev-github` で管理するようにした。既定ブランチのルールセット、secret scanning、ブランチの更新ボタン、Actions から PR を作る権限、description と homepage を、全リポジトリでコードから揃えている。IaC は public の masseater.dev に置いた。private のリポジトリの名前は実行時に GitHub App のインストール先から取ってくるので、コードとログのどちらにも出ない。

設定を IaC にしたことで、リポジトリの改名・archive・削除もワークフローから行えるようになった。増えすぎていたリポジトリは、履歴ごと移してから元を archive した。空のリポジトリと、中身がテンプレートの雛形のままだったリポジトリは削除している。

| 元のリポジトリ                | 移した先                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| oxlint-plugin-decision        | [lint-kit](https://github.com/masseater/lint-kit) に改名                     |
| oxlint-typed-rules・vocablint | lint-kit                                                                     |
| mst-ja-decision-bench         | [decision-experiments](https://github.com/masseater/decision-experiments)    |
| thumb-mosaic                  | [masseater.dev](https://github.com/masseater/masseater.dev) の `apps/mosaic` |

テンプレートから入ったまま使っていなかったデモの `apps/web` も、Worker ごと各リポジトリから消した。

## ツールチェーンの更新

TypeScript は、7.0 だったリポジトリを 7.1 beta に上げた。rpp-kit で使う content mapper と、tsgo を子プロセスで呼ぶ `typescript/sync` の API は、7.1 で入ったものである。

ESLint は全リポジトリから外した。最後まで残っていたのは型情報の要るルールだけだったので、それを oxlint の JS プラグインとして動かすパッケージを作った。元のプラグインのテストは手を入れずに置き、すべて通るまで出していない。型検査器は途中で tsgo の API に載せ替え、このパッケージは lint-kit に入れた。

Node.js は 26 以上だけに対応した。npm に出すパッケージの `engines` も 26 以上にしている。

effect は 4.1.2 に、alchemy は beta.85 に上げた。alchemy を上げたリポジトリが共有の state store を新しい形式にしたため、古い alchemy のリポジトリが 409 で落ちるようになったからである。lint-kit を effect 4.1.2 で出し直し、各リポジトリに残っていた effect 4.0.0 の固定も外した。

## 公開サイトの防御

masseater.dev は、サイト全体に CSP とセキュリティヘッダを付けた。静的なページなので nonce は使わず、インラインのスクリプトはハッシュで許可する。Cloudflare 自身が返す応答にもヘッダが付くよう、ゾーンに Transform Rule を足した。デプロイのあとに走る ZAP の警告は、誤検知を除いてすべて直している。decision-bench のページにも、同じハッシュつきの CSP を付けた。

medley-database は、ログインをパスキーだけにした。管理者は招待トークンで登録する。

## AI に渡す自分の情報

個人で使う MCP サーバーは、Cloudflare の MCP server portals で `mcp.masseater.dev` の 1 か所にまとめた。エージェントにはこの URL だけを繋げば、medley-database、Twilog、以下の konomi や mirucord がすべて使える。上流はどれも普通の OAuth で認証し、サービストークンで迂回する案は一度入れて取り消した。

[konomi](https://konomi.masseater.dev) は11月2日に作り始めた。統一したインターフェースで各サービスの自分の情報を引けるパーソナルエージェント向けの MCP を作ったら、ウケそうだと思ったからである。見たもの・聴いたもの・遊んだもの・読んだものを YouTube・Spotify・Steam・Netflix などから集め、反応の重みと時間の割引で好みの度合いを出す。API の無いサービスは、公式の書き出しファイルを取り込む。他人向けにはホスティングせず、各自が自分で置く OSS として作っている。

[Sloppedia](https://masseater.dev/sloppedia/) は、masseater.dev の scrap を置き換えた Wikipedia 風の個人の百科事典もどきである。百科事典の硬い体裁で、中身は僕の趣味と意見が強く出る。AI は MCP から PR を出して記事を書ける。blog は自分で推敲してから出す文章なので、blog を書くツールは MCP に足していない。見た目は npm の [sloppedia](https://www.npmjs.com/package/sloppedia) に切り出した。

[mirucord](https://mirucord.masseater.dev) は、Discord のサーバーを読むだけの MCP である。メンバー名簿、通話の入退室、リアクションと投票、本人が選んで公開した連携アカウントを返せるようにした。サーバーのイベント、スレッドの参加者、監査ログ、招待の記録も一度入れたが、使う予定が無いので消した。

## 計測の部品

AI 時代の開発においてもっとも大事なのは、実装ではなく計測である。その計測を既存のエコシステムの上で揃えるために、[measure-everything](https://github.com/masseater/measure-everything) を作った。各サービスとツールの公式機能と自動計装を先に使い、足りない部分だけを OpenTelemetry かツールの公式の拡張点に差し込む部品として置く。

| パッケージ                                                                                 | すること                                                             |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| [@r_masseater/vitest-otlp](https://www.npmjs.com/package/@r_masseater/vitest-otlp)         | テストファイルごとに OTLP を受け、テストの中で届いたスパンを確かめる |
| [@r_masseater/web-vitals-flow](https://www.npmjs.com/package/@r_masseater/web-vitals-flow) | Lighthouse の user flow を何度か回し、ステップごとの中央値で判定する |

vitest-otlp は Cloudflare Workers のスパンも tail worker で受け、semantic conventions に沿っているかを Weaver で検査できる。リポジトリは Claude Code のプラグインを兼ね、どの場面でどの手段を使うかをスキルに書いた。CI のジョブとステップの時間は、リポジトリごとに受ける Worker を持つのをやめ、全リポジトリから masseater.dev の Worker へ送っている。

## 文章の書き方

全リポジトリの README を、writing スキルの README の規則で書き直した。使う人がそのリポジトリを使うかを決め、使い始めるための判断と手順だけを残している。ライセンスは AGPL に揃え、LICENSE の無かったリポジトリに置いた。

[masseater/skills](https://github.com/masseater/skills) では、blog の書き方を writing スキルに統合し、README の箇条書きを本文の 15% 以内に収める規則を足した。スライドを作る create-slides と build-explanation のスキルは、デッキの部品ごとここに移している。README のスキル一覧は、コミットのたびに各 SKILL.md から書き直される。

## 作って見せたもの

[mosaic](https://masseater.dev/mosaic/) は、キャラクターの絵を、そのキャラクターを使った動画のサムネイルだけで描くモザイクである。この週に、3,000 曲以上ある歌声合成キャラ 27 体を足した。列の数はキャラごとのサムネイルの数から自動で決める。

[rpp-kit](https://masseater.dev/rpp-kit/) は、REAPER の .rpp を TypeScript 7.1 の content mapper で型つきで読む。.rpp を書き換えると型がどう変わるかを、ブラウザの playground で試せる。

[撮影ラボ](https://masseater.dev/projects/satsuei-lab) は、アニメの撮影処理を工程ごとに切り替えて試せるページである。[背面打ちスプリットパッド](https://masseater.dev/projects/split-pad) は、ABXY と十字キーを背面に移し、中指と薬指で押すコントローラーの 3D モデルである。

masseater.dev の記事には、`::figure` の 1 行で対話的な図を埋め込めるようにした。最初の図は、[資本主義はシステム停止の連鎖で終わる](https://masseater.dev/blogs/cyberattack-stops-real-economy) の連鎖停止の図である。動きを減らす設定にしている人には、ページ遷移の view transition と mosaic のスライドを止めるようにした。
