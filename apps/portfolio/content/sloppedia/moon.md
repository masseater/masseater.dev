---
title: "moon"
description: "moonrepo が Rust で作るモノレポのビルドシステム兼タスクランナー。道具のバージョンの固定、プロジェクトのグラフ、キャッシュを持ち、2026年の v2 でツールチェーンを WASM のプラグインにした。"
tags: ["ビルドシステム", "モノレポ", "Rust", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Miles Johnson"
  - label: "開発"
    value: "moonrepo, Inc."
  - label: "最初のコミット"
    value: "2021年10月23日"
  - label: "最新のリリース"
    value: "2.6.5（2026年10月29日）"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "moonrepo.dev"
    href: "https://moonrepo.dev/moon"
---

moon は、moonrepo が Rust で作るモノレポのビルドシステム兼タスクランナーである[^home]。サイトは「Web のエコシステムのためのタスクランナーとモノレポの管理の道具」と名乗る[^home]。JavaScript と TypeScript のほか、Rust、Go、Ruby などのプロジェクトも扱う。

## 歴史

最初のコミットは2021年10月23日である[^first-commit]。作者は moonrepo の創業者の Miles Johnson である[^v2]。README は、[Bazel](/sloppedia/bazel) などのビルドシステムから強く影響を受けたと書いている[^repo]。同じ会社は、多言語のバージョンの管理の道具 proto も作っている[^home]。

2026年2月18日の v2.0「Phobos」は、互換を崩す大きな改修だった[^v2]。

| バージョン | 日付          | 主な変更                                          |
| ---------- | ------------- | ------------------------------------------------- |
| 2.0        | 2026年2月18日 | ツールチェーンを WASM のプラグインに、`moon exec` |
| 2.2        | 2026年4月13日 | デーモン、AI のスキル                             |
| 2.3        | 2026年6月1日  | タスクのタグ、MCP にテンプレートのツール          |
| 2.5        | 2026年8月14日 | OpenTelemetry への書き出し                        |
| 2.6        | 2026年10月5日 | 状態を持たない MCP、OpenTelemetry のメトリクス    |

## 仕組み

プロジェクトは `moon.yml` を置いたディレクトリである。ルートの `.moon/` に置いた設定で、ワークスペースのどこにプロジェクトがあるかを並べる。タスクはプロジェクトごとに書くほか、共通の設定から継承させられる[^home]。

moon は、各プロジェクトが使う Node.js や Rust などのバージョンを固定し、必要なら自分で入れる[^home]。v2 からは、この言語ごとの対応が WASM のプラグインになった[^v2]。どこまで深く対応するかは言語ごとに段階で示されており、C# は最も浅い段階にある[^languages]。

## 可視化

`moon project-graph` はプロジェクトのグラフを、`moon task-graph` はタスクのグラフを、ブラウザーの対話的な画面で見せる[^project-graph]。`--json` を付けると JSON で出す。

## AI との連携

`moon mcp` は MCP のサーバーである。v2.6 で、2026年7月28日の改訂の状態を持たない MCP に移った[^releases]。

## 評価

Sloppedia の持ち主の masseater がモノレポの構造の可視化を調べたとき、moon は `.moon/` に2つのファイルを置くだけで多言語のグラフを出した。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 関連項目

- [mise](/sloppedia/mise)
- [Nx](/sloppedia/nx)
- [Bazel](/sloppedia/bazel)
- [monorepo.tools](/sloppedia/monorepo-tools)

[^home]: moonrepo「[moon](https://moonrepo.dev/moon)」。2026年11月9日に閲覧。

[^repo]: 「[moonrepo/moon](https://github.com/moonrepo/moon)」GitHub。2026年11月9日に閲覧。

[^first-commit]: 「[moonrepo/moon の最初のコミット](https://github.com/moonrepo/moon/commit/62267e3)」moonrepo/moon、2021年10月23日。

[^v2]: Miles Johnson「[moon v2.0 - Official "Phobos" release!](https://moonrepo.dev/blog/moon-v2.0)」moonrepo Blog、2026年2月18日。

[^languages]: moonrepo「[Languages](https://moonrepo.dev/docs/how-it-works/languages)」。2026年11月9日に閲覧。

[^project-graph]: moonrepo「[Project graph](https://moonrepo.dev/docs/how-it-works/project-graph)」。2026年11月9日に閲覧。

[^releases]: 「[Releases · moonrepo/moon](https://github.com/moonrepo/moon/releases)」GitHub。2026年11月9日に閲覧。
