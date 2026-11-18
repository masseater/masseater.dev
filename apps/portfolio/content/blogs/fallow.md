---
title: "fallow: 未使用コード、重複、および境界違反を単一のバイナリで検出する"
description: "Rustで書かれた分析ツール「fallow」を実行し、未使用のファイル、エクスポート、依存関係、重複コードを検出した結果と、差分ファイル内の変更のみを判定する監査、およびAIエージェントのコミットを阻止するフックの結果。"
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

TypeScriptのプロジェクトにおいて、どこからもインポートされていないファイルや、一度も使用されていないエクスポート、そして `package.json` に残されているが一度もインポートされていない依存関係を探す際の一般的な方法は、[knip](https://knip.dev/) を使うことだった。用途ごとに別々のツールが必要だった：コピペされた関数を検出する [jscpd](https://github.com/kucherenko/jscpd)、CSSをチェックする [stylelint](https://stylelint.io/) などだ。[fallow](https://fallow.tools/)は、これらのチェックをRustで書かれた単一のバイナリに集約する解析ツールであり、パースには[Oxc](https://oxc.rs/)を使用している[^fallow-readme]。Node.js プロセスを起動しないため、next.js モノレポ（20,558 ファイル）内で未使用のコードを検出する処理は 2.95 秒で完了する[^fallow-readme]。

## 検出できること

| コマンド                              | 検出するもの                                                           |
| ------------------------------------- | ---------------------------------------------------------------------- |
| `fallow dead-code`                    | 未使用ファイル、エクスポート、型、クラスおよび列挙型のメンバ、依存関係 |
| `fallow dupes`                        | JS、TS、CSS、Vue、Svelte、Astroにおける重複コード                      |
| `fallow health`                       | 複雑性のホットスポットと0〜100の健全性スコア                           |
| `fallow architecture`、`fallow guard` | レイヤー間の依存関係の方向性の違反、および循環依存関係                 |
| `fallow security`                     | エントリポイントからの到達可能性順のセキュリティ候補                   |
| `fallow audit`                        | 変更されたファイルのみを対象としたpass、warn、failの判定               |

引数なしで `fallow` を実行すると、デッドコード、重複、および複雑性チェックがまとめて実行される[^fallow-readme]。

## 実行例

以下の設定で試してみる。唯一のエントリポイントは `index.ts` であり、`legacy.ts` はどこからもインポートされていない。`price.ts` には未使用のエクスポートがあり、`package.json` には依然として lodash が記載されているが、インポートされていない。

```ts
import { z } from "zod";

// src/index.ts
import { formatPrice } from "./price";

const Order = z.object({ total: z.number() });
export const main = () => console.log(formatPrice(Order.parse({ total: 100 }).total));
main();
```

```ts
// src/price.ts
export const formatPrice = (n: number) => `${n.toFixed(2)} JPY`;
export const formatPriceUsd = (n: number) => `${n.toFixed(2)} USD`;
export type Currency = "JPY" | "USD";
```

```json
// .fallowrc.json
{ "entry": ["src/index.ts"] }
```

`npx fallow` の出力に含まれる未使用のコード部分がこれだ。

```text
● Unused files (1)
  src/legacy.ts
  Files not reachable from any entry point

● Unused exports (1)
  src/price.ts
    :2 formatPriceUsd

● Unused type exports (1)
  src/price.ts
    :3 Currency

● Unused dependencies (1)
  lodash
  Listed in dependencies but never imported

✗ 1 file · 1 export · 1 type · 1 unused dependency (0.07s)
```

ファイル、エクスポート、型、依存関係の4種類が、一度のパスでまとめて報告される。

## 残したいコードを、理由を添えて抑制する

来月使用する予定のエクスポートを削除したくない場合は、その直前の行にコメントを記載すること。

```ts
// fallow-ignore-next-line unused-export -- 来月の USD 対応で使う
export const formatPriceUsd = (n: number) => `${n.toFixed(2)} USD`;
```

次回の実行時には `1 suppressed` としてカウントされ、違反から除外される。後から抑制された問題が消えた場合、抑制コメント自体が `stale suppression`[^fallow-readme] として報告される。もはや何の役にも立たない `eslint-disable` コメントが放置されるような状態にはならない。

## 重複の検出

同じ計算を2つのファイルに貼り付け、変数名だけを変更して `fallow dupes` を実行する。

```text
● Duplicates (1 clone groups)

     12 lines  2 instances  dup:0b64f8f8
    src/a.ts:4-15
    src/b.ts:4-15

⚠ 24 lines (58.5%) duplicated across 2 files (0.01s)
```

比較は識別子名ではなく構造に基づいて行われるため、`Row` が `Line` に、`invoiceTotal` が `quoteTotal` に書き換えられたコピーも、同一のクローンとして報告される。

## 変更された部分のみを判定する監査

既存のコードベースには、多くの場合、すでに数百もの未使用のエクスポートが存在する。すべて修正されるまでCIを赤いままにはしておけないため、`fallow audit`はベースブランチからのdiffで変更されたファイルのみをチェックし、判定はその変更によって新たに生じた問題のみに基づいて行われる[^fallow-readme]。

フィーチャーブランチに `tax.ts` を追加し、そこから `withTax` のみを使用して監査を実行する。

```text
$ fallow audit --base main
Audit scope: 2 changed files vs main (cf92e12..HEAD)

● Unused exports (2)
  src/tax.ts (2)
    :1 taxRate
    :3 withoutTax

✗ dead code: 2 issues · 2 changed files (0.08s)
```

mainに既にあった`legacy.ts`はレポートに含まれていない。既存の問題でも失敗させたいなら、`--gate all`[^fallow-readme]を追加する。

## AIエージェントのコミットを阻止するフック

`fallow agent install` を実行すると、検出された Claude Code、Codex、Cursor のいずれかのフックが設定される[^fallow-readme]。[Claude Code](https://code.claude.com/docs/)では、PreToolUse フックとして登録されている。エージェントが `git commit` や `git push` を実行しようとすると `fallow audit` が実行され、判定が失敗した場合はコマンドが拒否される。エージェントは、追加した未使用のエクスポートをその場で修正するまで、コミットできない。

## 型情報を用いた解析

デフォルトの解析は構文のみに基づいている。`--type-aware` により、TypeScript シンボルの同一性がエイリアス、再エクスポート、パッケージ境界をまたいで追跡されるため、インターフェースの実装や基底クラスのメンバが未使用であると誤判定されることがなくなる[^fallow-readme]。

## knipからの移行

`npx fallow migrate` を実行すると、既存の knip、jscpd、stylelint の設定が読み込まれ、fallow の設定に変換される[^fallow-readme]。

[^fallow-readme]: fallow README. https://github.com/fallow-rs/fallow
