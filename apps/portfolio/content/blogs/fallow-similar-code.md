---
title: "fallow similar-code"
description: "fallow similar-code は、構文が違っても同じ処理をする関数をローカルの埋め込みモデルで探し、判断は別の判定文書に委ねる。サンプルコードとモノレポで fallow dupes と比べる。"
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

`fallow dupes` は、コピーされた後に名前が変更されたコードを検出する。あるファイルにある `for` ループと別のファイルにある `reduce` のように、別のスタイルで2回目に記述された同一の計算は検出しない。`fallow similar-code` はその隙間をカバーする。ローカルの埋め込みモデルで各関数をベクトルに変換し、ベクトルが近接しているペアを一覧表示する[^fallow-similar-code-docs]。[fallow の記事](/blogs/fallow)では、その他のコマンドについて解説している。

## dupes が見落とすもの

テストプロジェクトには、カートの合計を計算する3つの関数がある。`orderTotal`は`cartTotal`の変数名を変更したものである。`invoiceAmount`は`reduce`を用いて同じ値を計算する。

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

Fallow 3.43.1 ではこのような結果となった。dupes は、小さな関数でも一致するように `--min-tokens 20 --min-lines 3` で実行した。

| ペア                            | `dupes --mode mild` | `dupes --mode semantic` | `similar-code` のスコア |
| ------------------------------- | ------------------- | ----------------------- | ----------------------- |
| `cartTotal` と `orderTotal`     | 検出しない          | 検出する                | 0.83                    |
| `orderTotal` と `invoiceAmount` | 検出しない          | 検出しない              | 0.76                    |
| `cartTotal` と `invoiceAmount`  | 検出しない          | 検出しない              | 0.72                    |

dupes のデフォルトモードは名前を残したままトークン列を比較するため、名前を変えるだけでコピーは検出されなくなる。セマンティックモードでは名前とリテラルを置き換えるため、名前変更されたコピーを検出する。どちらのモードも、トークンの順序が異なるため、`reduce` 版は検出できない。そのペアにスコアを付けるのは `similar-code` だけである。

## スコアは判定ではない

`similar-code` のデフォルトの閾値は0.8であるため、デフォルト設定では`reduce`ペアは表示されない。上記の結果は`--threshold 0.5`によるものである。このコマンドは、候補の一覧の前に「モデルスコアはコサイン類似度であり、確率やリファクタリング判定ではない」と出力し、各候補を未検証としてラベル付けする。ドキュメントでは、作業分担について「固定されたローカルモデルがそれらを見つけ、人間が判断する」と1行で記述されている[^fallow-similar-code-docs]。

本モデルはApache-2.0ライセンスに基づく `jinaai/jina-embeddings-v2-base-code` であり、1つのリビジョンに固定されている。明示的な同意を得て一度だけダウンロードするセットアップ後、解析はオフラインで実行され、ソースコードがマシン外へ流出することはない[^fallow-similar-code-docs]。モデルファイルはユーザーキャッシュに310 MB格納された。

## 判定は別の文書に書く

判定は3つのステップで行われる。最初の `fallow similar-code inspect <candidate_id> --candidates similar-code.json` は両方の関数のソースを表示する。出力は「Decide candidate_worthy, behaviorally_equivalent, and refactor_safe separately」という言葉で締めくくられる。

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

判定結果は候補リストではなく、個別のJSONドキュメントに記述される。各判定結果には3つの独立した軸とアウトカムがある。`refactor_safe: true` には `behaviorally_equivalent: true` が必要であり、これには `candidate_worthy: true` が必要となる[^fallow-similar-code-skill]。アウトカムは、`same-responsibility`、`related-but-distinct`、`intentional-duplication`、`unrelated`、`needs-human-review`のいずれかとなる。意図的な重複は、想定される回答の1つである。

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

`fallow similar-code review` は、いずれのファイルも変更せずに候補と判定結果を結合する。3つの候補のうち2つの判定結果がある場合、3つ目は `needs-human-review` として報告される。`--require-verdict-for-each-candidate` を付けると、"a verdict is required for every candidate" と出して失敗する。

```text
src/invoice.ts:3 invoiceAmount
  <-> src/cart.ts:6 cartTotal
  Match: unverified
  Outcome: needs-human-review
  Rationale: no safely matched verdict

Reviewed: 3 candidates, 2 matched verdicts, 1 unmatched candidate
```

変更のないコードでディスカバリを再実行した場合、候補の `candidate_id` と `review_key` は同一のままであった。したがって、リポジトリに保存された判定ファイルは次回の実行でも同一のペアを対象とし、判定の無い候補として出るのは、新規または変更されたペアだけになる。

## ビルドを止める検査には入らない

fallow は、引数なしの解析、`audit` の合否判定、SARIF、エディタの診断、自動修正から `similar-code` を外している[^fallow-changelog]。その終了コードは、候補に対して失敗しない。設計は上記の判定リストに適合している。スコア0.83は、忘れられたコピーのこともあれば、別々に変わるべき2つの関数のこともあり、どちらなのかは両方を読まないと分からない。`similar-code` は、候補を読み取り判定を記録する定期レビューに適合し、dupes はビルドを失敗させるチェックとして残る。

## モノレポの数値

4コアのLinuxコンテナ上で、2,643ファイル、約18万行からなるTypeScriptモノレポにて、`similar-code` は1,414個の関数をベクトルに変換した。初回実行は4分18秒、ベクトルキャッシュを用いた2回目の実行は2秒かかった。デフォルトの閾値で65件の候補が返された。この実行は、上限である1,000,000回の比較で停止し、約2,770万組をスキップしたため、「部分的」であると判定された。完全な実行のみが、空の結果を決定的なものにする[^fallow-similar-code-skill]。

スコア1.0を記録した上位候補は、別々のファイルにある、同じオブジェクトを組み立てる同一の7行の関数2つだった。デフォルトモードの `fallow dupes` では、当該関数が最小値の50トークンを下回っていたため、リポジトリ内にクローンは報告されていなかった。

[^fallow-similar-code-docs]: TypeScriptで意味的に類似した関数を探す。fallowドキュメント。 https://fallow.tools/docs/analysis/similar-code/

[^fallow-similar-code-skill]: Semantic Similar-Code Workflow。fallowスキルリファレンス、fallow 3.43.1 npmパッケージ (`skills/fallow/references/similar-code.md`)。

[^fallow-changelog]: fallow CHANGELOG。 https://github.com/fallow-rs/fallow/blob/main/CHANGELOG.md
