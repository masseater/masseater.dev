---
title: "Cargo"
description: "Rust の公式のビルドの道具兼パッケージマネージャー。crate の依存を解決し、ビルド、テスト、公開を受け持つ。複数の crate をワークスペースにまとめられる。"
tags: ["Rust", "パッケージマネージャー", "ビルドシステム", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Rust プロジェクト"
  - label: "最初のコミット"
    value: "2014年3月4日"
  - label: "Rust 1.0"
    value: "2015年5月15日"
  - label: "最新のリリース"
    value: "Rust 1.99.1（2026年10月15日）"
  - label: "ライセンス"
    value: "MIT License または Apache License 2.0"
  - label: "URL"
    value: "doc.rust-lang.org/cargo"
    href: "https://doc.rust-lang.org/cargo/"
---

Cargo は、Rust の公式のビルドの道具兼パッケージマネージャーである[^book]。`Cargo.toml` に書いた依存を crates.io などから取ってきて、Rust のコードをビルドする。テスト、文書の生成、crates.io への公開も受け持つ[^book]。

## 歴史

Cargo のリポジトリの最初のコミットは2014年3月4日である[^first-commit]。作者の欄は「Carlhuda」で、初期のコミットの多くは Carl Lerche と Yehuda Katz が書いた[^repo]。2人は Ruby の Bundler の開発者でもある。Cargo は、2015年5月15日の Rust 1.0 とともに公式の道具になった。

Cargo は Rust のツールチェーンと同じく、6週間ごとに出る。2026年11月9日の時点の最新は、10月15日の Rust 1.99.1 に付く Cargo である[^rust-1-99-1]。

## ワークスペース

複数の crate は、ルートの `Cargo.toml` の `[workspace]` で1つのワークスペースにまとめられる[^workspaces]。ワークスペースの crate は、1つの `Cargo.lock` と出力のディレクトリを共有する。crate どうしは `path` で依存を書く。

## 構造を読む

`cargo metadata` は、ワークスペースの crate と依存を JSON で出す[^metadata]。`--no-deps` を付けると、外部の依存を除いてワークスペースの中だけを出す。Cargo そのものは依存の図を描かないが、この JSON から図を作れる。`cargo tree` は依存を木の形の文字で出す。

## JavaScript のモノレポとの関係

[pnpm](/sloppedia/pnpm) や [Turborepo](/sloppedia/turborepo)、[Vite Task](/sloppedia/vite-task) のような JavaScript の道具は、もともと `Cargo.toml` を読まなかった。2026年には、pnpm が Cargo の依存を試験的に入れられるようになり、Turborepo 2.11 も Cargo のワークスペースを試験的に読むようになった。[mise](/sloppedia/mise) と [moon](/sloppedia/moon) は、Cargo の path 依存をグラフの辺として読む。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 関連項目

- [pnpm](/sloppedia/pnpm)
- [uv](/sloppedia/uv)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)

[^book]: The Cargo Book「[The Cargo Book](https://doc.rust-lang.org/cargo/)」。2026年11月9日に閲覧。

[^repo]: 「[rust-lang/cargo](https://github.com/rust-lang/cargo)」GitHub。2026年11月9日に閲覧。

[^first-commit]: Carlhuda「[Cargo の最初のコミット](https://github.com/rust-lang/cargo/commit/227d4e83)」rust-lang/cargo、2014年3月4日。

[^workspaces]: The Cargo Book「[Workspaces](https://doc.rust-lang.org/cargo/reference/workspaces.html)」。2026年11月9日に閲覧。

[^metadata]: The Cargo Book「[cargo metadata](https://doc.rust-lang.org/cargo/commands/cargo-metadata.html)」。2026年11月9日に閲覧。

[^rust-1-99-1]: The Rust Release Team「[Announcing Rust 1.99.1](https://blog.rust-lang.org/2026/10/15/Rust-1.99.1/)」Rust Blog、2026年10月15日。
