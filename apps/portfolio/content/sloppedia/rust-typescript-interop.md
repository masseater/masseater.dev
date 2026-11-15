---
title: "Rust と TypeScript の連携"
description: "Rust コードと TypeScript コードを連携させる方法。本記事では、2026年11月時点における型生成、型付き呼び出し、バインディング、およびスキーマファーストのアプローチについて解説する。"
tags: ["Rust", "TypeScript", "2026年のソフトウェア"]
published: true
---

Rust と TypeScript の連携とは、[Rust](/sloppedia/rust) で書かれたコードと [TypeScript](/sloppedia/typescript) で書かれたコードを連携させることを意味する。問題には2つの種類がある。1つは、データの形状を左右で同一に保つことだ。もう1つは、TypeScript から Rust のコードを呼び出すことだ。本記事では、2026年11月15日時点の主要なツールを列挙する。バージョンと日付は、crates.io、npm、および各プロジェクトのリリースノートに基づいている。

## Rust から TypeScript 型を生成する

このアプローチでは、Rust の型が元になる。

[specta](https://github.com/specta-rs/specta) は、Rust の型を他の言語向けの型に変換する[^specta]。2026年10月21日のバージョン 2.0.0-rc.27 で、Zod、Valibot、JSON Schema、OpenAPI、Kotlin、Swift、およびその他のターゲット向けのエクスポーターが追加された[^specta]。最新バージョンは11月5日の 2.0.0-rc.28 である。バージョン 2.0 はまだリリース候補版であり、安定版の日付は設定されていない[^specta]。

[ts-rs](https://github.com/Aleph-Alpha/ts-rs) は TypeScript のみを出力する。最新バージョンは2026年1月31日の 12.0.1 である[^crates]。広く利用されており、2026年11月15日までの90日間で約1,090万件のダウンロードを記録した[^crates]。

typeshare は Rust のソースファイルをコンパイルせずに読み込む。このため、型に関する情報が少なく、他のクレートの型を利用できない[^specta-docs]。

## 型付き呼び出し

[Tauri](/sloppedia/tauri) アプリは、TypeScript から `invoke` を介して Rust 関数を呼び出す。[tauri-specta](https://github.com/specta-rs/tauri-specta) は、これらの呼び出し用に型付き関数を生成する[^tauri-specta]。最新バージョンは2026年11月13日の 2.0.0-rc.29 である。rc.28 ではデフォルトのエラー処理が変更されており、これは破壊的変更である[^tauri-specta]。TauRPC や tauri-typegen もその他の選択肢である。

HTTP では、qubit と taut-rpc が Rust サーバーから TypeScript クライアントを生成する。どちらも 1.0 には到達していない[^crates]。rspc がこの役割を担っていたが、2025年2月以降リリースされていない[^crates]。

## TypeScript から Rust を呼び出す

[napi-rs](https://napi.rs/) は Rust で Node.js ネイティブアドオンをビルドし、型定義ファイルを生成する[^napi]。バージョン3以降では、WebAssembly 向けにも同様のコードをビルドできる[^napi]。`napi` クレートの最新バージョンは2026年11月11日の 3.16.2 である[^crates]。

wasm-bindgen と wasm-pack は、ブラウザ向けに Rust を WebAssembly にコンパイルする。2025年、Rust プロジェクトは GitHub 上の rustwasm 組織を閉鎖した[^rustwasm]。両ツールは新しい組織に移行し、現在もリリースされている。2026年11月15日時点で、最新バージョンは wasm-bindgen 0.2.130 と wasm-pack 0.15.1 であり、いずれも10月30日のものである[^crates]。

[workers-rs](https://github.com/cloudflare/workers-rs) は、Cloudflare Workers 上で Rust を実行する。バージョン 0.9.0 は2026年11月11日にリリースされた[^workers-rs]。

uniffi-bindgen-react-native は、1つの UniFFI 定義から React Native、ブラウザ、および Node.js 向けの TypeScript バインディングを生成する。最新バージョンは2026年11月10日のプレリリース 0.31.0-7 である[^npm-ubrn]。BoltFFI は、1つのクレートから Swift、Kotlin、C#、および TypeScript 向けのバインディングを生成する新しいツールである[^boltffi]。

## スキーマファーストの手法

これらのアプローチでは、Rust 以外のスキーマが元になる。TypeScript のスキーマライブラリは JSON スキーマを出力できる。例えば Effect 4 には `Schema.toJsonSchemaDocument` がある[^effect]。[typify](https://github.com/oxidecomputer/typify) や quicktype といったツールは、JSON スキーマから Rust 型を生成する。

WebAssembly コンポーネントモデルは、WIT と呼ばれる言語でインターフェースを記述する。WASI 0.3.0 は2026年6月11日にリリースされた[^wasi]。jco ツールは WIT から TypeScript を生成し、最新バージョンは2026年11月13日の 1.42.0 である[^npm-jco]。JavaScript における WASI 0.3 のサポートは現在も実験的である[^wasi-languages]。

## masseater.dev での利用

masseater.dev では、こうした手法を複数採用している。一部の共有型は Effect Schema で記述され、C# 型はそこから JSON Schema を通じて生成される。ある Tauri アプリでは、tauri-specta を用いて Rust からコマンド用の TypeScript 型を生成している。

## 関連項目

- [Rust](/sloppedia/rust)
- [TypeScript](/sloppedia/typescript)
- [Tauri](/sloppedia/tauri)
- [Cargo](/sloppedia/cargo)

[^specta]: 「[Releases](https://github.com/specta-rs/specta/releases)」specta-rs/specta、GitHub。2026年11月15日に閲覧。

[^specta-docs]: 「[specta](https://docs.rs/specta/latest/specta/)」docs.rs。2026年11月15日に閲覧。

[^crates]: 「[crates.io](https://crates.io/)」の各 crate のページ。2026年11月15日に閲覧。

[^tauri-specta]: 「[Releases](https://github.com/specta-rs/tauri-specta/releases)」specta-rs/tauri-specta、GitHub。2026年11月15日に閲覧。

[^napi]: 「[WebAssembly and WASI](https://napi.rs/docs/concepts/webassembly)」NAPI-RS。2026年11月15日に閲覧。

[^rustwasm]: 「[Sunsetting the rustwasm GitHub org](https://blog.rust-lang.org/inside-rust/2025/07/21/sunsetting-the-rustwasm-github-org/)」Inside Rust Blog、2025年7月21日。

[^workers-rs]: 「[Releases](https://github.com/cloudflare/workers-rs/releases)」cloudflare/workers-rs、GitHub。2026年11月15日に閲覧。

[^npm-ubrn]: 「[uniffi-bindgen-react-native](https://www.npmjs.com/package/uniffi-bindgen-react-native)」npm。2026年11月15日に閲覧。

[^boltffi]: 「[boltffi](https://docs.rs/crate/boltffi/latest)」docs.rs。2026年11月15日に閲覧。

[^effect]: 「[Schema to JSON Schema](https://effect.website/docs/v4/schema/json-schema)」Effect Documentation。2026年11月15日に閲覧。

[^wasi]: 「[WASI 0.3](https://wasi.dev/releases/wasi-p3)」WASI.dev。2026年11月15日に閲覧。

[^npm-jco]: 「[@bytecodealliance/jco](https://www.npmjs.com/package/@bytecodealliance/jco)」npm。2026年11月15日に閲覧。

[^wasi-languages]: 「[Languages](https://wasi.dev/languages)」WASI.dev。2026年11月15日に閲覧。
