---
title: "Lerna"
description: "JavaScript のモノレポで複数のパッケージを管理し、まとめて公開するための道具。Babel の開発から生まれ、2022年からは Nx のチームが保守している。"
tags: ["モノレポ", "JavaScript", "Nx", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Sebastian McKenzie"
  - label: "保守"
    value: "Nx（2022年5月から）"
  - label: "最初のコミット"
    value: "2015年12月4日"
  - label: "最新のリリース"
    value: "10.1.2（2026年11月6日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "lerna.js.org"
    href: "https://lerna.js.org/"
---

Lerna は、JavaScript のモノレポで複数のパッケージを管理し、まとめて npm に公開するための道具である[^home]。各パッケージのバージョンの上げ方と公開を受け持ち、タスクの実行は [Nx](/sloppedia/nx) に任せている。

## 歴史

最初のコミットは2015年12月4日で、Sebastian McKenzie が書いた[^first-commit]。McKenzie は JavaScript のコンパイラー Babel の作者である。Babel は多くのパッケージを1つのリポジトリで持っており、それを公開するために Lerna が生まれた。

その後、Lerna の開発は止まりかけた。2022年5月11日、Nx の会社は記事「Lerna is dead — Long Live Lerna」で保守を引き受けたと発表した[^long-live]。同年10月の v6 からは、タスクの実行に Nx を使う。サイトの末尾は「© 2026 Copyright Nx」である[^home]。

2026年7月29日の 10.0.0 は、ESM だけで配るようになった[^releases]。対応する Node.js は ^22.13、^24、^26 で、bun でも動く[^releases]。

## 機能

主な命令は次のとおりである[^home]。

| 命令            | 役割                                                      |
| --------------- | --------------------------------------------------------- |
| `lerna version` | 変更のあったパッケージのバージョンを上げ、タグを打つ      |
| `lerna publish` | それらのパッケージを npm に公開する                       |
| `lerna run`     | 各パッケージのスクリプトを、Nx の実行とキャッシュで動かす |

## 可視化と AI

Lerna は、Nx のプロジェクトのグラフを対話的な画面で見せられる[^home]。「Lerna and AI」のページは、エージェントに Nx のグラフを通してワークスペースを理解させる方法を案内している[^ai]。

## monorepo.tools

[monorepo.tools](/sloppedia/monorepo-tools) の比較表では、Lerna の作り手は「Nx のチームが保守」と書かれている。比較の運営元と保守の担い手が同じである。

## 関連項目

- [Nx](/sloppedia/nx)
- [Turborepo](/sloppedia/turborepo)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^home]: Nx「[Lerna](https://lerna.js.org/)」。2026年11月9日に閲覧。

[^releases]: 「[Releases · lerna/lerna](https://github.com/lerna/lerna/releases)」GitHub。2026年11月9日に閲覧。

[^first-commit]: Sebastian McKenzie「[Lerna の最初のコミット](https://github.com/lerna/lerna/commit/e9b2ac3)」lerna/lerna、2015年12月4日。

[^long-live]: Nx「[Lerna is dead — Long Live Lerna](https://nx.dev/blog/lerna-is-dead-long-live-lerna)」Nx Blog、2022年5月11日。

[^ai]: Nx「[Lerna and AI](https://lerna.js.org/docs/lerna-and-ai)」。2026年11月9日に閲覧。
