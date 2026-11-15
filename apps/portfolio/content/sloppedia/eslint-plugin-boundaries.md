---
title: "eslint-plugin-boundaries"
description: "ソフトウェアアーキテクチャの各要素間の依存関係をチェックする ESLint プラグイン。Javier Brea が2020年から開発しており、2026年のバージョン 7 ではポリシーを軸にルールを再構築したほか、Oxlint でも動作する。"
tags: ["静的解析", "JavaScript", "TypeScript", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Javier Brea"
  - label: "最初のリリース"
    value: "1.0.0（2020年6月13日）"
  - label: "最新のリリース"
    value: "7.4.4（2026年11月15日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "jsboundaries.dev"
    href: "https://www.jsboundaries.dev/"
---

eslint-plugin-boundaries は、ソフトウェアアーキテクチャの要素間の依存関係をチェックする ESLint プラグインである[^overview]。Javier Brea が2020年から開発している[^overview]。プロジェクトは現在 JS Boundaries と名乗っており、ESLint プラグインが主要なツールとなっている[^overview]。

## コンセプト

プラグインは各ファイルを3つの方法で分類する[^overview]。要素とはアーキテクチャにおいてファイルが担う役割のことで、通常はフォルダに対応する。ファイルカテゴリは、テストであるといったように、要素を横断するプロパティを記述する。モジュールは、各インポートがどこから来るかを記述する。具体的には、ローカルコード、外部パッケージ、または Node.js の組み込みモジュールである。

その後、ルールによってある記述から別の記述への依存が許可されるかどうかが決定される[^overview]。

```js
import boundaries from "eslint-plugin-boundaries";

export default [{ plugins: { boundaries }, ...boundaries.configs.recommended }];
```

## ルール

バージョン 7.4 の時点で、主要なルールは `boundaries/dependencies` となっている[^rules]。その `policies` オプションには、許可または禁止される依存関係が列挙されている[^rules]。例えば、あるポリシーではコントローラーがモデルやビューに依存することを許可できる。別のポリシーでは、どこからもテストファイルをインポートすることを禁止できる[^overview]。

その他のルールでは、どの要素にも一致しないファイルや未知のファイルへの依存関係が報告される[^rules]。旧来のルールである `element-types`、`entry-point`、`external`、`no-private` は依然として有効だが非推奨となっている[^rules]。ドキュメントでは代わりに `boundaries/dependencies` が指定されている[^rules]。

## 歴史

| バージョン | 日付           | 主な変更点                                                                 |
| ---------- | -------------- | -------------------------------------------------------------------------- |
| 1.0.0      | 2020年6月13日  | 初回リリース                                                               |
| 5.0.0      | 2024年11月5日  | ESLint 9 以降が必要                                                        |
| 6.0.0      | 2026年3月15日  | オブジェクトベースのセレクタ。`element-types` が `dependencies` に名称変更 |
| 7.0.0      | 2026年7月5日   | 要素、ファイル、モジュールのモデル。`rules` が `policies` に変更           |
| 7.3.0      | 2026年10月23日 | 約2.5倍高速化                                                              |
| 7.4.1      | 2026年11月2日  | ESLint なしでポリシーを評価するパッケージ                                  |
| 7.4.4      | 2026年11月15日 | オンラインプレイグラウンドの改善                                           |

日付は npm による[^npm]。2025年11月10日以降、同じプラグインが `@boundaries/eslint-plugin` としても公開されている[^npm-scoped]。バージョン 7.4.1 では、設定を読み込む部分とポリシーを評価する部分が `@boundaries/config` と `@boundaries/policies` に分割された[^releases]。これらのパッケージは ESLint なしで Node.js やブラウザで動作する[^releases]。バージョン 7.4.3 ではウェブサイトにプレイグラウンドが追加された[^releases]。

## Oxlint

[Oxlint](/sloppedia/oxlint) は `jsPlugins` 経由でプラグインをロードできる[^oxlint]。これは、プラグインが ESLint の標準ルール API のみを使用しているためである[^oxlint]。ガイドでは、インポートリゾルバーを設定する必要があると警告している[^oxlint]。これがないと、パスエイリアス経由のインポートは暗黙的に外部パッケージとして扱われる[^oxlint]。

スコープ名 `@boundaries/eslint-plugin` が使用されている場合、`jsPlugins` 内の単純な文字列は失敗する[^oxlint]。その場合、プラグインを `name` と `specifier` を持つオブジェクトとして指定する必要がある[^oxlint]。

## 関連項目

- [モジュール境界](/sloppedia/module-boundaries)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [Sheriff](/sloppedia/sheriff)

[^overview]: JS Boundaries「[Overview](https://www.jsboundaries.dev/docs/overview/)」。2026年11月15日に閲覧。

[^rules]: JS Boundaries「[Rules](https://www.jsboundaries.dev/docs/rules/)」。2026年11月15日に閲覧。

[^npm]: npm「[eslint-plugin-boundaries](https://www.npmjs.com/package/eslint-plugin-boundaries)」。2026年11月15日に閲覧。

[^npm-scoped]: npm「[@boundaries/eslint-plugin](https://www.npmjs.com/package/@boundaries/eslint-plugin)」。2026年11月15日に閲覧。

[^releases]: Javier Brea「[Releases](https://github.com/javierbrea/eslint-plugin-boundaries/releases)」javierbrea/eslint-plugin-boundaries。2026年11月15日に閲覧。

[^oxlint]: JS Boundaries「[Oxlint integration](https://www.jsboundaries.dev/docs/guides/oxlint-integration/)」。2026年11月15日に閲覧。
