---
title: "Sheriff"
description: "TypeScript プロジェクトにおいて、タグを使ってモジュール境界と依存関係ルールを強制するツール。2023年に Angular Architects の Rainer Hahnekamp によって開発が開始され、2026年9月にバージョン 0.20.0 がリリースされた。"
tags: ["静的解析", "TypeScript", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Rainer Hahnekamp"
  - label: "最初のリリース"
    value: "2023年3月23日"
  - label: "最新のリリース"
    value: "0.20.0（2026年9月29日）"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "github.com/sheriff-arch/sheriff"
    href: "https://github.com/sheriff-arch/sheriff"
---

Sheriff は、TypeScript プロジェクトにおいてモジュールの境界と依存関係ルールを強制するツールである[^readme]。独自の依存関係を持たず、TypeScript のみをピア依存関係として必要とする[^readme]。CLI として実行できるほか、ESLint プラグインを通じてエディタに違反を通知できる[^readme]。

## 歴史

npm では Angular Architects の Rainer Hahnekamp が作者として記載されている[^npm]。Manfred Steyer もメンテナーの一人である[^npm]。コアパッケージの `@softarc/sheriff-core` が初めて npm で公開されたのは2023年3月23日である[^npm]。ドキュメントは Softarc Consulting が公開している[^intro]。

リポジトリは GitHub の softarc-consulting/sheriff にあったが、現在は sheriff-arch/sheriff にある[^repo]。バージョン 0.20.0 は2026年9月29日にリリースされた[^changelog]。チェンジログでは、本バージョンのコントリビューターとして Claude Sonnet 4.6 に感謝している[^changelog]。

## モジュール

Sheriff はフォルダを2通りの方法でモジュールとして扱う[^modules]。ルートに `index.ts` を持つフォルダは、設定なしでバレルモジュールとなる[^modules]。他のモジュールは、`index.ts` がエクスポートする内容のみをインポートできる[^modules]。

バレルレスモジュールは `sheriff.config.ts` で宣言し、`enableBarrelLess: true` が必要である[^modules]。`internal` フォルダ内のファイルを除き、これらのファイルは公開される[^modules]。ドキュメントでは、ツリーシェイキングとの相性が良いため、バレルレスモジュールが推奨されている[^modules]。

## タグと依存関係ルール

各モジュールには1つ以上のタグが付与される。タグは `modules` のパス単位で割り当てることができ、`<name>` のようなプレースホルダーはパスとタグの両方で使用可能である[^deps]。`depRules` には、各タグに対してアクセス可能なタグが列挙される[^deps]。

```ts
import { sameTag, SheriffConfig } from "@softarc/sheriff-core";

export const sheriffConfig: SheriffConfig = {
  modules: {
    "src/app/<domain>/<type>": ["domain:<domain>", "type:<type>"],
  },
  depRules: {
    "domain:*": [sameTag, "shared"],
    "type:feature": "type:data",
    root: ["type:feature"],
  },
};
```

この例では、モジュールは自身のドメインのモジュールと `shared` タグを使用できる[^deps]。フィーチャーはデータを使用でき、ルートモジュールはフィーチャーを使用できる[^deps]。手動タグのないモジュールには `noTag` タグが付与される[^deps]。どのモジュールにも属さないファイルは `root` モジュールとなり、このモジュールには `root` タグが付与される[^deps]。

## CLI

| コマンド             | 役割                                 |
| -------------------- | ------------------------------------ |
| `npx sheriff init`   | `sheriff.config.ts` を作成する       |
| `npx sheriff verify` | ルールを確認する                     |
| `npx sheriff list`   | モジュールとそのタグを一覧表示する   |
| `npx sheriff export` | 依存関係グラフを JSON 形式で出力する |

エントリポイントは `entryFile` で設定する[^cli]。バージョン 0.19 では複数のエントリポイントに名前を付ける `entryPoints` が追加された[^cli]。

## Angular との関係

ドキュメントの例では、`src/main.ts` といった Angular CLI のパスが使用されている[^cli]。ツール自体は、あらゆる TypeScript プロジェクトで動作する。ドメインや種類ごとにコードをタグでグループ化するという考え方は、[Nx](/sloppedia/nx) のモジュール境界ルールに似ている。

## 関連項目

- [モジュール境界](/sloppedia/module-boundaries)
- [モジュール境界ツール](/sloppedia/module-boundary-tools)
- [eslint-plugin-boundaries](/sloppedia/eslint-plugin-boundaries)

[^readme]: 「[sheriff-arch/sheriff](https://github.com/sheriff-arch/sheriff)」GitHub。2026年11月15日に閲覧。

[^repo]: 「[sheriff-arch/sheriff](https://github.com/sheriff-arch/sheriff)」GitHub。2026年11月15日に閲覧。

[^npm]: npm「[@softarc/sheriff-core](https://www.npmjs.com/package/@softarc/sheriff-core)」。2026年11月15日に閲覧。

[^intro]: Softarc Consulting「[Introduction](https://sheriff.softarc.io/docs/introduction)」。2026年11月15日に閲覧。

[^changelog]: 「[CHANGELOG](https://github.com/sheriff-arch/sheriff/blob/main/CHANGELOG.md)」sheriff-arch/sheriff。2026年11月15日に閲覧。

[^modules]: Softarc Consulting「[Module Boundaries](https://sheriff.softarc.io/docs/module_boundaries)」。2026年11月15日に閲覧。

[^deps]: Softarc Consulting「[Dependency Rules](https://sheriff.softarc.io/docs/dependency-rules)」。2026年11月15日に閲覧。

[^cli]: Softarc Consulting「[CLI](https://sheriff.softarc.io/docs/cli)」。2026年11月15日に閲覧。
