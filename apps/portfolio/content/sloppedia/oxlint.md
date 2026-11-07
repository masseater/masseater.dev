---
title: "Oxlint"
description: "Oxc の一部として Rust で書かれた、JavaScript と TypeScript の lint ツール。ESLint より50倍から100倍速い。2025年6月に 1.0 が出て、2026年には型情報を使う lint も安定した。"
tags: ["lint", "Rust", "JavaScript", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Oxc（VoidZero と貢献者）"
  - label: "初めての告知"
    value: "2023年12月"
  - label: "安定リリース"
    value: "1.0（2025年6月10日）"
  - label: "最新のリリース"
    value: "1.92.0（2026年11月6日）"
  - label: "言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "oxc.rs"
    href: "https://oxc.rs/docs/guide/usage/linter.html"
---

Oxlint は、JavaScript と TypeScript のコードを検査する lint ツールである[^oxlint-1]。[Oxc](/sloppedia/oxc) の一部として Rust で書かれ、同じ設定の ESLint より50倍から100倍速い[^oxlint-1]。

[VoidZero](/sloppedia/voidzero) が開発を担い、[Vite+](/sloppedia/vite-plus) の `vp check` と `vp lint` の中身になっている[^vite-plus-1]。型情報を使う規則は、別のプログラムの [tsgolint](/sloppedia/tsgolint) が受け持つ[^type-aware]。

## 歴史

| 時期          | 出来事                                                |
| ------------- | ----------------------------------------------------- |
| 2023年12月    | 初めて告知された                                      |
| 2025年6月10日 | 1.0 が出た                                            |
| 2025年10月    | JavaScript で書いたプラグインの技術プレビューを出した |
| 2025年12月    | 型情報を使う lint のアルファを出した                  |
| 2026年3月11日 | JavaScript のプラグインがアルファになった             |
| 2026年7月22日 | 型情報を使う lint が安定した                          |

表は Oxc の公式のブログに基づく[^oxlint-1][^js-plugins][^type-aware]。

1.0 の時点で、ESLint の規則のほかに unicorn や jsdoc や React などの人気のプラグインの規則を含む500を超える規則を持っていた[^oxlint-1]。設定は `.oxlintrc.json` に書き、形は ESLint 8 の flat config に似せた[^oxlint-1]。既存の ESLint の設定は oxlint-migrate で移せる[^oxlint-1]。

## 速さ

公式のベンチマークでは、複数のスレッドの Oxlint が615ミリ秒、ESLint が33.5秒かかった[^oxlint-1]。1秒あたりおよそ1万のファイルを検査できる[^oxlint-1]。

Airbnb は、12万6,000を超えるファイルで循環する import を見つける規則を CI で7秒で終えている。ESLint の同じ規則は時間切れになっていた[^oxlint-1]。Mercedes-Benz は ESLint から移って lint の時間を71% 縮めた[^oxlint-1]。

## JavaScript のプラグイン

Rust で書いた規則は2026年3月の時点で650を超えていた[^js-plugins]。足りない規則は、ESLint と同じ API の JavaScript のプラグインで補う[^js-plugins]。既存の ESLint のプラグインの多くは手を入れずに動き、自分の規則も JavaScript か TypeScript で書ける[^js-plugins]。

アルファの告知は、ESLint の利用者の8割が Oxlint に移っても「そのまま動く」と見込んでいる[^js-plugins]。ESLint の組み込みの規則の33,006件のテストは、すべて通った[^js-plugins]。Node.js のリポジトリの lint は、ESLint の1分43秒から21秒に縮んだ[^js-plugins]。

Svelte や Vue のような独自のファイルの形式と、型情報を使う自作の規則にはまだ対応していない[^js-plugins]。

## 型情報を使う lint

`no-floating-promises` のように型を知らないと判定できない規則は、TypeScript の型検査器が要る。Oxlint では、[TypeScript 7](/sloppedia/typescript-7) の上で動く tsgolint がこの仕事を受け持つ[^type-aware]。

`oxlint --type-aware` で型情報を使う規則が、`--type-check` で TypeScript のコンパイルのエラーが加わる[^type-aware]。どちらも同じ TypeScript のプログラムを使い回すので、型検査を別に走らせるより速い[^type-aware]。

## 2026年の動き

5月には、診断を1行ずつ出して要約を省く、コーディングエージェント向けの出力の形が入った[^recap-may]。6月には、Vite の React のひな形が既定で Oxlint を使うようになった[^recap-jun]。

8月には、React Compiler の解析を使う22の規則が入った[^recap-aug]。10月には、[Vite](/sloppedia/vite) のリポジトリ自身も lint を Oxlint に移した[^recap-oct]。Linear も CI の見直しで Oxlint に移っている[^recap-oct]。

[^oxlint-1]: Oxc「[Oxlint v1.0 Stable](https://oxc.rs/blog/2025-06-10-oxlint-stable)」2025年6月10日。

[^js-plugins]: overlookmotel、Cameron「[Oxlint JS Plugins Alpha](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)」Oxc、2026年3月11日。

[^type-aware]: Cameron「[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)」Oxc、2026年7月22日。

[^vite-plus-1]: Alexander Lichter ほか「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」VoidZero、2026年9月28日。

[^recap-may]: Alexander Lichter「[Tales from the Void: May 2026 Recap](https://voidzero.dev/posts/whats-new-may-2026)」VoidZero、2026年6月10日。

[^recap-jun]: Alexander Lichter「[Tales from the Void: June 2026 Recap](https://voidzero.dev/posts/whats-new-jun-2026)」VoidZero、2026年7月10日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
