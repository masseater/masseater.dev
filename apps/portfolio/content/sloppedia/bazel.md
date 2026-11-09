---
title: "Blaze と Bazel"
description: "Google の社内のビルドシステム Blaze と、その公開版の Bazel。何を作るかを宣言で書かせ、結果の使い回しと並列の実行で大きなリポジトリを速くビルドする。"
tags: ["Google", "ビルドシステム", "モノレポ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Google"
  - label: "Blaze の開発開始"
    value: "2006年"
  - label: "Bazel の公開"
    value: "2015年3月"
  - label: "Bazel 1.0"
    value: "2019年10月"
  - label: "最新版"
    value: "9.3.2（2026年11月5日）"
  - label: "設定の言語"
    value: "Starlark"
  - label: "ライセンス"
    value: "Apache License 2.0"
  - label: "URL"
    value: "bazel.build"
    href: "https://bazel.build/"
---

Blaze は Google の社内のビルドシステムで、Bazel はその公開版である。Google は2006年に Blaze を作り始め、2015年3月にその一部を Bazel として公開した[^wikipedia]。Bazel という名前は Blaze の文字を並べ替えたものである[^wikipedia]。Bazel の FAQ は、Bazel が社内の道具とほとんどのコードを共有していると説明している[^faq]。

## 考え方

『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、ビルドシステムを2つに分けている[^swe-ch18]。

| 種類     | 例                                            | 書くもの                   |
| -------- | --------------------------------------------- | -------------------------- |
| タスク型 | Ant、Maven、[Gradle](/sloppedia/gradle)       | 何をどの順で実行するか     |
| 成果物型 | Blaze、Bazel、[Pants](/sloppedia/pants)、Buck | 何を作るか、何に依存するか |

タスク型は、手順を自由に書けるぶん、並列の実行や差分のビルドが難しくなる。成果物型では、開発者は BUILD ファイルに作りたいものと依存を宣言で書き、どう作るかはシステムが決める[^swe-ch18]。BUILD ファイルは、Python の方言の [Starlark](/sloppedia/starlark) で書く[^wikipedia]。

## 再現性

Blaze と Bazel は、入力が同じなら同じ結果になるように作られている。コンパイラのような道具もビルドの依存として扱い、手順はサンドボックスの中で動かす[^swe-ch18]。外部の依存は、リポジトリ全体で暗号学的なハッシュを並べた一覧で固定する[^swe-ch18]。

結果が入力だけで決まるので、一度作ったものをキャッシュから使い回せる。社内では、キャッシュと実行を遠隔の機械に任せる仕組みが動いている[^swe-ch18]。

## Bazel の歴史

Bazel は2015年3月に公開され、同年9月からベータになった。2019年10月に 1.0 が出た[^wikipedia]。2026年1月20日には 9.0.0 が出ている[^changelog]。2026年11月7日の時点の最新の安定版は、11月5日に出た長期サポート版の 9.3.2 である。次の大きな版の 10.0.0 は、10月22日にリリース候補の2つ目が出た[^releases]。

Wikipedia は、BMW、SpaceX、Stripe、Spotify、Uber などを利用者として挙げている[^wikipedia]。

## AI との関係

2026年1月の Bazel の開発版の変更履歴には、貢献者として Google の AI のコーディングエージェント Jules のアカウントが載っている[^changelog]。[Google の AI によるコーディング](/sloppedia/google-ai-assisted-coding)が、公開のリポジトリにも及んでいる例である。

[^wikipedia]: 「[Bazel (software)](<https://en.wikipedia.org/wiki/Bazel_(software)>)」Wikipedia。2026年11月7日に閲覧。

[^faq]: Bazel「[FAQ](https://bazel.build/about/faq)」。2026年11月7日に閲覧。

[^swe-ch18]: 『Software Engineering at Google』「[Build Systems and Build Philosophy](https://abseil.io/resources/swe-book/html/ch18.html)」第18章、2020年。

[^changelog]: Bazel「[Release 9.0.0 (2026-01-20)](https://bazel.googlesource.com/bazel/+/refs/tags/9.0.0%5E%21/)」CHANGELOG.md。

[^releases]: Bazel「[Releases](https://github.com/bazelbuild/bazel/releases)」GitHub。2026年11月7日に閲覧。
