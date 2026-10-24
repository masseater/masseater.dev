---
title: "fallow: 未使用コード・重複・境界違反を 1 つのバイナリで検出する"
description: "Rust 製の解析ツール fallow で、未使用のファイル・export・依存、重複コード、変更差分だけを判定する audit を実行した結果と、AI エージェントの commit を止める hook。"
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

TypeScript のプロジェクトで、どこからも import されていないファイル、使われていない export、`package.json` に残ったまま import されない依存を探すには、これまで [knip](https://knip.dev/) を使うのが一般的だった。コピペされた関数の検出には [jscpd](https://github.com/kucherenko/jscpd)、CSS の検査には [stylelint](https://stylelint.io/) と、目的ごとに別のツールを並べる必要があった。[fallow](https://fallow.tools/) は、これらの検査を Rust 製の 1 つのバイナリにまとめた解析ツールで、構文解析には [Oxc](https://oxc.rs/) が使われている[^fallow-readme]。Node.js のプロセスを起動しないため、next.js の monorepo（20,558 ファイル）に対する未使用コードの検出は 2.95 秒で完了する[^fallow-readme]。

## 検出できるもの

| コマンド                              | 検出対象                                                       |
| ------------------------------------- | -------------------------------------------------------------- |
| `fallow dead-code`                    | 未使用のファイル、export、型、クラスと enum のメンバー、依存   |
| `fallow dupes`                        | JS、TS、CSS、Vue、Svelte、Astro の重複コード                   |
| `fallow health`                       | 複雑度のホットスポットと 0〜100 の健全性スコア                 |
| `fallow architecture`、`fallow guard` | レイヤー間の依存の向きの違反と循環依存                         |
| `fallow security`                     | エントリーポイントから到達可能な順に並べたセキュリティ上の候補 |
| `fallow audit`                        | 変更したファイルだけを対象にした pass / warn / fail の判定     |

引数なしで `fallow` を実行すると、dead-code、dupes、複雑度の検査がまとめて走る[^fallow-readme]。

## 実行例

次の構成で試す。エントリーポイントは `index.ts` だけで、`legacy.ts` はどこからも import されていない。`price.ts` には使われていない export があり、`package.json` には import していない lodash が残っている。

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

`npx fallow` の出力のうち、未使用コードの部分を抜き出す。

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

ファイル、export、型、依存の 4 種類が、1 回の走査でまとめて報告される。

## 残したいコードには理由を添えて抑制する

来月使う予定の export を消したくない場合は、その行の直前にコメントを置く。

```ts
// fallow-ignore-next-line unused-export -- 来月の USD 対応で使う
export const formatPriceUsd = (n: number) => `${n.toFixed(2)} USD`;
```

次の実行では `1 suppressed` として数えられ、違反からは外れる。抑制の対象だった問題が後に消えると、今度はその抑制コメント自体が `stale suppression` として報告される[^fallow-readme]。効いていない `eslint-disable` が放置されるような状態が起きない。

## 重複の検出

同じ計算を 2 ファイルに貼り付け、変数名だけを変えた状態で `fallow dupes` を実行する。

```text
● Duplicates (1 clone groups)

     12 lines  2 instances  dup:0b64f8f8
    src/a.ts:4-15
    src/b.ts:4-15

⚠ 24 lines (58.5%) duplicated across 2 files (0.01s)
```

比較は識別子の名前ではなく構造で行われるため、`Row` を `Line` に、`invoiceTotal` を `quoteTotal` に書き換えた複製も同じクローンとして報告される。

## 変更した箇所だけを判定する audit

既存のコードベースには、すでに未使用の export が何百もあることが多い。全部を直すまで CI を赤くし続けるわけにはいかないので、`fallow audit` では base ブランチとの差分で変わったファイルだけが検査対象になり、その変更で新たに持ち込まれた問題だけで合否が決まる[^fallow-readme]。

feature ブランチで `tax.ts` を追加し、そのうち `withTax` だけを使った状態で実行する。

```text
$ fallow audit --base main
Audit scope: 2 changed files vs main (cf92e12..HEAD)

● Unused exports (2)
  src/tax.ts (2)
    :1 taxRate
    :3 withoutTax

✗ dead code: 2 issues · 2 changed files (0.08s)
```

main に元からある `legacy.ts` は報告に含まれない。既存の問題も含めて落としたい場合は `--gate all` を付ける[^fallow-readme]。

## AI エージェントの commit を止める hook

`fallow agent install` を実行すると、Claude Code、Codex、Cursor のうち検出されたものに hook が設定される[^fallow-readme]。[Claude Code](https://code.claude.com/docs/) の場合は PreToolUse hook として登録される。エージェントが `git commit` か `git push` を実行しようとした時点で `fallow audit` が走り、verdict が fail ならコマンドの実行が拒否される。エージェントは、自分が追加した未使用 export をその場で直すまで commit できない。

## 型情報を使った解析

既定の解析は構文だけで行われる。`--type-aware` を付けると、TypeScript のシンボルの同一性が alias、re-export、パッケージ境界をまたいで追跡され、interface の実装や基底クラスのメンバーが未使用と誤判定されなくなる[^fallow-readme]。

## knip からの移行

`npx fallow migrate` を実行すると、knip、jscpd、stylelint の既存の設定が読み込まれ、fallow の設定に変換される[^fallow-readme]。

[^fallow-readme]: fallow README. https://github.com/fallow-rs/fallow
