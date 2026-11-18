---
title: "ファロー・アナログコード"
description: "fallow similar-codeは、ローカル埋め込みモデルを用いて異なる構文で同様の動作をする関数を検出し、その判定を別途Verdictドキュメントに委ねている。この記事では、サンプルコードとモノレポにおけるフォールー・デュープと比較する。"
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

`fallow dupes` は、コピーされた後に名前が変更されたコードを検出する。あるファイルには `for` ループ、別のファイルには `reduce` ループがあるといった、異なるスタイルで記述された同一の計算は検出されない。`fallow similar-code` がその隙間を埋めている。各関数をローカル埋め込みモデルを持つベクトルに変換し、ベクトルが近接しているペアを列挙する[^fallow-similar-code-docs]。[Fallowの投稿](/blogs/fallow)では、その他のコマンドについて解説している。

## 重複が見落としていること

テストプロジェクトには、カートの合計を計算する関数が3つある。`orderTotal` は `cartTotal` の変数名を変更したものである。`invoiceAmount` は `reduce` で同じ値を計算する。

```ts
export function cartTotal(items: readonly Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

export function orderTotal(entries: readonly Item[]): number {
  let sum = 0;
  for (const entry of entries) {
    sum += entry.price * entry.quantity;
  }
  return sum;
}

export const invoiceAmount = (lines: readonly Item[]): number =>
  lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
```

fallow 3.43.1 では、結果は以下の通りだった。小さな関数がマッチするように、`--min-tokens 20 --min-lines 3` を指定して重複を処理した。

| ペア                            | `dupes --mode mild` | `dupes --mode semantic` | `similar-code` スコア |
| ------------------------------- | ------------------- | ----------------------- | --------------------- |
| `cartTotal` と `orderTotal`     | 見つからない        | 見つかった              | 0.83                  |
| `orderTotal` と `invoiceAmount` | 見つからない        | 見つからない            | 0.76                  |
| `cartTotal` と `invoiceAmount`  | 見つからない        | 見つからない            | 0.72                  |

重複のデフォルトモードでは、トークンシーケンスと保持された名前を比較するため、名前を変更するだけでコピーは非表示になる。セマンティックモードは名前やリテラルを置き換えるため、名称変更されたコピーを検出する。トークンの順序が異なるため、どちらのモードでも `reduce` のバージョンが見つからない。`similar-code` のみがそのペアにスコアを付与する。

## スコアは判定ではない

`similar-code` のデフォルトの閾値は 0.8 なので、デフォルト設定では `reduce` ペアは表示されない。上記の結果は `--threshold 0.5` の場合である。候補リストの前に、コマンドは「モデルスコアはコサイン類似度であり、確率やリファクタリング判定ではない」と出力し、各候補を未検証としてラベル付けする。ドキュメントでは、作業分担について「固定されたローカルモデルがそれらを見つけ、人間が判断する」と一行で説明されている[^fallow-similar-code-docs]。

モデルは Apache-2.0 ライセンスの `jinaai/jina-embeddings-v2-base-code` で、1 つのリビジョンに固定されている。明示的な同意を得て一度だけダウンロードするセットアップの後、解析はオフラインで実行され、ソースコードはマシンから排出されない[^fallow-similar-code-docs]。モデルファイルがユーザーキャッシュに310 MB消費した。

## 判定は別文書に記載すること

判断には3つのステップがある。まず、`fallow similar-code inspect <candidate_id> --candidates similar-code.json` で、両方の関数のソースコードが表示される。出力は「Decide candidate_worthy, behaviorally_equivalent, and refactor_safe separately」という言葉で締めくくられている。

```text
src/invoice.ts:3  invoiceAmount
(lines: readonly Item[]): number =>
  lines.reduce(
    (sum, line) => sum + line.quantity * line.price,
    0,
  )

src/cart.ts:6  cartTotal
function cartTotal(items: readonly Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
```

判定結果は候補リストではなく、別のJSONドキュメントに記載されている。各判定には3つの独立した軸と結果がある。`refactor_safe: true` には `behaviorally_equivalent: true` が必要であり、さらにそれには `candidate_worthy: true` が必要となる[^fallow-similar-code-skill]。結果は、`same-responsibility`、`related-but-distinct`、`intentional-duplication`、`unrelated`、および `needs-human-review` のいずれかとなる。意図的な重複は想定される回答の一つだ。

```json
{
  "schema_version": "1",
  "verdicts": [
    {
      "candidate_id": "similar-code:candidate:v1:ba7f6fe4…",
      "review_key": "similar-code:review:v1:…",
      "candidate_worthy": true,
      "behaviorally_equivalent": true,
      "refactor_safe": true,
      "outcome": "same-responsibility",
      "rationale": "Both multiply price by quantity and sum the lines."
    }
  ]
}
```

`fallow similar-code review` は、いずれのファイルも変更することなく、候補と判定結果を結合する。3つの候補のうち2つに判定が出たため、3つ目は `needs-human-review` と報告されている。`--require-verdict-for-each-candidate` だと、「各候補に対して判定が必要」で失敗する。

```text
src/invoice.ts:3 invoiceAmount
  <-> src/cart.ts:6 cartTotal
  Match: unverified
  Outcome: needs-human-review
  Rationale: no safely matched verdict

Reviewed: 3 candidates, 2 matched verdicts, 1 unmatched candidate
```

変更のないコードで再度ディスカバリを実行したところ、候補の `candidate_id` と `review_key` は変わらなかった。つまり、リポジトリに保存された判定ファイルは、次回の実行時に同一のペアを判定し、判定なしの候補として現れるのは新規または変更されたペアのみとなる。

## ビルドを停止するチェックからは除外される。

fallowは、引数なしの`similar-code`、`audit`の合否判定、SARIF、エディタの診断機能、および自動修正を解析対象から除外している[^fallow-changelog]。その終了コードは候補に対して失敗しない。デザインは上記の判定リストに合致している。スコア0.83は、忘れられたコピーか、あるいは個別に変更すべき2つの関数のいずれかであり、両方を読まなければどちらであるか判別できない。`similar-code`は、候補を読み込み判定を記録する通常のレビューに適しており、dupesはビルドに失敗するチェックとして残っている。

## モノレポ上の数値

2,643ファイル、約18万行からなるTypeScriptのモノレポで、4コアのLinuxコンテナにおいて、`similar-code`は1,414個の関数をベクトルに変換した。1回目の実行は4分18秒、2回目はベクトルキャッシュ付きで2秒かかった。デフォルトの閾値では、65件の候補が返された。実行は1,000,000回の比較という制限で停止し、約2,770万組をスキップしたため、「一部」とマークされた。完全な実行を行って初めて、結果が空で確定的になる[^fallow-similar-code-skill]。

スコア1.0の最有力候補は、別々のファイルにある同一の7行関数2つで、同じオブジェクトを構築するものだった。デフォルトモードの `fallow dupes` は、それらの関数が最小値の 50 トークンを下回っていたため、リポジトリにクローンが報告されなかった。

[^fallow-similar-code-docs]: TypeScriptのfallowドキュメントで、意味的に類似した関数を探す。https://fallow.tools/docs/analysis/similar-code/

[^fallow-similar-code-skill]: セマンティック・類似コード・ワークフロー。fallowスキルのリファレンス。fallow 3.43.1 npm パッケージ (`skills/fallow/references/similar-code.md`) 内。

[^fallow-changelog]: fallow CHANGELOG. https://github.com/fallow-rs/fallow/blob/main/CHANGELOG.md
