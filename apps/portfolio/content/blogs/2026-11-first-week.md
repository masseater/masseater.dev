---
title: "2026年11月1日〜5日にやったこと"
description: "11月の最初の週の記録。AI が確認を挟まず最後まで進められる基盤を作り、空いた手で、作りたいものへ口を出した。"
tags: ["振り返り", "Claude Code", "MCP", "Cloudflare"]
published: true
---

11月の最初の週は、AI が僕へ確認せず最後まで進められる状態を作り、空いた手で、作りたいものへ口を出していた。手を動かしたのはほぼ Claude である。

## CI の秘密

新しいリポジトリを作るたびに、Claude は Cloudflare のトークンを登録してほしいと聞いてきた。場当たり的ではなく根本的な解決を、と頼み、CI のトークンとキーは masseater.dev の Worker がその場で発行するようにさせた。自分のリポジトリに権限を足すときの確認も、毎回聞くのやめてほしい、と言ってなくした。

## GitHub の IaC とリポジトリの統合

GitHub の設定も IaC にさせた。IaC で書いていること自体は public にしたいが、public リポに private リポのことは書きたくない。そこで IaC は masseater.dev に置き、private のリポジトリ名は実行時に取ってくる形にした。IaC ができたので、増えすぎたリポジトリも畳ませた。lint 系は lint-kit へ、日本語の decision model のベンチは decision-experiments へ、モザイクは masseater.dev へ移した。元は archive した。

## ESLint の撤去

全リポジトリから ESLint を外した。残っていた型情報の要るルールは、oxlint で動かすパッケージを作らせて lint-kit に入れた。Claude が TypeScript 6 で組み立てていたので、なんで ts6 で組み立ててるの、と聞いて tsgo に載せ替えさせたら、ESLint より速くなった。

## TypeScript 7.1・Node.js 26・effect 4.1

TypeScript は 7.1 に、Node.js は 26 以上に揃えさせた。effect 4.0.0 のまま動かす PR がいっぱい上がってきたときは、ちゃんと対応して、と言って固定を外させた。

## writing スキル

文章の書き方は、指摘するたびに writing スキルへ足させている。全リポジトリの README も、このスキルで書き直させた。

## measure-everything

AI 時代の開発においてもっとも大事なのは、実装ではなく計測である。MCP のポータルが繋がらなかったとき、Claude は推測で修正を重ねていたので、ちゃんと計測するのが第一や、と止めた。この考えを、あらゆるものを既存のエコシステムベースで計測できるようにするリポジトリとして [measure-everything](https://github.com/masseater/measure-everything) にした。

## 公開サイトの CSP

masseater.dev では、デプロイのたびに ZAP が走る。警告も含めてすぐ直す決まりなので、CSP とセキュリティヘッダをサイト全体に付けさせた。

## MCP のポータル

Muse を使っていろいろしていく中で、パーソナルエージェント市場が広がっていく感覚があり、エージェントに自分の情報を渡す入口として、個人の MCP を `mcp.masseater.dev` の 1 か所にまとめさせた。各 MCP は単体で普通に OAuth で使えることを前提にし、Claude が出してきたサービストークンの迂回は取り消させた。

## konomi

統一インターフェースで各サービスの自分の情報を引けるパーソナルエージェント向けの MCP を作ったらウケそうだと思い、[konomi](https://konomi.masseater.dev) を始めた。取り込む先は、趣味嗜好を集めて分析する観点で全てにさせた。

## mirucord

僕の個人エージェントの彩葉から、[mirucord](https://mirucord.masseater.dev) で人間関係を拾いたいという要望が届いた。必要なものを選ぶ前に取れるものを全部知るのが先なので、Discord の Bot が取れるものを全部調べさせた。一度入れた招待の記録などは、今要らない、無駄な機能を残すな、と消させた。

## masseater.dev に置いたもの

| 対象                                                                 | 作らせたもの                                           | 口を出したこと                                                                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Sloppedia](https://masseater.dev/sloppedia/)                        | scrap を置き換える、Wikipedia 風の個人の百科事典もどき | 君の投稿も入れるんだから君がやりなよ、と作るのも Claude に任せた。blog は僕が推敲してから出す文章なので、AI が MCP から書けるのは Sloppedia だけにした             |
| [rpp-kit](https://masseater.dev/rpp-kit/)                            | REAPER のプロジェクトファイルを読み込むデモ            | masseater.dev 配下にしなよ、コードとしてどう扱われるのかの playground が必要。全部同時表示は見づらいので codepen 見て、コンソールは下、自分で declare は普通にダメ |
| [mosaic](https://masseater.dev/mosaic/)                              | 歌声合成キャラの大量追加                               | 対象の動画が少ないキャラはバリエーションが落ちても良いから細かく。列の数はハードコードより自動調整                                                                 |
| [撮影ラボ](https://masseater.dev/projects/satsuei-lab)               | アニメの撮影処理を工程ごとに試せるページ               |                                                                                                                                                                    |
| [背面打ちスプリットパッド](https://masseater.dev/projects/split-pad) | 3D モデル                                              |                                                                                                                                                                    |
| 記事の図                                                             | 対話的な図の埋め込み                                   | mermaid はしょぼい                                                                                                                                                 |
