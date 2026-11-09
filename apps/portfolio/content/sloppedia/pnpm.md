---
title: "pnpm"
description: "Node.js のパッケージマネージャー。パッケージを1か所のストアに置いてハードリンクで配り、厳しい node_modules とワークスペースを持つ。2026年に Rust で書き直された。"
tags: ["パッケージマネージャー", "Node.js", "モノレポ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Rico Sta. Cruz"
  - label: "保守"
    value: "Zoltan Kochan ほか"
  - label: "最初のコミット"
    value: "2016年1月28日"
  - label: "1.0"
    value: "2017年6月28日"
  - label: "最新のリリース"
    value: "12.18.0（2026年11月5日）"
  - label: "実装の言語"
    value: "Rust（12.0 から）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "pnpm.io"
    href: "https://pnpm.io/"
---

pnpm は、Node.js のパッケージマネージャーである[^home]。名前は「performant npm」に由来する。パッケージをディスクの1か所に置き、各プロジェクトへはハードリンクで配るので、同じパッケージを何度も複製しない[^home]。

## 歴史

最初のコミットは2016年1月28日で、Rico Sta. Cruz が書いた[^first-commit]。ied という別のパッケージマネージャーの考えを下敷きにしている[^wikipedia]。1.0 は2017年6月28日に出た[^wikipedia]。その後の開発は Zoltan Kochan が中心になって進めている[^wikipedia]。

2026年8月26日の 12.0 で、pnpm は Rust で書き直された[^wikipedia]。12.4.0 からは Cargo と Python の依存も試験的に入れられる[^cargo]。12.11.0 からは、`rust-toolchain.toml` に書いた Rust のツールチェーンも `pnpm install` が入れる[^cargo]。

## 仕組み

### 内容で引くストア

pnpm は、パッケージをストアに置く。ストアは、ファイルの中身のハッシュを鍵にして引く[^home]。バージョンが違っても中身が同じファイルは1つしか持たない。各プロジェクトの `node_modules` には、ストアからハードリンクを張る。

### 厳しい node_modules

npm や Yarn の平らな `node_modules` では、`package.json` に書いていないパッケージも読めてしまう。pnpm の `node_modules` は、直接の依存だけを見える場所に置く[^home]。宣言していない依存を読むコードは、pnpm の下では動かない。

### ワークスペース

`pnpm-workspace.yaml` に並べたディレクトリを、1つのワークスペースとして扱う。`--filter` で対象のパッケージを絞り、依存の順に `pnpm run` を流せる。カタログを使うと、依存のバージョンを1か所にまとめられる[^home]。

## 供給網の攻撃への備え

近年のリリースは、悪意のあるパッケージへの備えを既定で強めている。公開から1日たっていないバージョンは、既定では入れない（`minimumReleaseAge`）[^home]。依存のインストールスクリプトは、許した分だけを動かす[^home]。12.18.0 では、エージェント用のスキルも1つずつ承認して入れる形になった[^releases]。

## モノレポの可視化

pnpm は依存のグラフを描く機能を持たない。`pnpm list --recursive --json` や `pnpm why` で、依存を文字で出せるだけである。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 評価

Sloppedia の持ち主の masseater は、自分のリポジトリで pnpm を使っている。日々のコマンドは [Vite+](/sloppedia/vite-plus) の `vp` から呼び、pnpm を直接は叩かない。

## 関連項目

- [モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)
- [Vite+](/sloppedia/vite-plus)
- [Cargo](/sloppedia/cargo)
- [uv](/sloppedia/uv)

[^home]: pnpm「[pnpm](https://pnpm.io/)」。2026年11月9日に閲覧。

[^releases]: 「[Releases · pnpm/pnpm](https://github.com/pnpm/pnpm/releases)」GitHub。2026年11月9日に閲覧。

[^wikipedia]: 「[pnpm](https://en.wikipedia.org/wiki/Pnpm)」Wikipedia。2026年11月9日に閲覧。

[^first-commit]: Rico Sta. Cruz「[initial commit](https://github.com/pnpm/pnpm/commit/4b42e5fc)」pnpm/pnpm、2016年1月28日。

[^cargo]: pnpm「[Cargo](https://pnpm.io/cargo)」。2026年11月9日に閲覧。
