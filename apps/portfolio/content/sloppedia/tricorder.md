---
title: "Tricorder"
description: "Google の社内の静的解析の基盤。100を超える解析器の結果をコードレビューの画面に出し、誤検知の少なさと修正のしやすさを解析器に求める。"
tags: ["Google", "静的解析", "コードレビュー"]
published: true
infobox:
  - label: "開発"
    value: "Google（社内専用）"
  - label: "解析器"
    value: "100超、30を超える言語"
  - label: "見る変更"
    value: "1日に5万件超"
  - label: "効いていない警告の割合"
    value: "5%弱"
  - label: "論文"
    value: "ICSE 2015"
---

Tricorder は、Google の社内の静的解析の基盤である。30を超える言語に対応した100を超える解析器を束ね、その結果を [Critique](/sloppedia/critique) のコードレビューの画面に出す。1日に5万を超える変更を見ている[^swe-ch20]。Caitlin Sadowski らが2015年の ICSE の論文で発表した[^tricorder]。

## 考え方

開発者は、誤検知の多い警告をすぐに無視するようになる。Tricorder は、解析器が開発者に信頼されることを最も重んじる。解析器を載せるには、次の条件を満たさなければならない[^swe-ch20]。

| 条件           | 内容                                 |
| -------------- | ------------------------------------ |
| 分かりやすい   | どのエンジニアにも意味が分かる       |
| 直せる         | 直し方が示され、できれば自動で直せる |
| 誤検知が少ない | 効いていない警告の割合が10%未満      |
| 効果がある     | コードの質に大きく効く               |

ここでいう「効いていない警告」は、開発者が直さなかった警告を指す。技術的には正しくても、開発者が直す価値を感じない警告は誤検知と同じに扱う。全体の割合は5%をわずかに下回る[^swe-ch20]。

## 開発者の反応

画面の警告には「役に立たない（Not useful）」のボタンが付いている。1日に約250回押され、その数が解析器の質の目安になる[^swe-ch20]。レビュアーが作者に直すよう求める「Please Fix」のボタンもある[^swe-ch20]。自動で直す修正案は、1日に約3,000件適用されている[^swe-ch20]。

## コンパイラとの関係

Java では、[Error Prone](/sloppedia/error-prone) の検査のうち ERROR に分類したものをコンパイラに組み込み、違反するとビルドが通らない[^swe-ch20]。コンパイラの警告は、方針として使わない。警告は無視されて溜まっていくだけだからである[^swe-ch20]。

## 位置づけ

Tricorder は、問題を開発の流れのより早い段階で見つける「シフトレフト」の考え方の一例である[^swe-ch1]。コードレビューの時点で見つけた問題は、本番で見つけるよりずっと安く直せる。[Google のソフトウェア開発](/sloppedia/google-software-engineering)の中では、人のレビューと機械の検査が同じ画面で並ぶ。

[^swe-ch1]: 『Software Engineering at Google』「[What Is Software Engineering?](https://abseil.io/resources/swe-book/html/ch01.html)」第1章、2020年。

[^swe-ch20]: 『Software Engineering at Google』「[Static Analysis](https://abseil.io/resources/swe-book/html/ch20.html)」第20章、2020年。

[^tricorder]: Caitlin Sadowski ほか「[Tricorder: Building a Program Analysis Ecosystem](https://research.google/pubs/tricorder-building-a-program-analysis-ecosystem/)」ICSE、2015年。
