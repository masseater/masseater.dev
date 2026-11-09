---
title: "fallow"
description: "TypeScript と JavaScript のコードベースを丸ごと調べる Rust 製の解析の道具。使われていないコード、重複、複雑さ、アーキテクチャの境界を検出し、AI のエージェント向けの MCP も持つ。"
tags: ["静的解析", "TypeScript", "Rust", "2026年のソフトウェア"]
published: true
infobox:
  - label: "作者"
    value: "Bart Waardenburg"
  - label: "開発"
    value: "Fallow B.V.（オランダ）"
  - label: "最初のコミット"
    value: "2026年3月17日"
  - label: "最新のリリース"
    value: "3.41.0（2026年11月7日）"
  - label: "実装の言語"
    value: "Rust"
  - label: "ライセンス"
    value: "MIT License"
  - label: "URL"
    value: "fallow.tools"
    href: "https://fallow.tools/"
---

fallow は、TypeScript と JavaScript のコードベースを丸ごと調べる解析の道具である[^docs]。使われていないファイルや export や依存、重複したコード、複雑さ、アーキテクチャの境界の違反を見つける[^docs]。名前は英語で「休耕地」を意味する。

## 歴史

作者は Bart Waardenburg で、オランダの小さな会社 Fallow B.V. が開発している[^about]。会社は2026年に作られ、出資を受けずに自己資金で運営している[^about]。最初のコミットと npm への初めての公開は、どちらも2026年3月17日である[^first-commit]。

About のページは、作った理由をこう説明する[^about]。リンターは1つのファイルを、TypeScript は型を、テストは誰かが書いた振る舞いを確かめる。しかし、コードベースを全体として確かめるものが無い。コーディングエージェントは、リポジトリを鍵穴から覗くようにしか見られない[^about]。

| バージョン | 日付           | 主な変更                                |
| ---------- | -------------- | --------------------------------------- |
| 3.0.0      | 2026年7月4日   | 名前とデザインの刷新、スタイルの監査    |
| 3.8.0      | 2026年7月22日  | 対話的なコードベースの地図 `fallow viz` |
| 3.10.0     | 2026年7月27日  | 型を使う解析が安定した                  |
| 3.19.0     | 2026年8月27日  | `fallow agent install`、MCP のリソース  |
| 3.34.0     | 2026年10月17日 | ミューテーションテスト                  |
| 3.38.0     | 2026年10月30日 | Fallow Cloud への登録                   |
| 3.41.0     | 2026年11月7日  | 入れ子の pnpm のワークスペース          |

## 機能

主な命令は次のとおりである[^docs][^viz]。

| 命令                  | 役割                                           |
| --------------------- | ---------------------------------------------- |
| `fallow dead-code`    | 使われていないファイル、export、依存を見つける |
| `fallow dupes`        | 重複したコードを見つける                       |
| `fallow health`       | 複雑さと健全さの点数を出す                     |
| `fallow architecture` | 層の境界と循環を確かめる                       |
| `fallow audit`        | PR の差分を対象に検査をまとめて流す            |
| `fallow viz`          | コードベースの地図を対話的な画面で見せる       |

[knip](/sloppedia/knip) や jscpd、stylelint の設定を移す `fallow migrate` も持つ[^docs]。

## AI との連携

`fallow-mcp` は、標準入出力で動く MCP のサーバーである[^mcp]。ただし文書は、エージェントにとっての主な入口は CLI で、MCP は任意だと書いている[^mcp]。`fallow agent install` は、Claude Code、Codex、Cursor にスキルやフックをまとめて入れる[^docs]。

## 評価

Sloppedia の持ち主の masseater は、自分のリポジトリの検査に fallow を入れている。すべての規則を error で運用し、指摘は規則を緩めずにコードを直して消す。

## 関連項目

- [モノレポの構造の可視化](/sloppedia/monorepo-structure-visualization)
- [Oxlint](/sloppedia/oxlint)

[^docs]: Fallow「[Fallow: codebase analysis for TypeScript and JavaScript](https://fallow.tools/docs/)」。2026年11月9日に閲覧。

[^about]: Fallow「[About Fallow](https://fallow.tools/about)」。2026年11月9日に閲覧。

[^first-commit]: Bart Waardenburg「[fallow の最初のコミット](https://github.com/fallow-rs/fallow/commit/9ee4156)」fallow-rs/fallow、2026年3月17日。

[^viz]: Fallow「[viz](https://fallow.tools/docs/cli/viz)」。2026年11月9日に閲覧。

[^mcp]: Fallow「[MCP server for Claude Code, Cursor, and Windsurf](https://fallow.tools/docs/integrations/mcp/)」。2026年11月9日に閲覧。
