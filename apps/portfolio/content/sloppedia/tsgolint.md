---
title: "tsgolint"
description: "Oxlint の型情報を使う lint を受け持つ、Go で書かれたプログラム。TypeScript 7 の型検査器をそのまま使い、typescript-eslint の型を使う規則を移している。2026年7月に安定した。"
tags: ["lint", "Go", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "auvred"
  - label: "開発"
    value: "Oxc"
  - label: "安定リリース"
    value: "7.0.2000（2026年7月21日）"
  - label: "最新のリリース"
    value: "7.0.2006（2026年11月5日）"
  - label: "土台"
    value: "TypeScript 7"
  - label: "言語"
    value: "Go"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/oxc-project/tsgolint"
    href: "https://github.com/oxc-project/tsgolint"
---

tsgolint は、[Oxlint](/sloppedia/oxlint) の型情報を使う lint を受け持つプログラムである[^stable]。Go で書かれた [TypeScript 7](/sloppedia/typescript-7) の型検査器の上に直接作られている[^stable]。

auvred が作り、[Oxc](/sloppedia/oxc) のプロジェクトとして開発されている[^stable]。npm には `oxlint-tsgolint` の名前で出ている[^npm]。

## 役割

`no-floating-promises` のように、式の型が分からないと判定できない規則がある。ESLint では typescript-eslint が TypeScript のコンパイラーの API を呼んでこうした規則を動かしていた。

Oxlint 自身は Rust で書かれており、Go の TypeScript の型検査器を直接は呼べない。そこで `oxlint --type-aware` を付けると、Oxlint は型を使う規則を tsgolint に任せる[^stable]。`--type-check` を足すと、TypeScript のコンパイルのエラーも同じプログラムで報告する[^stable]。

## バージョンの付け方

tsgolint の動きは、組み込んだ TypeScript のリリースに縛られる[^stable]。そこで 7.0.2000 から、TypeScript のバージョンの後ろに tsgolint の修正の番号を付けるようにした[^stable]。

たとえば 7.0.2000 は、TypeScript 7.0.2 の上の tsgolint の0番目の修正を指す[^stable]。TypeScript を上げると、修正の番号は0に戻る[^stable]。

## 歴史

2025年12月のアルファは、43の規則を持っていた[^stable]。2026年7月22日に安定を告知し、typescript-eslint の型を使う61の規則のうち59を持つようになった[^stable]。npm の 7.0.2000 はその前日に出た[^npm]。

7.0.2000 から、`oxlint.config.ts` や `.oxlintrc.json` の `options` で型を使う lint を有効にできる[^stable]。`oxlint --debug timings` で、規則ごとにかかった時間も出せる[^stable]。

## 速さ

ESLint と typescript-eslint の組み合わせより12倍から18倍速い[^stable]。

| リポジトリ           | ESLint と typescript-eslint | tsgolint | 倍率 |
| -------------------- | --------------------------- | -------- | ---- |
| microsoft/vscode     | 83.2秒                      | 6.96秒   | 12倍 |
| microsoft/typescript | 27.2秒                      | 1.94秒   | 14倍 |
| typeorm/typeorm      | 13.2秒                      | 0.75秒   | 18倍 |
| vuejs/core           | 12.3秒                      | 0.95秒   | 13倍 |

表は安定を告げた記事に基づき、12コアの Apple M4 Pro で測った[^stable]。

9月には、ファイルを TypeScript のプログラムに割り当てる処理が最大6倍速くなった[^recap-sep]。型検査と lint の重複を減らすために、4つの検査の順の組み方も試している[^recap-sep]。

## tsrs への移行

VoidZero は2026年10月、Oxlint の型を使う lint で使う型検査器を、Rust で書いた [tsrs](/sloppedia/tsrs) に替えると告げた[^recap-oct]。その時点で、61の規則をすべて tsrs の上で動かすとしている[^recap-oct]。

[^stable]: Cameron「[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)」Oxc、2026年7月22日。

[^npm]: npm「[oxlint-tsgolint](https://www.npmjs.com/package/oxlint-tsgolint)」。2026年11月7日に閲覧。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
