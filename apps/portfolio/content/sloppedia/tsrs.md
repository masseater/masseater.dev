---
title: "tsrs"
description: "TypeScript のコンパイラーと言語サーバーを Rust に移した試験的な実装。Owner.com の Max Schwenk が AI のエージェントで作り、2026年10月から Oxc の配下で Cloudflare と VoidZero が開発している。"
tags: ["コンパイラー", "Rust", "TypeScript", "VoidZero", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Max Schwenk（Owner.com）"
  - label: "開発"
    value: "Cloudflare、VoidZero、Max Schwenk"
  - label: "公開の告知"
    value: "2026年10月20日"
  - label: "最新のリリース"
    value: "0.23.0-ts7.1.0-beta（2026年11月7日）"
  - label: "移植元"
    value: "TypeScript 7.1 ベータ"
  - label: "言語"
    value: "Rust"
  - label: "URL"
    value: "github.com/oxc-project/tsrs"
    href: "https://github.com/oxc-project/tsrs"
---

tsrs は、TypeScript のコンパイラーと言語サーバーを Rust に移した実装である[^typechecker]。Go で書かれた [TypeScript 7](/sloppedia/typescript-7) を、アルゴリズムや診断の順まで忠実に写すことを目指している[^owner]。

[Oxc](/sloppedia/oxc) の配下で育てられ、Cloudflare、[VoidZero](/sloppedia/voidzero)、Max Schwenk の3者が、TypeScript のチームと協力して開発している[^typechecker]。2026年11月の時点では試験的な扱いである[^typechecker]。

## 成り立ち

Max Schwenk は、Owner.com のバックエンドで約3万7,000の TypeScript のファイルを1つのプログラムとして型検査していた[^owner]。TypeScript 7.0 でも、1つのスレッドの検査に19GiB のメモリと80秒がかかった[^owner]。lint や言語サーバーまで動かすと50GiB を超え、手元で複数のエージェントを並べて動かせなかった[^owner]。

2026年9月30日、Schwenk は Claude Opus 5.5 に、Go の TypeScript を Rust へ忠実に移すよう頼んだ[^owner]。本人は1行もコードを書いていないという[^owner]。Go のパッケージ1つを Rust の crate 1つに対応させ、TypeScript が持つ15,197件の互換のテストを仕様として使った[^owner]。

一晩で動く型検査器ができ、エラーの期待値の78% が1バイトも違わず一致した[^owner]。型を文字列にする部品を足すと、13,462件のうち4件を除く99.97% が一致した[^owner]。

## Oxc への移管

2026年10月20日、Cloudflare は tsrs を Oxc の配下で引き継ぐと告知した[^cf]。告知は、TypeScript をフォークするのではないと強調している[^cf]。言語の設計は TypeScript のチームが決め、tsrs はそれに従う[^cf]。

速くする工夫は、できるだけ Go の TypeScript にも還元する[^cf]。Theo Browne が作っていた別の Rust の移植の tsc-rs とは、1つのパッケージにまとめる予定である[^cf]。

## 性能

型検査のワーカーの数をそろえて比べると、TypeScript 7.0 より最大8倍速く、メモリは約70% 少ない[^cf]。比べ方は TypeScript のチームと相談し、同じ設定でそろえたという[^cf]。

一方で TypeScript 7.1 のベータも 7.0 より最大2.5倍速くなっており、その一部は tsrs から持ち込まれた[^cf]。

## 使い方

`tsrs --noEmit` で、JavaScript を出さずに型だけを検査できる[^typechecker]。`--fast` を付けると、マシンに合わせて型検査器の数を変える速い設定で動く[^status]。この設定はメモリを多く使う[^cf]。

Rust で書かれているので WebAssembly にしやすい[^cf]。ブラウザーの上の playground や Cloudflare Workers の中でも型検査器を動かせる[^cf][^recap-oct]。

## 2026年11月の状況

npm のバージョンは `0.23.0-ts7.1.0-beta` のように、移植元の TypeScript のバージョンを後ろに付ける[^npm]。10月10日から11月7日までに、10を超えるリリースが出た[^npm]。

0.22.0 で、`oxlint --type-aware --type-check` が `tsrs --noEmit` と同じ型のエラーを出せるようになった[^status]。VoidZero は、いずれ [Oxlint](/sloppedia/oxlint) の型情報を使う lint を [tsgolint](/sloppedia/tsgolint) から tsrs に移すとしている[^recap-oct]。

[^typechecker]: Oxc「[Type Checker](https://oxc.rs/docs/guide/usage/typechecker.html)」。2026年11月7日に閲覧。

[^owner]: Max Schwenk「[tsrs](https://building.owner.com/tsrs)」Building Owner、2026年10月19日。

[^cf]: Boshen Chen ほか「[Introducing tsrs: A port of TypeScript to Rust](https://blog.cloudflare.com/typescript-rust-port/)」Cloudflare Blog、2026年10月20日。

[^status]: tsrs「[Release notes](https://github.com/oxc-project/tsrs/blob/main/docs/STATUS.md)」。2026年11月7日に閲覧。

[^npm]: npm「[tsrs](https://www.npmjs.com/package/tsrs)」。2026年11月7日に閲覧。

[^recap-oct]: Alexander Lichter「[Tales from the Void: October 2026 Recap](https://voidzero.dev/posts/whats-new-oct-2026)」VoidZero、2026年11月5日。
