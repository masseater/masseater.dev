---
title: "fu4: actionlint と zizmor の移植を、本家のテストデータで答え合わせする"
description: "actionlint、shellcheck、zizmor を再実装した GitHub Actions リンター fu4 を、本家が自身のテスト入力に対して出す結果と 1 行ずつ比べる方法と、残った不一致を理由付きで記録する方法。"
tags: ["fu4", "GitHub Actions", "静的解析"]
published: true
---

[fu4](https://www.npmjs.com/package/@r_masseater/fu4) は、3 つのツールを 1 つのパッケージに再実装した GitHub Actions のリンターである。[actionlint](https://github.com/rhysd/actionlint) と同じ内容を報告し、`run:` のスクリプトを tree-sitter-bash で解析して [shellcheck](https://www.shellcheck.net/) のよく出る指摘を出し、[zizmor](https://github.com/zizmorcore/zizmor) のセキュリティ監査もかける。README は本家と「同じメッセージと位置」を出すとうたっている。この約束が意味を持つのは、確かめられたときだけである。しかし 3 つのツールのコードを読み比べて確かめる方法は現実的でない。fu4 は、本家のテスト入力を fu4 に通し、同じ入力に対して本家が出した結果と比べることで確かめている。

## 本家 3 つを答えとして使う

どの本家も、入力と記録済みの出力の組をテストデータとして持っている。fu4 はそれぞれのコピーをリポジトリに置き、記録済みの出力を正解として扱う。

| 本家       | バージョンと引数                      | 入力                                                               | 比べるもの                                        |
| ---------- | ------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| actionlint | 取り込んだ `testdata`                 | エラー例 95、examples 51、通るべきワークフロー 84、プロジェクト 30 | `.out` の各行（パス、行、列、メッセージ、ルール） |
| shellcheck | 0.9.0、actionlint が渡すのと同じ引数  | スクリプト 331                                                     | fu4 が実装した 12 個の SC コードの行の集合        |
| zizmor     | 1.32.0、`--offline --persona auditor` | 入力 78、ケース 278、36 種の監査による指摘 705                     | ルール、行、列、注記、重大度、確度、ペルソナ      |

期待する出力は手で直さない。本家が変わったら、本家を実行し直して作り直す。

## actionlint の Go の正規表現を別の言語で読む

actionlint の `.out` ファイルは、Go で書かれたテストランナー向けの形式である[^actionlint-projects-readme]。ほとんどの行はそのまま比べる文字列になっている。

```text
test.yaml:8:30: label "windows-latest" conflicts with label "ubuntu-latest" defined at line:8,col:15. note: to run your job on each workers, use matrix [runner-label]
```

`/` で始まり `/` で終わる行は正規表現である。既知のランナーのラベルをすべて並べるメッセージや、オブジェクト型のプロパティをすべて並べるメッセージは、書き切ると長すぎるからだ。

```text
/test\.yaml:12:23: property "calling_workflow_secret" is not defined in object type {.+} \[expression\]/
```

ここの `{.+}` は、波括弧そのものを表すつもりで書かれている。Go の RE2 は、正しい繰り返しの指定で始まらない `{` を普通の文字として扱う。Rust の `regex` クレートは同じパターンを不正として拒む。そこでテストは、まず書かれたままのパターンをコンパイルし、失敗したら `{2}` や `{1,3}` のような繰り返しに当たらない波括弧をすべてエスケープしてから、もう一度コンパイルする。JavaScript にも同じずれがあり、`u` フラグを付けた `RegExp` は `{.+}` を拒み、フラグなしなら受け付ける。

`/{string => string}/` のように、ルール名で終わらない正規表現の行もある。この場合、テストはメッセージからルールを推定する。`label "` を含む行は `runner-label` のエラーとし、それ以外の行は `expression` のエラーとする。

比べるのは fu4 が移植したルールの行だけである。fu4 は Python を実行しないので、actionlint の pyflakes 連携の行は対象から外している。

## 一致しないケースは理由と一緒に記録する

actionlint のケースのうち 5 つは一致しない。どれも理由を添えて、既知の不一致のリストへ書いてある。

| ケース                                            | fu4 の結果が違う理由                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `err/expr_check_in_matrix_row_assign`             | GitHub のドキュメントの `github` コンテキストの表は `github.retention_days` を文字列としており、fu4 は型をこの表から読む。actionlint は数値として扱う                    |
| `err/invalid_permissions`、`examples/permissions` | 権限のスコープを今の SchemaStore のワークフローのスキーマから読んでおり、そこには actionlint v1.7.12 より後に追加されたスコープが載っている                              |
| `examples/webhook_checks`                         | アクティビティの種類を今の GitHub のドキュメントから読んでおり、そこには actionlint v1.7.12 より後に追加された種類が載っている                                           |
| `ok/issue-442-download-artifact-v3-workaround`    | `actions/download-artifact@v3-node20` の `action.yml` には `download-path` が無い。actionlint は手でデータを補っており、fu4 は公開されている `action.yml` をそのまま使う |

1 つ目のケースで、actionlint は `matrix.test` が数値になるので次のワークフローはエラーになると期待している。

```yaml
strategy:
  matrix:
    test:
      - ${{ github.retention_days }}
steps:
  - run: echo ${{ matrix.test.foo }}
```

fu4 は、コンテキスト、イベント、権限についての知識を、手で管理する表ではなく GitHub のドキュメントとスキーマから生成している。そのためドキュメントのとおりに文字列として扱い、このエラーを出さない。

このリストは両方向から確かめている。リストに無いケースが一致しなければテストは落ち、リストにあるケースが一致するようになってもテストは落ちる。後者の確認があるので、リストは古いまま残らない。直した変更の中で、そのケースをリストから消す必要がある。

## zizmor のオンライン監査は偽の GitHub で確かめる

zizmor の監査の一部は、参照しているアクションがアーカイブされていないか、タグが既知のコミットを指しているか、固定した SHA がそのリポジトリのものかを GitHub に問い合わせる。期待する出力は `--offline` で記録しているので、これらの監査は 278 ケースに含まれない。これらは、テストがローカルで起動する偽の GitHub に対して別に確かめている。偽の GitHub は、監査が呼ぶ API のルートにだけ応答する。

## ルールを TypeScript に移しても答えは変わらない

fu4 は今、エンジンとルールのパッケージに分けている途中である。エンジンは Rust のままで、YAML と bash の構文解析だけを受け持つ。構文木は 32 ビットのワードと文字列を並べた平らなバッファに書き出し、TypeScript 側は構文木を JavaScript のオブジェクトにコピーせず、このバッファをその場で読む。ルールは `@r_masseater/fu4-presets` に移り、TypeScript で書き直す。

移しても、ここまでのテストデータは変わらない。答え合わせのテストも TypeScript に移し、同じフィクスチャと同じ既知の不一致のリストを読む。どのルールも、本家と同じ答えを出し直せたときにだけ移行が済んだことになる。

[^actionlint-projects-readme]: [actionlint testdata/projects README](https://github.com/rhysd/actionlint/blob/main/testdata/projects/README.md)
