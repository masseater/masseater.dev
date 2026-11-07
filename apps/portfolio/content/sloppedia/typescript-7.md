---
title: "TypeScript 7"
description: "Microsoft が TypeScript のコンパイラーと言語サービスを Go に移したメジャーリリース。全体のビルドが TypeScript 6 より8倍から12倍速い。2026年7月8日に出た。"
tags: ["コンパイラー", "Go", "TypeScript", "Microsoft", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Microsoft の TypeScript チーム"
  - label: "移植の発表"
    value: "2025年3月11日"
  - label: "リリース"
    value: "2026年7月8日"
  - label: "最新の安定リリース"
    value: "7.0.2"
  - label: "次のリリース"
    value: "7.1 ベータ（2026年10月20日）"
  - label: "言語"
    value: "Go"
  - label: "URL"
    value: "github.com/microsoft/typescript-go"
    href: "https://github.com/microsoft/typescript-go"
---

TypeScript 7 は、TypeScript のコンパイラーと言語サービスを Go で書き直したメジャーリリースである[^ts7]。元のコードの構造と論理を保ったまま写し、TypeScript 6 と同じ結果を出すようにした[^ts7]。

ネイティブのコードと、メモリを共有する複数のスレッドで動く[^ts7]。全体のビルドは、TypeScript 6 より8倍から12倍速くなることが多い[^ts7]。2026年7月8日に出た[^ts7]。

## 歴史

Anders Hejlsberg は2025年3月11日、TypeScript のコンパイラーを Go に移すと発表した[^native-port]。大きなコードでは読み込みと検査が遅く、エディターの起動の速さと全体の把握のどちらかを選ばざるを得なかったからである[^native-port]。

発表の時点ですでに、VS Code の150万行のコードの検査が77.8秒から7.5秒に縮んでいた[^native-port]。npm への公開は、7.0 のリリース候補が2026年6月18日、安定したリリースの 7.0.2 が7月8日だった[^npm]。

## 速さ

| コード     | TypeScript 6 | TypeScript 7 | 倍率   |
| ---------- | ------------ | ------------ | ------ |
| vscode     | 125.7秒      | 10.6秒       | 11.9倍 |
| sentry     | 139.8秒      | 15.7秒       | 8.9倍  |
| bluesky    | 24.3秒       | 2.8秒        | 8.7倍  |
| playwright | 12.8秒       | 1.47秒       | 8.7倍  |
| tldraw     | 11.2秒       | 1.46秒       | 7.7倍  |

表は 7.0 の告知に基づく[^ts7]。メモリの使用量も、どのコードでも6% から26% 減った[^ts7]。

エディターでも速くなった。VS Code のコードでエラーのあるファイルを開くと、最初のエラーが出るまでに約17.5秒かかっていた[^ts7]。TypeScript 7 では1.3秒を切る[^ts7]。

Slack は CI の型検査が約7.5分から1.25分に縮み、マージ待ちの時間の40% がなくなったという[^ts7]。

## API と TypeScript 6

7.0 は、プログラムから呼ぶ API を持たずに出た[^ts7]。typescript-eslint のように API を使う道具のために、TypeScript 6 の API を出す `@typescript/typescript6` を用意し、並べて入れられるようにした[^ts7]。

このため、[Oxlint](/sloppedia/oxlint) は型を使う lint を、Go で書いた [tsgolint](/sloppedia/tsgolint) に任せている[^type-aware]。

## TypeScript 7.1

2026年10月20日に 7.1 のベータが出た[^ts71]。新しい API が入り、`typescript/sync` や `typescript/async` や `typescript/ast` のように用途ごとの入口に分かれた[^ts71]。

最適化も進み、4つのスレッドで型だけを検査すると 7.0 より1.2倍から1.9倍速い[^ts71]。mui-docs ではメモリの使用量がほぼ半分になった[^ts71]。速くする工夫の一部は、Rust への移植の [tsrs](/sloppedia/tsrs) から持ち込まれた[^cf]。

ベータの告知は、約1か月後にリリース候補を出し、その後すぐに安定したリリースを出すとしている[^ts71]。

## 周りの動き

[VoidZero](/sloppedia/voidzero) は、7.0 を出す前の試験に加わった会社の1つである[^ts7]。2026年10月には、`create-vite` が新しいプロジェクトに TypeScript 7 を使うようになった[^recap-oct]。Angular も、TypeScript 7 を使う次のコンパイラーを作っている[^recap-sep]。

[^native-port]: Anders Hejlsberg「[A 10x Faster TypeScript](https://devblogs.microsoft.com/typescript/typescript-native-port/)」TypeScript、2025年3月11日。

[^ts7]: Daniel Rosenwasser「[Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)」TypeScript、2026年7月8日。

[^ts71]: Daniel Rosenwasser「[Announcing TypeScript 7.1 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-7-1-beta/)」TypeScript、2026年10月20日。

[^npm]: npm「[typescript](https://www.npmjs.com/package/typescript)」。2026年11月7日に閲覧。

[^type-aware]: Cameron「[Type-Aware Linting Stable](https://oxc.rs/blog/2026-07-22-type-aware-linting-stable)」Oxc、2026年7月22日。

[^cf]: Boshen Chen ほか「[Introducing tsrs: A port of TypeScript to Rust](https://blog.cloudflare.com/typescript-rust-port/)」Cloudflare Blog、2026年10月20日。

[^recap-sep]: Alexander Lichter「[Tales from the Void: September 2026 Recap](https://voidzero.dev/posts/whats-new-sep-2026)」VoidZero、2026年10月6日。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
