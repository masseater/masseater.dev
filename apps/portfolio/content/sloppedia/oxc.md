---
title: "Oxc"
description: "Rust で書いた JavaScript と TypeScript の言語処理の部品集。構文解析、変換、圧縮、モジュールの解決のほか、lint の Oxlint と整形の Oxfmt を含む。Boshen Chen が始め、VoidZero が開発している。"
tags: ["コンパイラー", "Rust", "JavaScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "正式名称"
    value: "The JavaScript Oxidation Compiler"
  - label: "作者"
    value: "Boshen Chen"
  - label: "開発"
    value: "VoidZero と貢献者"
  - label: "crates.io への初公開"
    value: "2023年7月6日"
  - label: "最新のリリース"
    value: "0.157.0（2026年11月）"
  - label: "言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "oxc.rs"
    href: "https://oxc.rs/"
---

Oxc は、Rust で書いた JavaScript と TypeScript の言語処理の部品集である。正式名称は The JavaScript Oxidation Compiler で、構文解析、変換、圧縮、モジュールの解決の部品を持つ[^intro]。lint の [Oxlint](/sloppedia/oxlint) と整形の [Oxfmt](/sloppedia/oxfmt) も Oxc の一部である[^intro]。

作者は Boshen Chen で、[VoidZero](/sloppedia/voidzero) が開発している[^about]。VoidZero のツールはすべて Oxc の上に作られている[^vz-cloudflare]。

## 部品

| 部品        | 中身                                                                |
| ----------- | ------------------------------------------------------------------- |
| Parser      | JavaScript と TypeScript を構文木にする                             |
| Transformer | TypeScript や JSX、新しい構文を変換する。Babel に相当する変換を持つ |
| Minifier    | 本番向けに圧縮する                                                  |
| Resolver    | モジュールの読み込み先を解決する                                    |
| oxc-node    | Node.js で TypeScript と JSX を直接動かす                           |
| Oxlint      | lint                                                                |
| Oxfmt       | 整形                                                                |
| tsrs        | 型の検査。試験的                                                    |

表は Oxc の公式の文書に基づく[^intro][^typechecker]。部品は Rust の crate としても、npm の `oxc-parser`・`oxc-transform`・`oxc-minify` などとしても使える[^npm]。

## 歴史

crates.io の `oxc` は2023年7月6日に作られた[^crates]。Oxlint は2023年12月に初めて告知され、2025年6月に 1.0 になった[^oxlint-1]。

VoidZero は、Oxc の構文解析と解決の部品を固め、速くしてきた[^vz-cloudflare]。その上で Babel に相当する変換と圧縮の部品を作り、[Rolldown](/sloppedia/rolldown) の言語の処理を担わせた[^vz-cloudflare][^rolldown-1]。Oxc の crate は、VoidZero の外のツールでも広く使われている[^vz-cloudflare]。

## 2026年の動き

2026年8月18日、Oxc は React Compiler を Babel なしで動かせるようにした[^recap-aug]。`oxc-transform-react` は、Babel で動かす React Compiler より12倍から15倍速い[^recap-aug]。100を超える人気のリポジトリの10万を超えるファイルで、Babel で動かした場合と同じ結果になることを確かめた[^recap-aug]。

oxc-minify は、privatenumber の圧縮ツールの比較で総合1位になった[^recap-sep]。10月には oxc-node の 1.0 が出た[^recap-oct]。[Vite+](/sloppedia/vite-plus) の `vpx` は、これを使って TypeScript を直接動かす[^recap-oct]。

同じ10月、TypeScript のコンパイラーを Rust に移す [tsrs](/sloppedia/tsrs) が Oxc の配下で公開された[^recap-oct][^typechecker]。

Oxc を使う外部のツールも増えた。Angular は TypeScript 7 を使う次のコンパイラーで Oxc を使う[^recap-sep]。Expo SDK 58 のベータは、Oxc で作った Metro の変換を試験的に入れた[^recap-oct]。SolidJS の変換も Oxc を使って Rust で書き直されている[^recap-jul]。

[^intro]: Oxc「[Getting Started](https://oxc.rs/docs/guide/introduction.html)」。2026年11月7日に閲覧。

[^typechecker]: Oxc「[Type Checker](https://oxc.rs/docs/guide/usage/typechecker.html)」。2026年11月7日に閲覧。

[^about]: VoidZero「[About](https://voidzero.dev/about)」。2026年11月7日に閲覧。

[^npm]: npm「[oxc-parser](https://www.npmjs.com/package/oxc-parser)」。2026年11月7日に閲覧。

[^crates]: crates.io「[oxc](https://crates.io/crates/oxc)」。2026年11月7日に閲覧。

[^oxlint-1]: Oxc「[Oxlint v1.0 Stable](https://oxc.rs/blog/2025-06-10-oxlint-stable)」2025年6月10日。

[^rolldown-1]: VoidZero「[Announcing Rolldown 1.0](https://voidzero.dev/posts/announcing-rolldown-1-0)」2026年5月7日。

[^vz-cloudflare]: Evan You「[VoidZero is joining Cloudflare](https://voidzero.dev/posts/voidzero-cloudflare)」VoidZero、2026年6月4日。

[^recap-jul]: Alexander Lichter「[Tales from the Void: July 2026 Recap](https://voidzero.dev/posts/whats-new-jul-2026)」VoidZero、2026年8月12日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
