---
title: "tsdown"
description: "Rolldown の上に作られた、TypeScript と JavaScript のライブラリ向けのバンドラー。型定義の生成と複数の出力の形式を既定で持つ。Kevin Deng が作り、Rolldown の公式のプロジェクトになっている。"
tags: ["バンドラー", "TypeScript", "JavaScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Kevin Deng（三咲智子）"
  - label: "npm への初公開"
    value: "2024年3月29日"
  - label: "最新のリリース"
    value: "0.23.7（2026年11月6日）"
  - label: "土台"
    value: "Rolldown"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "tsdown.dev"
    href: "https://tsdown.dev/"
---

tsdown は、TypeScript と JavaScript のライブラリをまとめるためのバンドラーである[^guide]。[Rolldown](/sloppedia/rolldown) の上に作られ、ライブラリの作者が要る機能を設定なしで使えるようにしている[^guide]。

Rolldown の公式のプロジェクトで、npm のパッケージの作者には Kevin Deng の名がある[^guide][^npm]。[Vite+](/sloppedia/vite-plus) の `vp pack` は、tsdown でライブラリや単体で動く実行ファイルを作る[^vite-plus-1]。

## Rolldown との違い

Rolldown は、アプリとライブラリの両方を扱える汎用のバンドラーである。tsdown はそこから、ライブラリを作る用途に絞って既定値を決めた[^guide]。

| 機能         | 中身                                                        |
| ------------ | ----------------------------------------------------------- |
| 型定義の生成 | `.d.ts` のファイルを自動で作る                              |
| 出力の形式   | ESM、CommonJS、IIFE、UMD を出し分ける                       |
| 最適化       | 不要なコードの削除、圧縮、ソースマップを組み込みで持つ      |
| プラグイン   | Rolldown のプラグインと、多くの Rollup のプラグインが使える |

表は tsdown の公式の文書に基づく[^guide]。公式の文書は、Vite のライブラリモードもいずれ tsdown の上に作られる見込みだと書いている[^guide]。

## 歴史

npm の 0.1.0 は2024年3月29日に出た[^npm]。0.22.0 は Rolldown の 1.0 と同じ2026年5月7日に出て、Rolldown 1.0 を使うようになった[^npm][^release-0220]。0.23.0 は2026年9月3日に出た[^npm]。

2026年11月の時点でもバージョンは 0.x のままで、0.23 の系列のリリースが続いている[^npm]。

## 使われ方

tsup を使っていたプロジェクトの移り先として選ばれている。Vite+ の `vp migrate` は、tsup から tsdown への移行に対応した[^recap-aug]。

[^guide]: tsdown「[Introduction](https://tsdown.dev/guide/)」。2026年11月7日に閲覧。

[^npm]: npm「[tsdown](https://www.npmjs.com/package/tsdown)」。2026年11月7日に閲覧。

[^release-0220]: tsdown「[Release v0.22.0](https://github.com/rolldown/tsdown/releases/tag/v0.22.0)」GitHub。

[^vite-plus-1]: Alexander Lichter ほか「[Announcing Vite+ 1.0](https://voidzero.dev/posts/announcing-vite-plus-1-0)」VoidZero、2026年9月28日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。
