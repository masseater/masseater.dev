---
title: "tsrsでEffectを動作させているのは誰か？"
description: "Effectの言語サービスは、tsrsの発表から4日後、TypeScript 7のRust移植版であるtsrs上で動作している。Effectのメンテナーは、AIエージェントを用いて5万8,000行のGoコードをRustに移植し、Goコードを仕様として維持しているほか、tsrsにはまだプラグインAPIが存在しないため、tsrsに対する33件のパッチを適用している。"
tags: ["Effect", "TypeScript", "tsrs", "Rust"]
published: true
---

masseater.dev は、TypeScript 7 の Rust 移植版である [tsrs](https://github.com/oxc-project/tsrs) で型チェックを行っており、そのコードの大部分は [Effect](https://effect.website/) で記述されている。これが機能するのは、`floatingEffect`（作成されて実行されることのない Effect）といった Effect の診断が tsrs 内で実行されるからに他ならない。誰がどのようにしてそれを実現したのかを知りたかったため、2026年11月18日までのリポジトリ、Issue、プルリクエストを読み込んだ。

## 起点：tsrsにはプラグインAPIがない

Cloudflareは[2026年10月20日](https://blog.cloudflare.com/typescript-rust-port/)にtsrsを発表した。これはOxc組織に属し、VoidZeroが開発・メンテナンスを担当しており、CloudflareとOwner.comのMax Schwenkも開発に携わっている。typescript-goを関数単位で移植しており、Goの名前はスネークケースで保持している。

Effectの診断機能は、TypeScript本体内では一度も動作しなかった。Effectの言語サービスは[`@effect/tsgo`](https://github.com/Effect-TS/tsgo)として提供されており、typescript-goバイナリにパッチを適用し、Effectのチェッカーフック、診断機能、クイックフィックス、リファクタリング、および補完機能を追加する。tsrsには言語サービス用のプラグインフックがないため、tsrsに移行したプロジェクトではそれらがすべて失われてしまった。

同日、ユーザーから [Effect-TS/tsgo#883](https://github.com/Effect-TS/tsgo/issues/883) がオープンされ、tsrsをパッチ対象にできないかという問い合わせがあった。同イシューでは、tsrsは外部のプルリクエストを受け付けていないため、拡張ポイントはtsrsのメンテナーから提供される必要があると指摘されている。Effect言語サービスのメンテナンスを担当するMattia Manzati氏は10月21日、「まだ明確な計画はないが、除外もしていない」と回答した。

## 4日後：Rustへの1:1移植

10月24日、Mattiaは[#901](https://github.com/Effect-TS/tsgo/pull/901)「Additionally support TSRS for the Effect LSP」をマージした。これにより、Effect言語サービスのスコープ内にある2,332件のGo宣言がすべて、Goの順序に従ってRustクレートに移植され、Goパッケージにつき1クレート、`.go`ファイルにつき1つの`.rs`ファイルが付与される。[`porting/TSRS_PORT.md`](https://github.com/Effect-TS/tsgo/blob/main/porting/TSRS_PORT.md)の計画では、サイズは約58,000 Go行、ルール数は139個となっている。現在、このリポジトリには`crates/`配下に約126,000 Rust行が格納されている。

ポート作業はAIエージェントを用いて行われた。コミットにはClaude Codeの共同執筆者トレーラーが含まれており、リポジトリにはポート用のエージェントスキルと、ルールワークのコーディング標準を記載した`AGENTS.md`が用意されている。

移植が破綻しないのは、Goコードとの整合性の取り方による。

- Goのコードが仕様となる。Goのビルドはデフォルトのままとし、Rustのビルドは任意とする。
- 移植したGoコードを変更するプルリクエストは、同じプルリクエスト内でRustのポートを更新しなければならない。それ以外の場合、`repoctl tsrs port-check` がCIを失敗させる。
- どちらのビルドも同じベースラインファイルで動作する。相違がある場合はCIで失敗する。
- RustのビルドとGoのビルドをtsrsがピン留めしているTypeScriptのバージョンで比較するため、Goのビルドでも同様の結果が得られない限り、差異はポートバグとなる。

tsrsにはフックがないため、Effectはそれに対して[33件のパッチ](https://github.com/Effect-TS/tsgo/tree/main/_patches/tsrs)を提供している。各パッチは、同じ番号のtypescript-goパッチに加え、tsrsの内部構造のみをEffectクレートから参照可能にするパッチを移植したものである。ボットがtsrsを更新し、パッチをリベースする。

## その後、どれくらい速く動いたか

10月26日：`effect-tsgo tsrs` は `node_modules` に手を加えずに Effect パッチ適用済みの tsrs を実行し、リリースビルドでは tsrs 独自の PGO および BOLT パイプラインを使用する。

11月3日: [#999](https://github.com/Effect-TS/tsgo/pull/999) が、tsgolintのtsrs移植版である `tsrs --lint` に対し、Effect のものを含む Oxlint の型認識ルールを適用した。これにより、未リリースの tsrs ブランチを必要としていた実験 ([#945](https://github.com/Effect-TS/tsgo/pull/945)) が置き換えられた。

11月11日: [#1032](https://github.com/Effect-TS/tsgo/pull/1032) は、ユーザーからの報告から1日後、`--tsrs-lint --type-check` が Effect の提案をエラーとして報告するのを停止した。

10月20日から11月17日にかけて、リポジトリには121件のコミットと31件のリリースが寄せられ、1日あたり約1件のペースで更新が行われた。コミットのうち、65件はMattiaによるもので、55件はアップストリームにバンプしてバージョンを公開するボットによるものだった。GoとRustの両方のコードに次々と新しいルールが導入されており、多くの場合、1日に数件のペースで更新されている。

## 他に誰が関わっているか

これは主に、エージェントや自動化機能を持つメンテナー1名によるものだ。その他、周辺的な役割で貢献している者もいる。

ユーザーが問題を報告し、修正している。あるユーザーは、macOS上でCLIプロキシが64 KiBに達した時点でパイプ経由のtsrs出力を途中で切ってしまう問題を報告した。別のユーザーは、tsrsが直接取り込まないため、条件型とインデックスアクセス型に関するチェッカーの修正をEffectのパッチセットに送った。

ユーザーが結果を測定した。#883では、パッチ適用済みのtypescript-goでビルド時間378秒、メモリ7.9GBだったのに対し、tsrsでは92 CPU秒、3.7GBでビルド完了したと報告したユーザーがいた。別のユーザーは、壁時間（wall time）およびCPU・メモリ使用量がTypeScript 7.1の約3分の1だったと報告した。

これをベースに構築されたその他のもの：[effect-tsrs](https://github.com/yielded-dev/effect-tsrs)（診断機能をCLIとしてRustに独立して移植したもの）や、Effectでパッチ適用されたtsrsを言語サーバーとして利用する[Zed拡張機能](https://github.com/NoksLabs/effect-tsrs-lsp)などがある。

tsrs側では、VoidZeroのBoshen氏が10月28日に[oxc-project/tsrs#834](https://github.com/oxc-project/tsrs/issues/834)「Support Effect diagnostics」をオープンした。同プロジェクトでは、Effectのtsrsパッチを起点として挙げている。トリアージボットは、TypeScriptとのパリティ外であるとして「対応不可」と判定し、コメントの末尾では2つのチームがDiscordで協議する旨が記されている。それ以降、プラグインAPIやアップストリーム化に関する発表は行われていない。

## 私のようなプロジェクトにおけるこれが意味すること

サポートは実在し進みも速いが、変化の速いコンパイラへのパッチに依存しており、それが継ぎ目から滲み出ている。

tsrsは11月12日にTypeScript準拠のバージョンに移行した ([#973](https://github.com/oxc-project/tsrs/pull/973))。npmで最初に公開された `7.1.0-beta.tsrs2` は11月16日に `next` タグ付きで配布されたため、`latest` は依然として `0.25.0-ts7.1.0-beta` を指している。Effectのアップストリームボットは `latest` を辿るため、`@effect/tsgo` は依然として 0.25.0 ビルドのみを配信し、Vite+ 1.7.0 は `tsrs2` をバンドルしている。そのため、masseater.dev は `effect-tsgo --tsrs-lint vp check` を通じてチェックを行い、Vite+ が配信する tsrs ではなく、Effect の 0.25.0 ビルドを使っている。

これを確認したところ、すべてのEffectの検出結果が2回ずつ報告されていることも分かった。1回は `@effect/language-service` プラグインによる型チェックで、もう1回は `effecttsgo/*` のリントルールによるものだ。Effectの [Oxlintガイド](https://github.com/Effect-TS/tsgo/blob/main/docs/README.md) では、このケースではプラグインの `"diagnostics": false` が推奨されている。現在は masseater.dev でこれが設定されており、私のチェックツールである msch は、これをオンのままにしている tsconfig を報告している。

リポジトリ全体のチェック時間は、tsgolintでは193〜212秒かかっていたが、Effectルールを含めるとtsrsでは約70秒になった。当面は、プラグインAPIを待つよりも、1人のメンテナーと厳格なパリティポリシーに頼る方がいいと考えており、ルールがtsrs本体へ移る日に向けて#834を追うつもりだ。
