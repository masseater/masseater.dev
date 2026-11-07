---
title: "Rolldown"
description: "VoidZero が Rust で書いた JavaScript のバンドラー。Rollup のプラグインの仕組みと esbuild 並みの速さを兼ね、Vite 8 の既定のバンドラーになった。2026年5月に 1.0 が出た。"
tags: ["バンドラー", "Rust", "JavaScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "VoidZero と貢献者"
  - label: "最初の公開"
    value: "0.10.1（2024年4月）"
  - label: "安定リリース"
    value: "1.0.0（2026年5月7日）"
  - label: "最新のリリース"
    value: "1.3.0（2026年11月5日）"
  - label: "言語"
    value: "Rust"
  - label: "土台"
    value: "Oxc"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "rolldown.rs"
    href: "https://rolldown.rs/"
---

Rolldown は、Rust で書いた JavaScript のバンドラーである[^rolldown-1]。Rollup と同じプラグインの仕組みを持ちながら、esbuild に並ぶ速さで動く[^rolldown-1]。[VoidZero](/sloppedia/voidzero) は、[Vite](/sloppedia/vite) が使い分けていた2つのバンドラーを1つにまとめる目的で Rolldown を作った[^rolldown-1]。Vite 8 からは、これが既定のバンドラーになっている[^vite8]。

構文の解析や圧縮のような言語の処理には [Oxc](/sloppedia/oxc) を使う[^rolldown-1]。2026年5月7日に 1.0 が出た[^rolldown-1]。

## 背景

Vite は、開発中の変換に esbuild を、本番のバンドルに Rollup を使っていた[^vite8]。変換の流れとプラグインの仕組みが2つずつになり、両者をつなぐコードも増えた[^rolldown-1]。Rolldown は、esbuild の速さと Rollup のプラグインの仕組みを1つにまとめ、どちらにもない機能を足すことを目指した[^rolldown-1]。

## 歴史

| 時期       | 出来事                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| 2024年4月  | 0.10.1 を初めて公開した                                                   |
| 2024年12月 | 1.0.0-beta.1 で、1.0 の範囲を決めた                                       |
| 2025年5月  | Vite に組み込んだ rolldown-vite を技術プレビューとして出した              |
| 2025年12月 | Rolldown を既定にした Vite 8 のベータが出た                               |
| 2026年1月  | 1.0 のリリース候補で API を固めた                                         |
| 2026年3月  | Vite 8 の安定したリリースが出て、すべての Vite の利用者が使うようになった |
| 2026年5月  | 1.0 が出た                                                                |

表は VoidZero の 1.0 の告知に基づく[^rolldown-1]。1.0 では、オプションの名前と型とプラグインのフックの形を固め、試験的な機能を除いて壊す変更をしないと約束した[^rolldown-1]。不要なコードの削除や分割の方法のような出力の中身は、引き続き改善していく[^rolldown-1]。

## 特徴

Rollup より10倍から30倍速く、プロジェクトが大きいほど差が開く[^rolldown-1]。Ramp はビルドの時間を57%、Beehiiv は64% 縮めた[^rolldown-1]。

JavaScript で書いたプラグインを呼ぶたびに Rust と JavaScript の間を行き来すると遅くなる。そこで、プラグインがファイルの名前や中身の条件を宣言できる「フックのフィルター」を設けた。条件に合わないファイルでは JavaScript を呼ばない[^rolldown-1]。よく使われる Rollup のプラグインの一部は、Rust で書いた組み込みのプラグインに置き換えられる[^rolldown-1]。

出力を小さくする工夫として、`@__PURE__` などの印を使う不要なコードの削除や、TypeScript の `const enum` の埋め込みがある[^rolldown-1]。webpack に似た規則でチャンクを細かく分けられ、Framer はこの機能でチャンクを67% 減らした[^rolldown-1]。

## 2026年の動き

1.0 のあとも、大きなビルドでのメモリの上限を約21% 減らした[^recap-jul]。プロパティ名の短縮にも対応した[^recap-aug]。1.2.12 では、細かいチャンクを読み込み先に埋め込む試験的な `inlineCommonChunks` が入った[^recap-sep]。

Angular CLI は、チャンクを最適化する部品を Rollup から Rolldown に替えた[^recap-jul]。ライブラリを作るための [tsdown](/sloppedia/tsdown) は、Rolldown の公式のプロジェクトである[^tsdown]。

[^rolldown-1]: VoidZero「[Announcing Rolldown 1.0](https://voidzero.dev/posts/announcing-rolldown-1-0)」2026年5月7日。

[^vite8]: Vite「[Vite 8.0 is out!](https://vite.dev/blog/announcing-vite8)」2026年3月12日。

[^tsdown]: tsdown「[Introduction](https://tsdown.dev/guide/)」。2026年11月7日に閲覧。

[^recap-jul]: Alexander Lichter「[Tales from the Void: July 2026 Recap](https://voidzero.dev/posts/whats-new-jul-2026)」VoidZero、2026年8月12日。

[^recap-aug]: Alexander Lichter「[Tales from the Void: August 2026 Recap](https://voidzero.dev/posts/whats-new-aug-2026)」VoidZero、2026年9月2日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。
