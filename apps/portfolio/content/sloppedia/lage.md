---
title: "Lage"
description: "Microsoft が作る JavaScript のモノレポのタスクランナー。npm のスクリプトを依存の順に並列で動かし、結果をキャッシュする。"
tags: ["タスクランナー", "モノレポ", "Microsoft", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Microsoft"
  - label: "最初のコミット"
    value: "2019年8月27日"
  - label: "最新のリリース"
    value: "2.17.1（2026年11月6日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "microsoft.github.io/lage"
    href: "https://microsoft.github.io/lage/"
---

Lage は、Microsoft が作る JavaScript のモノレポのためのタスクランナーである[^home]。サイトの標語は「Never build the same code twice」（同じコードを二度ビルドしない）である[^home]。

## 歴史

リポジトリの最初のコミットは2019年8月27日である[^repo]。npm への初めての公開は2020年5月9日だった[^npm]。最新のリリースは2026年11月6日の 2.17.1 である[^npm]。

## 仕組み

Lage は、各パッケージの `package.json` にある npm のスクリプトだけを動かす[^home]。`lage.config.js` の `pipeline` に、`build` は依存先の `build` の後に、のような順序を書く。順序のグラフに従って、スクリプトを並列で動かす。

入力が同じタスクは、キャッシュから結果を戻す[^home]。キャッシュは手元のほか、リモートにも置ける。

## 可視化

Lage のプロファイラーは、ビルドの記録を残し、そのグラフを可視化できる[^home]。ところが [monorepo.tools](/sloppedia/monorepo-tools) の比較表は、Lage に可視化の道具が付いてこないと書いている。比較表と各道具の文書が食い違う例である。

## 関連項目

- [Rush](/sloppedia/rush)
- [Turborepo](/sloppedia/turborepo)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^home]: Microsoft「[Lage](https://microsoft.github.io/lage/)」。2026年11月9日に閲覧。

[^repo]: 「[microsoft/lage](https://github.com/microsoft/lage)」GitHub。2026年11月9日に閲覧。

[^npm]: 「[lage](https://www.npmjs.com/package/lage)」npm。2026年11月9日に閲覧。
