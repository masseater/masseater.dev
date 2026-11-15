---
title: "Steiger"
description: "Feature-Sliced Design チームが開発した、ファイル構造とプロジェクトアーキテクチャ用のリンター。FSD の公式リンターであり、2026年9月のバージョン 0.7.0 で言語サーバーが追加された。"
tags: ["静的解析", "フロントエンド", "TypeScript", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Feature-Sliced Design チーム"
  - label: "最初のリリース"
    value: "0.1.0（2024年6月9日）"
  - label: "最新のリリース"
    value: "0.10.0（2026年11月9日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/feature-sliced/steiger"
    href: "https://github.com/feature-sliced/steiger"
---

Steiger は、ファイル構造とプロジェクトアーキテクチャ向けのリンターである[^readme]。プラグイン `@feature-sliced/steiger-plugin` を使用すると、プロジェクトが [Feature-Sliced Design](/sloppedia/feature-sliced-design) に従っているかを確認できる[^readme]。FSD チームは、GitHub の feature-sliced/steiger リポジトリでこれを開発している。README によると、プロジェクトはまだベータ版であり、一部の API が変更される可能性がある[^readme]。

この名称はオランダ語で足場を意味する[^readme]。README では、その発音を「タイガー」の前に S を付けたものと説明している[^readme]。

## 使い方

`npx steiger ./src` は指定したフォルダをリントする[^readme]。`--watch` はフォルダを実行状態に保ち、ファイルが変更された際に再度リントする[^readme]。`--ignore-warnings` はエラーのみを報告する[^readme]。

Steiger は設定なしで動作する[^readme]。ルールを変更するには、`steiger.config.ts` に `defineConfig` を使って記述する[^readme]。設定の形式は ESLint のフラット設定に準拠しているため、一部のファイルのみルールを無効にできる[^readme]。

```ts
import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    files: ["./src/shared/**"],
    rules: { "fsd/public-api": "off" },
  },
]);
```

## ルール

FSD プラグインのバージョン 0.8.2 には21個のルールがある[^plugin]。境界を保護する主要なルールを以下に挙げる。

| ルール                        | 報告対象                                       |
| ----------------------------- | ---------------------------------------------- |
| `fsd/forbidden-imports`       | 上位レイヤーまたは兄弟スライスからのインポート |
| `fsd/no-higher-level-imports` | 上位レイヤーからのインポート                   |
| `fsd/no-cross-imports`        | 同一レイヤー内のスライス間のインポート         |
| `fsd/no-public-api-sidestep`  | スライスの公開 API をバイパスするインポート    |
| `fsd/public-api`              | 公開 API を持たないスライスおよびセグメント    |
| `fsd/no-wildcard-exports`     | 公開 API における `export *`                   |

その他のルールでは、名称や形式がチェックされる。例えば、`fsd/segments-by-purpose` は、`components` や `hooks` のように中身の種類で名付けたセグメントを禁止する[^plugin-changelog]。`fsd/no-wildcard-exports` はプラグイン 0.8.0 で追加され、デフォルトでは無効となっている[^plugin-changelog]。

## 歴史

| バージョン | 日付           | 主な変更点                                                            |
| ---------- | -------------- | --------------------------------------------------------------------- |
| 0.1.0      | 2024年6月9日   | 初回リリース                                                          |
| 0.5.0      | 2024年11月11日 | 新しい設定フォーマット                                                |
| 0.6.0      | 2026年7月14日  | パフォーマンスプロファイリング                                        |
| 0.7.0      | 2026年9月25日  | 言語サーバー、および [TypeScript 7](/sloppedia/typescript-7) への対応 |
| 0.8.0      | 2026年10月20日 | 言語サーバーが専用パッケージに移行                                    |
| 0.9.0      | 2026年11月1日  | 作業ディレクトリではなく、lint の対象から設定を読み込む               |
| 0.10.0     | 2026年11月9日  | `--config` オプション                                                 |

日付は npm による[^npm]。プラグイン 0.6.0 では、tree-sitter による依存関係の抽出が開始され、Astro や Svelte のファイルへの対応が追加された[^plugin-changelog]。VS Code や JetBrains IDE 用の拡張機能も利用可能である[^readme]。

## masseater.dev での利用

masseater.dev は、独自の規約チェッカーである msch を通じて、`apps/*/src` および `libs/*/src` で Steiger を実行する。`fsd/no-cross-imports`、`fsd/no-higher-level-imports`、`fsd/no-wildcard-exports` の3つのルールをエラーにしている。また、参照が1つしかない、あるいは全くないスライスを報告する `fsd/insignificant-slice` を無効にしている。

Sloppedia の持ち主の masseater は、Steiger がレイヤーフォルダを持たない `src` フォルダをチェックしていないことを突き止めた。このため、masseater はレイヤーフォルダを必要とする別のチェックを検討している。

## 関連項目

- [Feature-Sliced Design](/sloppedia/feature-sliced-design)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [Sheriff](/sloppedia/sheriff)

[^readme]: 「[feature-sliced/steiger](https://github.com/feature-sliced/steiger)」GitHub。2026年11月15日に閲覧。

[^plugin]: npm「[@feature-sliced/steiger-plugin](https://www.npmjs.com/package/@feature-sliced/steiger-plugin)」。2026年11月15日に閲覧。

[^plugin-changelog]: 「[@feature-sliced/steiger-plugin の CHANGELOG](https://github.com/feature-sliced/steiger/blob/master/packages/steiger-plugin-fsd/CHANGELOG.md)」feature-sliced/steiger。2026年11月15日に閲覧。

[^npm]: npm「[steiger](https://www.npmjs.com/package/steiger)」。2026年11月15日に閲覧。
