---
title: "dependency-cruiser"
description: "JavaScript と TypeScript のモジュールの依存を調べ、規則で検査し、図に描く道具。Sander Verweij が2016年から開発している。"
tags: ["静的解析", "JavaScript", "TypeScript", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Sander Verweij"
  - label: "最初のコミット"
    value: "2016年11月17日"
  - label: "最新のリリース"
    value: "18.7.2（2026年11月2日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/sverweij/dependency-cruiser"
    href: "https://github.com/sverweij/dependency-cruiser"
---

dependency-cruiser は、JavaScript と TypeScript のモジュールの依存を調べる道具である[^repo]。ファイルどうしの import をたどって依存を集め、規則に照らして検査し、図に描く[^repo]。

## 歴史

最初のコミットは2016年11月17日で、Sander Verweij が書いた[^first-commit]。今も Verweij が中心になって開発しており、最新のリリースは2026年11月2日の 18.7.2 である[^repo]。

## 検査

`.dependency-cruiser.js` に、許さない依存を規則として書く[^repo]。たとえば、循環する依存、`devDependencies` への本番のコードからの依存、どこからも使われていないモジュールを禁じられる。層の間の向きを決め、内側の層が外側を読むことを禁じる使い方もある。`depcruise --init` は、よく使う規則を入れた設定を作る[^repo]。

## 可視化

dependency-cruiser は、結果を DOT、Mermaid、JSON、CSV、HTML、文字などで出す[^repo]。DOT を Graphviz に渡せば、モジュールの依存の図ができる。フォルダーごとにまとめた図や、変更されたファイルの周りだけの図も作れる。

## モノレポとの関係

dependency-cruiser が見るのは、パッケージの間ではなくファイルの間の依存である。モノレポのパッケージのグラフを描く [Nx](/sloppedia/nx) や [Turborepo](/sloppedia/turborepo) とは、見る粒度が違う。同じくファイルの粒度で依存を見る道具に、[Madge](/sloppedia/madge) と [fallow](/sloppedia/fallow) がある。

## 関連項目

- [Madge](/sloppedia/madge)
- [fallow](/sloppedia/fallow)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)

[^repo]: 「[sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser)」GitHub。2026年11月9日に閲覧。

[^first-commit]: Sander Verweij「[dependency-cruiser の最初のコミット](https://github.com/sverweij/dependency-cruiser/commit/4551a17)」sverweij/dependency-cruiser、2016年11月17日。
