---
title: "Pants"
description: "Twitter の社内の道具から生まれたビルドシステム。2020年の v2 で Rust のエンジンと Python の規則に書き直し、BUILD ファイルの依存の多くを import から推論する。"
tags: ["ビルドシステム", "モノレポ", "Python", "2026年のソフトウェア"]
published: true
infobox:
  - label: "最初のコミット"
    value: "2011年3月16日"
  - label: "v2 の公開"
    value: "2020年10月27日"
  - label: "最新のリリース"
    value: "2.33.2（2026年11月1日）"
  - label: "実装の言語"
    value: "Rust、Python"
  - label: "ライセンス"
    value: "Apache License 2.0"
  - label: "URL"
    value: "pantsbuild.org"
    href: "https://www.pantsbuild.org/"
---

Pants は、大きなリポジトリのためのビルドシステムである[^welcome]。Python、Go、Java、Scala、Shell などを扱う。BUILD ファイルにターゲットを書くのは [Bazel](/sloppedia/bazel) と同じだが、依存の多くはソースコードの import から推論する[^welcome]。

## 歴史

最初のコミットは2011年3月16日で、John Sirois が「Initial commit of twitter-commons」として書いた[^first-commit]。Pants はもともと Twitter の社内の道具だった。最初の v1 は、Twitter、Foursquare、Square などで使われた[^v2]。

2020年10月27日、Pants は v2 を出した[^v2]。エンジンを Rust で、規則を型の付いた Python で書き直した大きな改修である。発表の記事は Benjy Weinberger が書いた[^v2]。開発は有志のコミュニティが担い、Toolchain などの会社が支えている[^welcome]。

2026年は、2.33.0 が7月31日に、2.33.2 が11月1日に出た[^releases]。11月8日には 2.34.0a0 が出ている[^releases]。

## 依存の推論

Pants の特徴は、依存を推論することである[^welcome]。Python の `import` や Go の `import` を読み、どのターゲットがどれに依存するかを自分で決める。開発者は、推論できない依存だけを BUILD ファイルに書けばよい。推論の結果は `pants dependencies` や `pants peek` で確かめられる[^inference]。

## 可視化

Pants は図を描く命令を持たない。`pants dependencies` と `pants dependents` が依存を一覧にし、`pants peek` がターゲットの中身を JSON で出す[^inference]。

## 関連項目

- [Bazel](/sloppedia/bazel)
- [Buck2](/sloppedia/buck2)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^welcome]: Pants「[Welcome to Pants!](https://www.pantsbuild.org/stable/docs/introduction/welcome-to-pants)」。2026年11月9日に閲覧。

[^releases]: 「[Releases · pantsbuild/pants](https://github.com/pantsbuild/pants/releases)」GitHub。2026年11月9日に閲覧。

[^first-commit]: John Sirois「[Initial commit of twitter-commons](https://github.com/pantsbuild/pants/commit/1fea5d3a)」pantsbuild/pants、2011年3月16日。

[^v2]: Benjy Weinberger「[Introducing Pants v2](https://www.pantsbuild.org/blog/2020/10/27/introducing-pants-v2)」Pants Blog、2020年10月27日。

[^inference]: Pants「[Inspecting dependency inference results](https://www.pantsbuild.org/blog/2024/01/25/inspecting-dependency-inference-results)」Pants Blog、2024年1月25日。
