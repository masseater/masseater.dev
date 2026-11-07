---
title: "Critique"
description: "Google の社内のコードレビューの道具。差分の表示、コメント、承認、静的解析の結果の表示を1つの画面にまとめる。"
tags: ["Google", "コードレビュー"]
published: true
infobox:
  - label: "開発"
    value: "Google（社内専用）"
  - label: "対象"
    value: "Piper への変更"
  - label: "満足度"
    value: "97%（2018年の調査）"
  - label: "公開の類似品"
    value: "Gerrit"
---

Critique は、Google の社内のコードレビューの道具である。[Piper](/sloppedia/piper) への変更はすべて、Critique でのレビューを経てからでなければコミットできない[^wikipedia]。2018年の調査では、開発者の97%が Critique に満足していた[^mcr]。

## 設計の原則

『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、Critique の原則として単純さ、信頼、汎用の対話、開発の流れとの統合の4つを挙げている[^swe-ch19]。

## レビューの流れ

Critique でのレビューは6つの段階を踏む[^swe-ch19]。

1. 作者が変更を作る。この時点で解析器が走る。
2. 作者がレビュアーにレビューを頼む。
3. レビュアーがコメントを書く。下書きのコメントは、まとめて一度に公開される。
4. 作者が直して返信する。
5. レビュアーが承認する。
6. 作者がコミットする。

## 承認の表示

変更の状態は、LGTM、承認、未解決のコメントの3つで表す。どの変更にも LGTM が要る[^swe-ch19]。未解決のコメントは、強制ではないが解決すべきものとして扱う[^swe-ch19]。

「attention set」は、いま誰の対応待ちで変更が止まっているかを示す人の集合である[^swe-ch19]。作者とレビュアーのどちらがボールを持っているかが一目で分かる。

## 差分の表示

差分の画面は、行の中の違い、構文の色付け、空白の扱いの切り替え、コードの移動の検出に対応している[^swe-ch19]。[Code Search](/sloppedia/google-code-search) も使う Kythe により、差分の中から定義へ飛べる[^swe-ch19]。

[Tricorder](/sloppedia/tricorder) などの解析器の結果は、人のコメントと色を変えて同じ画面に出る[^mcr]。

## レビュアーの推薦

Critique は、変更に必要な承認をすべて満たす最小のレビュアーの組を推薦する。最近そのファイルを編集したりレビューしたりした人を優先する[^mcr]。チームの宛先に送られたレビューを、負荷と休暇を見て順番に割り当てる仕組みも使われている[^mcr]。

## 社外の類似品

書籍は、Google の外のプロジェクトのための公開の代替として Gerrit を挙げている[^swe-ch19]。Critique の上で行われるレビューの作法は、[Google のコードレビュー](/sloppedia/google-code-review)の記事にある。

[^wikipedia]: 「[Piper (source control system)](<https://en.wikipedia.org/wiki/Piper_(source_control_system)>)」Wikipedia。2026年11月7日に閲覧。

[^mcr]: Caitlin Sadowski ほか「[Modern Code Review: A Case Study at Google](https://research.google/pubs/modern-code-review-a-case-study-at-google/)」ICSE SEIP、2018年。

[^swe-ch19]: 『Software Engineering at Google』「[Critique: Google's Code Review Tool](https://abseil.io/resources/swe-book/html/ch19.html)」第19章、2020年。
