---
title: "Buck2"
description: "Meta が Rust で書いたビルドシステム。Facebook の Buck を書き直したもので、規則を Starlark で書き、リモートでの実行を前提に設計されている。"
tags: ["ビルドシステム", "モノレポ", "Meta", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Meta"
  - label: "Buck の公開"
    value: "2013年"
  - label: "Buck2 の公開"
    value: "2023年4月"
  - label: "最新のリリース"
    value: "2026-11-01（日付のタグ）"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License または Apache License 2.0"
  - label: "URL"
    value: "buck2.build"
    href: "https://buck2.build/"
---

Buck2 は、Meta が Rust で書いたビルドシステムである[^home]。Facebook の社内で使われていた Buck を、一から書き直したものである[^why]。BUILD ファイルにターゲットを書く点は [Bazel](/sloppedia/bazel) と同じで、規則も [Starlark](/sloppedia/starlark) で書く[^home]。

## 歴史

最初の Buck は、Facebook の Michael Bolin が作り、2013年に公開された[^wikipedia]。Java で書かれ、Android のアプリのビルドを速くするために生まれた。

Buck2 のリポジトリの最初のコミットは2022年12月1日である[^first-commit]。Meta は2023年4月に Buck2 をオープンソースとして公開した[^wikipedia]。リリースには日付のタグを付けており、2026年11月の時点ではすべてがプレリリースの扱いである[^releases]。

## 設計

Buck2 の文書は、Buck1 や Bazel と比べた違いを次のように挙げる[^why]。

1つ目に、言語ごとの規則をコアに持たない。すべての規則を Starlark で書き、コアは言語を知らない。2つ目に、リモートでの実行を前提にする。ローカルでの実行は、その特別な場合として扱う。3つ目に、1つのビルドのグラフを増分で更新し、毎回作り直さない。4つ目に、規則は密閉されていて、宣言していない入力を読めない。

## 問い合わせ

`buck2 cquery` と `buck2 uquery` は、ターゲットの依存を問い合わせる[^home]。BXL（Buck eXtension Language）を使うと、ビルドのグラフを Starlark のスクリプトから読める[^home]。依存の図は、問い合わせの結果を DOT で出して描く。

## 関連項目

- [Bazel](/sloppedia/bazel)
- [Pants](/sloppedia/pants)
- [Starlark](/sloppedia/starlark)

[^home]: Meta「[Buck2](https://buck2.build/)」。2026年11月9日に閲覧。

[^why]: Meta「[Why Buck2](https://buck2.build/docs/about/why/)」。2026年11月9日に閲覧。

[^releases]: 「[Releases · facebook/buck2](https://github.com/facebook/buck2/releases)」GitHub。2026年11月9日に閲覧。

[^wikipedia]: 「[Buck (software)](<https://en.wikipedia.org/wiki/Buck_(software)>)」Wikipedia。2026年11月9日に閲覧。

[^first-commit]: 「[facebook/buck2 の最初のコミット](https://github.com/facebook/buck2/commit/9080cce1)」facebook/buck2、2022年12月1日。
