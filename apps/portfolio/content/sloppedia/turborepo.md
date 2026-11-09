---
title: "Turborepo"
description: "Vercel が開発する JavaScript と TypeScript のモノレポのビルドシステム。タスクの結果をキャッシュし、依存の順に並列で動かす。2026年の 2.11 から Rust、Python、Go のワークスペースも試験的に読む。"
tags: ["ビルドシステム", "モノレポ", "Vercel", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Jared Palmer"
  - label: "開発"
    value: "Vercel"
  - label: "Vercel への合流"
    value: "2021年12月"
  - label: "最新のリリース"
    value: "2.11.10（2026年10月20日）"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "turborepo.dev"
    href: "https://turborepo.dev/"
---

Turborepo は、JavaScript と TypeScript のモノレポのためのビルドシステムである[^home]。`turbo.json` に書いたタスクを、パッケージの依存の順に並列で動かす。一度動かしたタスクの結果をキャッシュし、入力が同じなら動かさずに結果を返す。2026年のサイトは、自身を「コーディングエージェントのためのビルドシステム」と呼んでいる[^home]。

## 歴史

Turborepo は Jared Palmer が作った。2021年12月に Vercel が買い取り、同時に CLI をオープンソースにした[^joining-vercel]。今は Vercel が開発している。ライセンスの著作権の行は「Copyright (c) 2026 Vercel, Inc」である[^license]。

| バージョン | 日付           | 主な変更                                        |
| ---------- | -------------- | ----------------------------------------------- |
| 2.8        | 2026年1月26日  | エージェント用のスキル、`turbo docs`            |
| 2.9        | 2026年3月25日  | `turbo query` が安定した                        |
| 2.11       | 2026年9月18日  | Rust、Python、Go のワークスペースを試験的に読む |
| 2.11.10    | 2026年10月20日 | 文書のサイトで WebMCP を有効にした              |

## 仕組み

`turbo.json` の `tasks` に、各タスクが何に依存し何を出力するかを書く。`dependsOn` に `^build` と書けば、依存先のパッケージの `build` を先に動かす。タスクの入力のハッシュが同じなら、ローカルかリモートのキャッシュから結果を戻す[^home]。

## 2.11 の多言語の対応

2.11 は「Rust、Python、Go のネイティブな対応」を試験的な機能として入れた[^2-11]。Cargo、uv、`go.work` のワークスペースからパッケージと依存の関係を見つけ、同じタスクのグラフに並べる。Rust と Python は、`turbo.json` の `futureFlags` で次の旗を立てて使う[^2-11]。

```json
{
  "futureFlags": {
    "experimentalCargoWorkspaces": true,
    "experimentalPythonWorkspaces": true
  }
}
```

`build` は `cargo build` や `uv build`、`go build ./...` に対応づけられる[^2-11]。発表の記事は、Cargo の path 依存から crate どうしの辺を読むかどうかを書いていない[^2-11]。言語をまたぐ辺は、`turbo.json` の `dependsOn` に書き足せる。

## 可視化

`turbo run build --graph` は、タスクのグラフを SVG、HTML、Mermaid、DOT で出す[^graph]。JSON と PNG の出力は 3.0 で外す予定である[^graph]。`turbo query` は、パッケージとタスクを GraphQL で引ける。

## 評価

Sloppedia の持ち主の masseater は、モノレポの構造の可視化を調べたときに Turborepo の既定の設定を試した。その時点では Cargo の依存が見えなかった。2.11 の旗を立てた場合は試していない。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 関連項目

- [Nx](/sloppedia/nx)
- [Vite Task](/sloppedia/vite-task)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^home]: Vercel「[Turborepo](https://turborepo.dev/)」。2026年11月9日に閲覧。

[^joining-vercel]: Jared Palmer「[Turborepo is joining Vercel](https://turborepo.dev/blog/joining-vercel)」Turborepo Blog、2021年12月9日。

[^license]: 「[LICENSE](https://github.com/vercel/turborepo/blob/main/LICENSE)」vercel/turborepo。2026年11月9日に閲覧。

[^2-11]: Anthony Shew「[Turborepo 2.11](https://turborepo.dev/blog/2-11)」Turborepo Blog、2026年9月18日。

[^graph]: Vercel「[run](https://turborepo.dev/docs/reference/run)」Turborepo。2026年11月9日に閲覧。
