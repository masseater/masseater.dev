---
title: "mise"
description: "開発の道具のバージョン、環境変数、タスクを1つの CLI で扱う道具。Rust で書かれ、モノレポのタスクと多言語のワークスペースのグラフも持つ。"
tags: ["開発の道具", "タスクランナー", "モノレポ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Jeff Dickey（jdx）"
  - label: "最初のコミット"
    value: "2023年1月27日"
  - label: "最新のリリース"
    value: "2026.11.5（2026年11月8日）"
  - label: "バージョンの付け方"
    value: "年.月.番号"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "mise.jdx.dev"
    href: "https://mise.jdx.dev/"
---

mise は、開発の道具のバージョン、環境変数、タスクを1つの CLI で扱う道具である[^repo]。README は「Dev tools, env vars, and tasks in one CLI」と書く[^repo]。名前はフランス語の料理の言葉「mise-en-place」（下ごしらえ）から取っている[^repo]。

## 歴史

リポジトリは GitHub の jdx/mise にあり、最初のコミットは2023年1月27日である[^first-commit]。作者は Jeff Dickey である。バージョンは「年.月.番号」の形で付ける[^releases]。リリースはとても多く、2026年10月だけで26回あった[^releases]。

## 機能

mise は、1,000を超える道具を、プロジェクトごとのバージョンで入れる[^repo]。GitHub のリリース、Aqua、Cargo、npm、PyPI などからも直接入れられる。`.nvmrc` や `.python-version` のような、各言語の慣習のファイルも読める。`mise lock` は、入れる道具をロックファイルに固定する[^repo]。

ディレクトリに入ると、mise は環境変数や `.env`、PATH、仮想環境を読み込む[^repo]。`mise.toml` や `mise-tasks/` に書いたタスクは、依存の順に並列で動く[^repo]。

## モノレポ

ルートの `mise.toml` に `monorepo_root = true` を書き、`[monorepo]` の `config_roots` にプロジェクトの場所を並べると、モノレポのタスクが使える[^monorepo]。タスクは `//projects/frontend:build` のような道の名前で呼ぶ。`//...:test` のようなワイルドカードも使える[^monorepo]。

ワークスペースのグラフは、Cargo、uv、Go、Gradle、Node.js のマニフェストから、プロジェクトとその依存を読む[^graph]。`mise tasks graph --json` はこのグラフを JSON で出し、`--explain` を付けると各辺の出どころを示す[^graph]。`mise run --affected` は、変更の影響を受けるプロジェクトのタスクだけを動かす[^graph]。

## 評価

Sloppedia の持ち主の masseater は、自分のリポジトリの道具のバージョンを `mise.toml` に書いている。クラウドのセッションと CI は `mise install` を呼ぶだけで、同じ道具がそろう。モノレポの構造の可視化を調べたとき、Cargo の辺と一段深い Tauri のクレートを両方拾えたのは mise だけだった。詳しくは「[モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)」を参照。

## 関連項目

- [moon](/sloppedia/moon)
- [uv](/sloppedia/uv)
- [Cargo](/sloppedia/cargo)

[^repo]: 「[jdx/mise](https://github.com/jdx/mise)」GitHub。2026年11月9日に閲覧。

[^first-commit]: jdx「[mise の最初のコミット](https://github.com/jdx/mise/commit/2d77111)」jdx/mise、2023年1月27日。

[^releases]: mise「[Releases](https://mise.jdx.dev/releases.html)」。2026年11月9日に閲覧。

[^monorepo]: mise「[Monorepo tasks](https://mise.jdx.dev/tasks/monorepo.html)」。2026年11月9日に閲覧。

[^graph]: mise「[Workspace graph](https://mise.jdx.dev/tasks/workspace-graph.html)」。2026年11月9日に閲覧。
