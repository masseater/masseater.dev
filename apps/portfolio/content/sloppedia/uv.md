---
title: "uv"
description: "Astral が Rust で作る Python のパッケージとプロジェクトの管理の道具。pip、pip-tools、pipx、poetry、pyenv などの役割を1つにまとめる。Astral は2026年に OpenAI への合流を発表した。"
tags: ["Python", "パッケージマネージャー", "Rust", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Astral"
  - label: "最初のコミット"
    value: "2023年10月5日"
  - label: "公開の発表"
    value: "2024年2月15日"
  - label: "最新のリリース"
    value: "0.13.7（2026年11月3日）"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "Apache License 2.0 または MIT License"
  - label: "URL"
    value: "docs.astral.sh/uv"
    href: "https://docs.astral.sh/uv/"
---

uv は、Astral が Rust で作る Python のパッケージとプロジェクトの管理の道具である[^docs]。文書は「とても速い Python のパッケージとプロジェクトのマネージャー」と名乗る[^docs]。pip、pip-tools、pipx、poetry、pyenv、twine、virtualenv の役割を1つで受け持つ[^docs]。

## 歴史

Astral は Charlie Marsh が作った会社で、2023年4月18日に Python のリンター Ruff の会社として名乗り出た[^blog]。uv のリポジトリの最初のコミットは2023年10月5日である[^first-commit]。2024年2月15日に、pip の代わりになる速い道具として uv を発表した[^blog]。同じ年の8月20日には、プロジェクトの管理を含む「Unified Python packaging」へと広げた[^blog]。

2026年3月19日、Astral は OpenAI の Codex のチームに加わる合意をしたと発表した[^openai]。OpenAI は、取引の後もオープンソースの道具を支え続けるとしている[^openai]。

| バージョン | 日付           | 主な変更                                                 |
| ---------- | -------------- | -------------------------------------------------------- |
| 0.13.0     | 2026年10月9日  | 既定の Python を 3.15 にした                             |
| 0.13.5     | 2026年10月21日 | 信頼を失った eMudhra の中間証明書を拒む                  |
| 0.13.7     | 2026年11月3日  | ワークスペースのメタデータの出力の形式を選べる（試験的） |

0.13.5 の変更は、[eMudhra の誤発行](/sloppedia/emudhra-incident)への対応である[^releases]。6月8日には、依存の脆弱性とマルウェアを調べる `uv audit` も出た[^blog]。

## 機能

主な命令は次のとおりである[^docs]。

| 命令                           | 役割                                              |
| ------------------------------ | ------------------------------------------------- |
| `uv init`、`uv add`、`uv lock` | プロジェクトの依存を1つのロックファイルで管理する |
| `uv sync`、`uv run`            | ロックファイルどおりに環境をそろえ、命令を動かす  |
| `uv python install`            | Python そのもののバージョンを入れる               |
| `uvx`、`uv tool install`       | Python の道具を入れて動かす                       |
| `uv pip`                       | pip と同じ形の命令を速く動かす                    |

## ワークスペース

uv は、Cargo のワークスペースに倣ったワークスペースを持つ[^docs]。ルートの `pyproject.toml` の `[tool.uv.workspace]` に members を並べると、1つのロックファイルを共有する。[mise](/sloppedia/mise) のワークスペースのグラフと、[Turborepo](/sloppedia/turborepo) 2.11 の試験的な機能は、このワークスペースを読む。

## 関連項目

- [Cargo](/sloppedia/cargo)
- [pnpm](/sloppedia/pnpm)
- [mise](/sloppedia/mise)

[^docs]: Astral「[uv](https://docs.astral.sh/uv/)」。2026年11月9日に閲覧。

[^blog]: Astral「[Blog](https://astral.sh/blog)」。2026年11月9日に閲覧。

[^openai]: Charlie Marsh「[Astral to join OpenAI](https://astral.sh/blog/openai)」Astral Blog、2026年3月19日。

[^releases]: 「[Releases · astral-sh/uv](https://github.com/astral-sh/uv/releases)」GitHub。2026年11月9日に閲覧。

[^first-commit]: 「[astral-sh/uv の最初のコミット](https://github.com/astral-sh/uv/commit/d226e0a2)」astral-sh/uv、2023年10月5日。
