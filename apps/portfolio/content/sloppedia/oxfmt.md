---
title: "Oxfmt"
description: "Oxc の一部として Rust で書かれた、Prettier と互換のコード整形ツール。Prettier より30倍以上速い。2026年2月にベータになり、2026年11月の時点でも 0.x のバージョンが続いている。"
tags: ["コード整形", "Rust", "JavaScript", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Oxc（VoidZero と貢献者）"
  - label: "npm への初公開"
    value: "2025年9月10日"
  - label: "ベータ"
    value: "2026年2月24日"
  - label: "最新のリリース"
    value: "0.77.0（2026年11月6日）"
  - label: "言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "oxc.rs"
    href: "https://oxc.rs/docs/guide/usage/formatter.html"
---

Oxfmt は、JavaScript や TypeScript などのコードを決まった形に整える整形ツールである[^beta]。[Oxc](/sloppedia/oxc) の一部として Rust で書かれ、Prettier と同じ結果を出すことを目指している[^beta]。

キャッシュを使わない最初の実行で、Prettier より30倍以上、Biome より3倍速い[^beta]。[Vite+](/sloppedia/vite-plus) の `vp check` は、Oxfmt の整形と [Oxlint](/sloppedia/oxlint) の lint をまとめて行う[^vite-plus-1]。

## 歴史

npm の `oxfmt` は2025年9月10日に初めて公開された[^npm]。アルファは2025年12月、ベータは2026年2月24日に出た[^beta]。2026年11月の時点でもバージョンは 0.x のままで、週に1つほどの速さで新しいリリースが出ている[^npm]。

## Prettier との互換

ベータで、Prettier の JavaScript と TypeScript の互換のテストをすべて通るようになった[^beta]。わずかに残った差は Prettier のチームに報告し、どちらに合わせるかを話し合っている[^beta]。

`oxfmt --migrate prettier` で Prettier の設定を移せる[^beta]。ベータの告知には、AI のコーディングアシスタントに移行を任せるためのプロンプトも載っている[^beta]。

## 扱える形式

| 分類         | 形式                                                 |
| ------------ | ---------------------------------------------------- |
| スクリプト   | JavaScript、JSX、TypeScript、TSX                     |
| データ       | JSON、JSONC、JSON5、YAML、TOML                       |
| マークアップ | HTML、Angular、Vue、Markdown、MDX、Ember、Handlebars |
| スタイル     | CSS、SCSS、Less                                      |
| その他       | GraphQL                                              |

表はベータの告知に基づく[^beta]。その後、Svelte と Astro にも対応した[^recap-may][^recap-oct]。

Prettier ではプラグインに頼っていた機能も組み込みで持つ[^beta]。Tailwind CSS のクラスの並べ替え、import の並べ替え、package.json の項目の並べ替えがそれに当たる[^beta]。テンプレート文字列の中に書いた CSS や GraphQL も整形する[^beta]。

## 2026年の動き

5月には、内部の改善で最大25% 速くなった[^recap-may]。10月からは、Markdown と HTML を外部の処理を使わず自前で整形する[^recap-oct]。これで8倍から10倍速くなった[^recap-oct]。`.conf` のファイルを JSON として扱うように、ファイルごとの整形の方法を選べる設定も入った[^recap-oct]。

ベータの時点で、vuejs/core、vercel/turborepo、getsentry/sentry-javascript などが使っていた[^beta]。8月には OpenAI の Codex のサイトのひな形が Oxfmt と Oxlint に移った[^recap-aug]。10月からは、Oxfmt が入っていれば Angular CLI がファイルの自動の整形で使う[^recap-oct]。

[^beta]: Boshen、Dunqing、Yuji Sugiura「[Oxfmt Beta](https://oxc.rs/blog/2026-02-24-oxfmt-beta)」Oxc、2026年2月24日。

[^npm]: npm「[oxfmt](https://www.npmjs.com/package/oxfmt)」。2026年11月7日に閲覧。

[^vite-plus-1]: Alexander Lichter ほか「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」VoidZero、2026年9月28日。

[^recap-may]: Alexander Lichter「[Tales from the Void: May 2026 Recap](https://voidzero.dev/posts/whats-new-may-2026)」VoidZero、2026年6月10日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
