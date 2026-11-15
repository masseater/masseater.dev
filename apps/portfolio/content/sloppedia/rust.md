---
title: "Rust"
description: "ガベージコレクタを介さず、メモリ安全性を目指したシステムプログラミング言語。Graydon Hoare が Mozilla で開発を開始し、現在は Rust Foundation がこれをサポートしている。6週間ごとに新しい安定版がリリースされる。"
tags: ["プログラミング言語", "Rust", "Mozilla"]
published: true
infobox:
  - label: "作者"
    value: "Graydon Hoare"
  - label: "開発"
    value: "Rust プロジェクト"
  - label: "支援"
    value: "Rust Foundation"
  - label: "Rust 1.0"
    value: "2015年5月15日"
  - label: "最新のリリース"
    value: "Rust 1.100.0（2026年11月12日）"
  - label: "ライセンス"
    value: "MIT License または Apache License 2.0"
  - label: "URL"
    value: "rust-lang.org"
    href: "https://www.rust-lang.org/"
---

Rust は、ガベージコレクタを介さずにメモリ安全性を実現することを目的としたシステムプログラミング言語である[^book]。コンパイラは、コードのどの部分が各値を所有しているか、および参照の生存期間を追跡する。プログラムの実行前にメモリを誤用する可能性のあるコードは排除する[^book]。

## 歴史

Graydon Hoare は、Mozilla に勤務していた2006年に、個人プロジェクトとして Rust を立ち上げた[^mit]。MIT テクノロジーレビューによれば、彼はアパートのエレベーターのソフトウェアがクラッシュして故障したことをきっかけに同プロジェクトを立ち上げたという[^mit]。Mozilla は2009年に同プロジェクトへのスポンサーシップを開始した[^wikipedia]。

Rust 1.0 は2015年5月15日にリリースされた[^rust-1-0]。2021年2月8日、同プロジェクトを支援する独立した非営利団体として Rust Foundation が設立された[^foundation]。

## リリース

新しい安定版は6週間ごとにリリースされる。Rust 1.99.0 は2026年10月1日に、Rust 1.99.1 は10月15日にリリースされた[^blog]。

Rust 1.100.0 は2026年11月12日にリリースされた[^rust-1-100]。これにより、10年にわたる5回の失敗を経て、never 型 `!` が安定化した[^rust-1-100]。また、アロケータ API のコアも安定化した。[Cargo](/sloppedia/cargo) は現在、未使用の依存関係について警告を出すようになった。新しい `min-publish-age` 設定では、新たに公開されたクレートを一定時間制限する[^rust-1-100]。

## ツール

[Cargo](/sloppedia/cargo) はコードを構築し、依存関係を管理する。ライブラリはクレートと呼ばれ、crates.io で公開される。

## JavaScript ツールでの利用

JavaScript や TypeScript 向けのツールの多くは Rust で書かれている。例として、[Oxc](/sloppedia/oxc)、[Rolldown](/sloppedia/rolldown)、そして2026年に Rust で書き直された [pnpm](/sloppedia/pnpm) などが挙げられる。[tsrs](/sloppedia/tsrs) は TypeScript の型チェッカーを Rust に移植している。Rust のコードと TypeScript のコードを連携させる方法については、「[Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)」を参照してほしい。

## 関連項目

- [Cargo](/sloppedia/cargo)
- [TypeScript](/sloppedia/typescript)
- [Tauri](/sloppedia/tauri)
- [Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)

[^book]: 「[Understanding Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)」The Rust Programming Language。2026年11月15日に閲覧。

[^mit]: 「[How Rust went from a side project to the world’s most-loved programming language](https://www.technologyreview.com/2023/02/14/1067869/rust-worlds-fastest-growing-programming-language/)」MIT Technology Review、2023年2月14日。

[^wikipedia]: 「[Rust (programming language)](<https://en.wikipedia.org/wiki/Rust_(programming_language)>)」Wikipedia。2026年11月15日に閲覧。

[^rust-1-0]: The Rust Core Team「[Announcing Rust 1.0](https://blog.rust-lang.org/2015/05/15/Rust-1.0/)」Rust Blog、2015年5月15日。

[^foundation]: 「[Hello World!](https://foundation.rust-lang.org/news/2021-02-08-hello-world/)」Rust Foundation、2021年2月8日。

[^blog]: 「[Rust Blog](https://blog.rust-lang.org/)」。2026年11月15日に閲覧。

[^rust-1-100]: The Rust Release Team「[Announcing Rust 1.100.0](https://blog.rust-lang.org/2026/11/12/Rust-1.100.0/)」Rust Blog、2026年11月12日。
