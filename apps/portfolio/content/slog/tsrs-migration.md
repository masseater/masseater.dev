---
title: "型チェックを TypeScript 7.1 から tsrs に移行（2026年11月18日時点）"
description: "masseater.dev は、vp check の型認識付きリントおよび型チェックを、TypeScript 7.1 の tsgolint から tsrs に切り替えた。vp check は193～212秒から100～120秒に短縮され、ピークメモリは10.8 GiBから7.0～7.7 GiBに減少した。"
tags: ["tsrs", "TypeScript", "Vite+"]
published: true
---

[tsrs](https://github.com/oxc-project/tsrs)は、TypeScript 7コンパイラをRustに移植したものである。CloudflareとVoidZeroは2026年10月20日に発表し、Owner.comのMax Schwenk氏と共にOxc組織内で開発している[^cloudflare-tsrs]。まだ実験的なリリースであり、本プロジェクトはTypeScript 7.1に完全準拠した安定版を目指している[^tsrs-readme]。Vite+ 1.7.0は11月17日にリリースされた。`vp lint` と `vp check` の型認識型リントおよび型チェックを tsrs で実行する。`tsrs-lint` 実行ファイルを通じて tsrs を呼び出し、コマンドや設定はそのまま維持される[^vite-plus-1-7]。

masseater.dev は11月17日に Vite+ 1.7.0 に移行した。それまで、`vp check` は TypeScript 7.1 をベースに Go で書かれた oxlint-tsgolint の型認識ルールと型チェックを実行していた。

## 数値

4コアのマシンでmasseater.devの`check`タスクを測定した。このタスクでは、型認識ルールを用いたOxlint、Oxfmt、および型チェックを含む約4,250個のファイルに対して `vp check` を実行する。

|              | tsgolint (TypeScript 7.1) | tsrs        |
| ------------ | ------------------------- | ----------- |
| 時間         | 193–212 s                 | 100–120 s   |
| ピークメモリ | 10.6–10.8 GiB             | 7.0–7.7 GiB |

時間は半分程度まで減り、ピークメモリは約30%減少した。プロジェクトで発表された数値は別物を比較しているので、参考程度に並べておいた。

| 出典                       | 測定対象                                   | 時間                         | メモリ                      |
| -------------------------- | ------------------------------------------ | ---------------------------- | --------------------------- |
| Cloudflare                 | tsrs vs TypeScript 7.0、チェッカー数は同じ | 最大8倍高速                  | 約70%少ない                 |
| Vite+ 1.7.0 リリースノート | Vite+リポジトリの`vp check`、Apple M4 Max  | 2.09 → 1.70 s (-19%)         | 1.46 → 0.70 GiB (-52%)      |
| masseater.dev              | 約4,250ファイル、4コアの`vp check`         | 193–212 → 100–120 s (約-48%) | 10.8 → 7.0–7.7 GiB (約-30%) |

Cloudflareの数値は発表資料[^cloudflare-tsrs]から、Vite+の数値は1.7.0のリリースノート[^vite-plus-1-7]から引用している。

`TSRS_FAST=1` はチェッカーの数を調整し、キャッシュを追加する[^tsrs-readme]。masseater.dev では `vp check` の所要時間が変更されなかったため、リポジトリでは設定されていない。

残りの100秒の大部分はtsrsではない。masseater.dev には、独自の型付きルールを備えた Oxlint JS プラグインがある。そのうちの1つである oxlint-typed-rules は、別の tsgo プロセスを起動する。そのプロセスだけで3.7 GiBを消費する。tsrsはその部分を高速化しない。

## tsrsが検出した型エラー

切り替え後、tsrsは以前にパスが通ったファイルで型エラーを報告した。`check` タスクは、次節で説明する tsrs 0.25.0 ビルドを実行する。その型チェックは、各 tsconfig のプログラム全体を対象とする。tsgolintは、Oxlintがリントするファイルに対してのみ型エラーを報告する。Vite+が同梱しているtsrs版の`tsrs-lint`も同様の動作をする[^tsrs-readme]。ベンダー提供のアップストリームコード、生成コード、TanStack Router の `routeTree.gen.ts` など、一部のファイルはリントの対象外となる。それらのファイルに型エラーがあるのを誰も見ていなかった。

同じ tsconfig ファイルに対して TypeScript 7 の `tsc -p` を実行したところ、同様のエラーが表示された。tsrsとTypeScript 7の間で診断結果に差は見られなかった。エラーは同一のプルリクエストで修正された：再帰的なmdastユニオンに対する`Match`、型から欠落している2つのキャッシュフィールド、未使用の関数、生成されたコード、およびルートツリー。

## 残っている回避策

masseater.dev (`effecttsgo/*`) の Effect ルールは、`@effect/tsgo` が配布している Effect 内蔵のバイナリでのみ動作する。11月18日現在、最新の `@effect/tsgo` は 0.70.0 である。tsrs の Effect ビルドは`0.25.0-ts7.1.0-beta`だけである。Vite+ 1.7.0 に同梱されているバージョン `7.1.0-beta.tsrs2` の Effect ビルドは無い。単純な `vp check` を実行すると、Effect ルールを認識していない同梱の tsrs が起動し、`unknown rule: effecttsgo/...` で失敗する。したがって、`check` タスクは `effect-tsgo --tsrs-lint vp check` として実行され、tsrs 0.25.0 の Effect ビルドが優先される。

`effect-tsgo patch --oxlint` は oxlint-tsgolint も検索するが、oxlint-tsgolint がインストールされていない場合は失敗する。Vite+ 1.7.0 では tsgolint がインストールされなくなったため、masseater.dev はこのパッチステップに限り、oxlint-tsgolint をルートの devDependencies に保持している。`@effect/tsgo` が tsrs2 の Effect ビルドを同梱する場合、プレフィックスとこの依存関係の両方が削除される。

masseater.dev には TypeScript 7.1 のコンテンツマッパーがある。`.fumx` 音楽ファイルを値としてインポートする。tsrs-lint は、デフォルトでは tsconfig 内の外部コードを実行しない。`TSRS_LINT_RUN_EXTERNAL_CODE=1` を指定しない場合、コンテンツマッパーを宣言する tsconfig は tsconfig エラーで失敗する。Cloudflareは、言語サーバーやコンテンツマッパーを含むTypeScriptのあらゆる機能をサポートする単一のパッケージに、tsc-rsとtsrsを統合する計画だ[^cloudflare-tsrs]。

[^cloudflare-tsrs]: Cloudflare Blog - Introducing tsrs: a Port of TypeScript to Rust. https://blog.cloudflare.com/typescript-rust-port/

[^tsrs-readme]: oxc-project/tsrs README. https://github.com/oxc-project/tsrs

[^vite-plus-1-7]: Vite+ v1.7.0 release notes. https://github.com/voidzero-dev/vite-plus/releases/tag/v1.7.0
