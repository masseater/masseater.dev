---
title: "Tauri"
description: "Web フロントエンドと Rust バックエンドを備えたデスクトップおよびモバイルアプリを構築するためのフレームワーク。OS が提供する Web ビューを利用する。Tauri 3 は2026年9月からアルファ版となっている。"
tags: ["フレームワーク", "Rust", "デスクトップアプリ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "Tauri 1.0"
    value: "2022年6月"
  - label: "Tauri 2.0"
    value: "2024年10月2日"
  - label: "最新の安定リリース"
    value: "2.12.5（2026年10月21日）"
  - label: "開発中"
    value: "3.0.0-alpha.6（2026年11月6日）"
  - label: "言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License または Apache License 2.0"
  - label: "URL"
    value: "tauri.app"
    href: "https://tauri.app/"
---

Tauri は、Web フロントエンドと Rust バックエンドを備えたデスクトップおよびモバイルアプリを構築するためのフレームワークである[^tauri2]。画面は HTML、CSS、JavaScript で描画される。オペレーティングシステムに触れるロジックは [Rust](/sloppedia/rust) で記述されている。

## ウェブビュー

Tauri はブラウザをバンドルしない。OS が提供するウェブビューを使用する[^webview]。Windows では Microsoft Edge をベースにした WebView2 を使う。macOS、iOS、Linux では WebKit、Android では Android WebView となる[^webview]。このため、アプリはブラウザをバンドルするアプリよりも小規模になる。

## 歴史

Tauri 1.0 は2022年6月にリリースされた[^tauri1]。Tauri 2.0 は2024年10月2日にリリースされた[^tauri2]。iOS と Android への対応が追加され、フロントエンドとバックエンド間の通信が書き直された[^tauri2]。

Tauri 2.12 は2026年9月26日にリリースされた[^tauri212]。リリースノートでは、2.x シリーズで最大のアップデートであるとされている。Windows 7 の公式サポートが終了し、Rust の最小バージョンが 1.90 に引き上げられた[^tauri212]。2026年11月15日現在、crates.io における最新の安定版は10月21日の 2.12.5 である[^crates]。

## Tauri 3

Tauri 3 の最初のアルファ版は2026年9月13日に crates.io で公開された[^crates]。最新のアルファ版は11月6日の 3.0.0-alpha.6 である[^crates]。リリースノートには、ウィンドウごとのイベントリスナーレジストリの削除などの破壊的変更が記載されている[^releases]。`tauri-runtime-cef` というクレートが併せて公開されている[^releases]。2026年11月15日現在、Tauri のブログには Tauri 3 の目標に関する記事は掲載されていない[^blog]。

## フロントエンドとの通信

フロントエンドは、`invoke` を通じてコマンドとしてマークされた Rust 関数を呼び出す。Tauri 自体はコマンド用の [TypeScript](/sloppedia/typescript) 型を生成しない。tauri-specta などのツールがこれらを生成する。詳細は「[Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)」を参照。

## 関連項目

- [Rust](/sloppedia/rust)
- [TypeScript](/sloppedia/typescript)
- [Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)

[^tauri1]: 「[Tauri 1.0 Release](https://tauri.app/blog/tauri-1-0/)」Tauri、2022年6月19日。

[^tauri2]: 「[Tauri 2.0 Stable Release](https://tauri.app/blog/tauri-20/)」Tauri、2024年10月2日。

[^webview]: 「[Webview Versions](https://v2.tauri.app/reference/webview-versions/)」Tauri。2026年11月15日に閲覧。

[^tauri212]: 「[Announcing Tauri 2.12](https://tauri.app/blog/tauri-2.12/)」Tauri、2026年9月26日。

[^crates]: 「[tauri](https://crates.io/crates/tauri)」crates.io。2026年11月15日に閲覧。

[^releases]: 「[Releases](https://github.com/tauri-apps/tauri/releases)」tauri-apps/tauri、GitHub。2026年11月15日に閲覧。

[^blog]: 「[Blog](https://tauri.app/blog/)」Tauri。2026年11月15日に閲覧。
