---
title: "モジュール境界ツール"
description: "2026年11月時点における、Steiger、Sheriff、eslint-plugin-boundaries、Nx、Turborepo などのモジュール境界をチェックするツールの一覧。"
tags: ["静的解析", "JavaScript", "TypeScript", "2026年のソフトウェア"]
published: true
---

モジュール境界ツールとは、コードが作成者の宣言した[モジュール境界](/sloppedia/module-boundaries)に準拠しているかを確認するツールである。その多くはソースコード内のインポートを読み取り、各インポートをルールと照合する。本記事では、2026年11月時点のツールを列挙する。

## JavaScript と TypeScript

| ツール                                                          | 境界の単位                                                                     | ルールが記述される場所                   | 動作する仕組み                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------- |
| [Steiger](/sloppedia/steiger)                                   | [Feature-Sliced Design](/sloppedia/feature-sliced-design) のレイヤーとスライス | 組み込みルール                           | 独自の CLI と言語サーバー     |
| [Sheriff](/sloppedia/sheriff)                                   | `index.ts` を持つフォルダまたは宣言済みフォルダ                                | `sheriff.config.ts` のタグと `depRules`  | 独自の CLI と ESLint          |
| [eslint-plugin-boundaries](/sloppedia/eslint-plugin-boundaries) | ファイルパターンでマッチする要素                                               | ESLint 設定のポリシー                    | ESLint と Oxlint              |
| [Nx](/sloppedia/nx)                                             | Nx プロジェクト                                                                | タグと `depConstraints`                  | ESLint、および実験的な Oxlint |
| [Turborepo](/sloppedia/turborepo)                               | ワークスペースパッケージ                                                       | `turbo.json` のタグ                      | 実験的な `turbo boundaries`   |
| [dependency-cruiser](/sloppedia/dependency-cruiser)             | ファイル                                                                       | `.dependency-cruiser.js` のルール        | 独自の CLI                    |
| [fallow](/sloppedia/fallow)                                     | グロブパターンで定義されるゾーン                                               | 設定内のゾーンとルール、またはプリセット | `fallow architecture`         |
| ArchUnitTS                                                      | ファイルとスライス                                                             | テストコード                             | テストランナー                |
| tsarch                                                          | ファイルとスライス                                                             | テストコード                             | テストランナー                |

Steiger、Sheriff、eslint-plugin-boundaries は、1つのパッケージの内部構造を調査する。Nx と Turborepo は、モノレポ内のパッケージ間のグラフを調査する。dependency-cruiser と fallow はファイルを調査するため、両方のケースを網羅している。fallow には、レイヤー型およびヘキサゴン型アーキテクチャ向けのプリセット、Feature-Sliced Design、そして Bulletproof React が用意されている[^fallow-boundaries]。

ArchUnitTS と tsarch は、リントルールではなくテストとしてルールを記述する。ArchUnitTS は npm に `archunit` として公開されている[^archunitts]。ドキュメントによると、バージョン 2.5.0 は2026年9月12日にリリースされた[^archunitts]。tsarch の最新バージョンは2024年12月時点の 5.4.1 である[^tsarch]。

good-fences は、タグ、エクスポート、許可されたインポートを宣言するため、各フォルダに `fence.json` ファイルを配置している[^good-fences]。現在の README では、JavaScript 版はメンテナンスされていないとされており、Rust 版が参照されている[^good-fences]。

## その他の言語

| 言語   | ツール          | 概要                                                                                          |
| ------ | --------------- | --------------------------------------------------------------------------------------------- |
| Ruby   | Packwerk        | Rails アプリケーションのパッケージ間の境界をチェックする Shopify のツール[^packwerk]          |
| Ruby   | pks             | Packwerk を Rust で再実装したもので、約10〜20倍高速だと謳っている[^pks]                       |
| Python | import-linter   | Python モジュール間のインポートに関する契約をチェックする[^import-linter]                     |
| Python | Tach            | 宣言された依存関係、公開インターフェース、循環をチェックし、Rust で記述されている[^tach]      |
| Java   | ArchUnit        | バイトコードを読み込んでアーキテクチャルールをユニットテストとして記述する[^archunit]         |
| Java   | Spring Modulith | Spring Boot アプリケーションの直接のサブパッケージをモジュールとして扱い、検証する[^modulith] |

## 2026年のトレンド

複数の JavaScript ツールが、ESLint に加えて [Oxlint](/sloppedia/oxlint) でも動作し始めた。eslint-plugin-boundaries は、変更を加えることなく JavaScript プラグインとして Oxlint にロードされる[^boundaries-oxlint]。Nx は、Oxlint 向けの境界ルールを実験的なプラグインとして提供している[^nx-boundaries]。Nx は、Oxlint の JavaScript プラグイン API がセマンティックバージョニングの対象外である点に言及している[^nx-boundaries]。

ルールを評価するエンジンもリンターから分離されている。2026年11月2日、eslint-plugin-boundaries 7.4.1 で ESLint を使わずにポリシーを評価するパッケージが追加された[^boundaries-releases]。Sheriff 0.20.0 は9月に API を通じて生のインポート指定子を公開した[^sheriff-changelog]。Steiger は9月にバージョン 0.7.0 で言語サーバーを追加した[^steiger-changelog]。

Turborepo は2025年1月のバージョン 2.4 で `turbo boundaries` を追加した[^turbo-boundaries]。2026年11月12日に更新されたドキュメント時点では、この機能はまだ実験的なものである[^turbo-boundaries]。

## masseater.dev での利用

masseater.dev は、独自の規約チェッカーである msch を通じて、すべてのアプリやライブラリで [Steiger](/sloppedia/steiger) を実行する。また、未使用や重複したコードを検出するために [fallow](/sloppedia/fallow) も実行する。

## 関連項目

- [モジュール境界](/sloppedia/module-boundaries)
- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)
- [Madge](/sloppedia/madge)

[^fallow-boundaries]: Fallow「[boundaries](https://fallow.tools/docs/configuration/boundaries)」。2026年11月15日に閲覧。

[^archunitts]: Lukas Niessen「[LukasNiessen/ArchUnitTS](https://github.com/LukasNiessen/ArchUnitTS)」GitHub。2026年11月15日に閲覧。

[^tsarch]: npm「[tsarch](https://www.npmjs.com/package/tsarch)」。2026年11月15日に閲覧。

[^good-fences]: 「[smikula/good-fences](https://github.com/smikula/good-fences)」GitHub。2026年11月15日に閲覧。

[^packwerk]: Shopify「[Shopify/packwerk](https://github.com/Shopify/packwerk)」GitHub。2026年11月15日に閲覧。

[^pks]: Alex Evanczuk「[alexevanczuk/packs](https://github.com/alexevanczuk/packs)」GitHub。2026年11月15日に閲覧。

[^import-linter]: 「[import-linter/import-linter](https://github.com/import-linter/import-linter)」GitHub。2026年11月15日に閲覧。

[^tach]: 「[tach-org/tach](https://github.com/tach-org/tach)」GitHub。2026年11月15日に閲覧。

[^archunit]: 「[ArchUnit](https://www.archunit.org/)」。2026年11月15日に閲覧。

[^modulith]: Spring「[Spring Modulith](https://spring.io/projects/spring-modulith)」。2026年11月15日に閲覧。

[^boundaries-oxlint]: JS Boundaries「[Oxlint integration](https://www.jsboundaries.dev/docs/guides/oxlint-integration/)」。2026年11月15日に閲覧。

[^nx-boundaries]: Nx「[Enforce Module Boundaries](https://nx.dev/docs/features/enforce-module-boundaries)」。2026年11月15日に閲覧。

[^boundaries-releases]: Javier Brea「[Releases](https://github.com/javierbrea/eslint-plugin-boundaries/releases)」javierbrea/eslint-plugin-boundaries。2026年11月15日に閲覧。

[^sheriff-changelog]: 「[CHANGELOG](https://github.com/sheriff-arch/sheriff/blob/main/CHANGELOG.md)」sheriff-arch/sheriff。2026年11月15日に閲覧。

[^steiger-changelog]: 「[steiger の CHANGELOG](https://github.com/feature-sliced/steiger/blob/master/packages/steiger/CHANGELOG.md)」feature-sliced/steiger。2026年11月15日に閲覧。

[^turbo-boundaries]: Turborepo「[Boundaries](https://turborepo.dev/docs/reference/boundaries)」。2026年11月15日に閲覧。
