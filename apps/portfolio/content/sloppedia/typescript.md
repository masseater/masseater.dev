---
title: "TypeScript"
description: "JavaScript に静的型付けを追加するプログラミング言語。Microsoft が開発している。2026年にリリースされたバージョン7以降、コンパイラは Go で書かれている。"
tags: ["プログラミング言語", "TypeScript", "JavaScript", "Microsoft"]
published: true
infobox:
  - label: "開発"
    value: "Microsoft"
  - label: "設計"
    value: "Anders Hejlsberg ほか"
  - label: "公開"
    value: "2012年10月1日（0.8）"
  - label: "最新の安定リリース"
    value: "7.0.2（2026年7月8日）"
  - label: "次のリリース"
    value: "7.1 ベータ（2026年10月20日）"
  - label: "コンパイラーの言語"
    value: "Go（7.0 から）"
  - label: "ライセンス"
    value: "Apache License 2.0"
  - label: "URL"
    value: "typescriptlang.org"
    href: "https://www.typescriptlang.org/"
---

TypeScript は、JavaScript に静的型付けを追加するプログラミング言語である[^wikipedia]。Microsoft が開発している。コンパイラが型をチェックし、それらを除去してプレーンな JavaScript を生成する[^wikipedia]。

## 歴史

Microsoft は2012年10月1日に TypeScript 0.8 を一般公開した[^npm]。Anders Hejlsberg は設計者の一人である[^wikipedia]。TypeScript 1.0 は2014年4月2日にリリースされた[^npm]。

バージョン6までは、コンパイラは TypeScript 自体で記述されていた。Microsoft は2026年3月23日、JavaScript のコードベースに基づく最後のリリースとして TypeScript 6.0 を公開した[^ts6]。

2026年7月8日、Microsoft は [TypeScript 7](/sloppedia/typescript-7) をリリースした[^ts7]。これはコンパイラと言語サービスを Go に移植したものである。フルビルドは通常、TypeScript 6 よりも8〜12倍高速である[^ts7]。TypeScript 7.0 には他のプログラム向けの安定した API がないため、API を利用するツールは依然として TypeScript 6 に依存している[^ts7]。

## 最新リリース

2026年11月15日現在、npm における最新の安定版は 7.0.2 である[^npm]。TypeScript 7.1 Beta は2026年10月20日にリリースされた[^ts71]。これには `typescript/sync` や `typescript/async` といったエントリーポイントに分かれた新しい API が追加されている[^ts71]。

## その他の実装

多くのツールは型の除去のみを行い、型チェックを公式コンパイラに委ねている。[Oxc](/sloppedia/oxc) や [Rolldown](/sloppedia/rolldown) がその例だ。[tsrs](/sloppedia/tsrs) は型チェッカーを Rust 向けに移植した実験的なツールである。TypeScript 7 に密接に準拠している。

## Rust との関係

現在、多くの JavaScript および TypeScript ツールが Rust で記述されている。両言語間で型を共有し、コードを呼び出す方法については、「[Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)」を参照してほしい。

## 関連項目

- [TypeScript 7](/sloppedia/typescript-7)
- [tsrs](/sloppedia/tsrs)
- [Rust](/sloppedia/rust)
- [Rust と TypeScript の連携](/sloppedia/rust-typescript-interop)

[^wikipedia]: 「[TypeScript](https://en.wikipedia.org/wiki/TypeScript)」Wikipedia。2026年11月15日に閲覧。

[^npm]: 「[typescript](https://www.npmjs.com/package/typescript)」npm。2026年11月15日に閲覧。

[^ts6]: Daniel Rosenwasser「[Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)」TypeScript、2026年3月23日。

[^ts7]: Daniel Rosenwasser「[Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)」TypeScript、2026年7月8日。

[^ts71]: 「[Announcing TypeScript 7.1 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/)」TypeScript、2026年10月20日。
