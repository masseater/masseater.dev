---
title: "Madge"
description: "JavaScript と TypeScript のモジュールの依存をグラフにし、Graphviz で画像に描く道具。循環する依存を見つけるのにも使われる。2024年8月の 8.0.0 を最後にリリースが止まっている。"
tags: ["静的解析", "JavaScript", "可視化"]
published: true
infobox:
  - label: "作者"
    value: "Patrik Henningsson"
  - label: "最初のコミット"
    value: "2012年5月20日"
  - label: "最新のリリース"
    value: "8.0.0（2024年8月5日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/pahen/madge"
    href: "https://github.com/pahen/madge"
---

Madge は、JavaScript と TypeScript のモジュールの依存をグラフにする道具である[^repo]。ファイルどうしの import や require をたどり、依存を一覧や図にする。図は Graphviz で描く[^repo]。

## 歴史

最初のコミットは2012年5月20日で、Patrik Henningsson が書いた[^first-commit]。CommonJS と AMD の時代に生まれ、のちに ES のモジュールや TypeScript にも対応した。最新のリリースは2024年8月5日の 8.0.0 で、2026年11月の時点ではその後のリリースが無い[^repo]。

## 使い方

主な使い方は次のとおりである[^repo]。

| 命令                           | 出力               |
| ------------------------------ | ------------------ |
| `madge --image graph.svg src/` | 依存の図の画像     |
| `madge --circular src/`        | 循環する依存の一覧 |
| `madge --dot`、`madge --json`  | DOT か JSON の依存 |

## 位置づけ

Madge は、ファイルの粒度の依存を手早く図にする道具として長く使われてきた。同じ粒度を見る道具には、規則での検査を持つ [dependency-cruiser](/sloppedia/dependency-cruiser) や、コードベース全体を解析する [fallow](/sloppedia/fallow) がある。

## 関連項目

- [dependency-cruiser](/sloppedia/dependency-cruiser)
- [fallow](/sloppedia/fallow)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)

[^repo]: 「[pahen/madge](https://github.com/pahen/madge)」GitHub。2026年11月9日に閲覧。

[^first-commit]: Patrik Henningsson「[Madge の最初のコミット](https://github.com/pahen/madge/commit/c730a52)」pahen/madge、2012年5月20日。
