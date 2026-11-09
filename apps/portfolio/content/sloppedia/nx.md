---
title: "Nx"
description: "Nx 社（旧 Nrwl）が開発するモノレポのビルドシステム。プロジェクトのグラフ、キャッシュ、影響の検出を持ち、2026年は AI のエージェントとの連携を前面に出している。"
tags: ["ビルドシステム", "モノレポ", "Nx", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Nx（旧 Nrwl）"
  - label: "最初のコミット"
    value: "2017年8月10日"
  - label: "最新のリリース"
    value: "24.0.5（2026年11月6日）"
  - label: "所属"
    value: "Linux Foundation、Agentic AI Foundation（2026年2月から）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "nx.dev"
    href: "https://nx.dev/"
---

Nx は、Nx 社が開発するモノレポのビルドシステムである[^home]。ワークスペースの中のプロジェクトとその依存をグラフにし、タスクのキャッシュと影響の検出に使う。2026年のサイトは、自身を「開発者と AI のエージェントの両方を強くするモノレポのプラットフォーム」と呼んでいる[^home]。

## 歴史

最初のコミットは2017年8月10日で、Victor Savkin が書いた[^first-commit]。会社は当初 Nrwl と名乗り、のちに製品と同じ Nx を名乗るようになった。リポジトリは今も nrwl/nx にある。2022年11月に860万ドル、2023年9月にシリーズ A で1,600万ドルを集めた[^blog]。

2022年5月には、作者が手放していた [Lerna](/sloppedia/lerna) の保守を引き受けた[^lerna]。2026年2月25日には、Linux Foundation と Agentic AI Foundation に加わったと発表した[^blog]。

| バージョン | 日付           | 主な変更                                    |
| ---------- | -------------- | ------------------------------------------- |
| 22.7       | 2026年4月27日  | タスクのサンドボックス                      |
| 23         | 2026年6月17日  | .NET の対応が正式になった                   |
| 23.2       | 2026年9月3日   | [Oxlint](/sloppedia/oxlint) と Oxfmt の対応 |
| 24         | 2026年10月21日 | タスク単位の影響の検出、`waitFor`           |

## 仕組み

Nx は、`package.json` や `project.json`、各言語のマニフェストからプロジェクトを見つける。見つけ方はプラグインが受け持つ。プロジェクトどうしの依存は、マニフェストとソースコードの import から推論する[^home]。

タスクは、このグラフの上で依存の順に並列で動く。入力が同じタスクは、ローカルかリモートのキャッシュから結果を戻す。リモートのキャッシュと分散実行は、有料の Nx Cloud が担う。2026年のサイトは、これを Ultracache と呼んでいる[^home]。

## 可視化

`nx graph` は、プロジェクトのグラフをブラウザーの対話的な画面で見せる[^nx-commands]。プロジェクトを選んで絞り込んだり、フォルダーごとにまとめたりできる。`--file` に渡す名前の拡張子で、JSON か持ち運べる HTML に書き出す。

## AI との連携

Nx は MCP のサーバー `nx mcp` を持つ[^nx-mcp]。2026年2月17日の記事「Why we deleted (most of) our MCP tools」で、Nx はツールの数を大きく減らしたと書いた[^blog]。エージェントには、ツールを並べるより CLI と文書を読ませるほうがよいという判断である。今の `nx mcp` は、既定で最小の構成で動く[^nx-mcp]。6月26日には、複数のリポジトリにまたがってエージェントを動かす Polygraph を発表した[^blog]。

## monorepo.tools

Nx は、モノレポの道具を比べるサイト [monorepo.tools](/sloppedia/monorepo-tools) を運営している。比較の表には Nx 自身も並び、「標準で対応」の欄が最も多い道具として載っている。

## 関連項目

- [Lerna](/sloppedia/lerna)
- [Turborepo](/sloppedia/turborepo)
- [monorepo.tools](/sloppedia/monorepo-tools)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)

[^home]: Nx「[Nx](https://nx.dev/)」。2026年11月9日に閲覧。

[^blog]: Nx「[Nx Blog](https://nx.dev/blog)」。2026年11月9日に閲覧。

[^first-commit]: vsavkin「[initial commit](https://github.com/nrwl/nx/commit/7ac762c7)」nrwl/nx、2017年8月10日。

[^lerna]: Nx「[Lerna is dead — Long Live Lerna](https://nx.dev/blog/lerna-is-dead-long-live-lerna)」Nx Blog、2022年5月11日。

[^nx-commands]: Nx「[Nx Commands](https://nx.dev/docs/reference/nx-commands)」。2026年11月9日に閲覧。

[^nx-mcp]: Nx「[Nx MCP](https://nx.dev/docs/reference/nx-mcp)」。2026年11月9日に閲覧。
