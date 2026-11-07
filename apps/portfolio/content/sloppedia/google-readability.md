---
title: "Readability（Google）"
description: "Google で、ある言語の書き方を身に付けたと認められた開発者に与える認定。コードレビューの承認の1つで、言語ごとの書き方を全社でそろえる。"
tags: ["Google", "コードレビュー", "コーディング規約"]
published: true
infobox:
  - label: "種類"
    value: "言語ごとの認定"
  - label: "始まり"
    value: "Google の初期"
  - label: "役割"
    value: "コードレビューの3つの承認の1つ"
  - label: "審査をする人"
    value: "エンジニアの約1〜2%"
  - label: "参加している人"
    value: "エンジニアの約20%"
---

Readability は、Google で、ある言語の書き方を身に付けたと認められた開発者に与える認定である。[Google のコードレビュー](/sloppedia/google-code-review)で必要な3つの承認の1つにあたり、その言語の Readability を持つ人の承認が無いと変更をコミットできない[^swe-ch9]。

## 目的

Readability は、コードの書き方と規範をそろえるために、Google の初期に作られた[^mcr]。『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、知識の共有の章でこの仕組みを取り上げている。コードレビューを通した指導を、決まった形にしたものと位置づけている[^swe-ch3]。

## 認定の取り方

認定を受けたい開発者は、その言語で書いた変更を Readability の審査員に送る。十分な変更を書けたと審査員が判断すると、その言語の Readability が与えられる[^mcr]。審査では、言語の慣用、コードの構成、API の設計、テストなどを見る[^swe-ch3]。

認定を持つ人は、自分の変更の Readability の承認を自分で満たせる[^swe-ch9]。持っていない人は、持っている人にレビューしてもらう。

## 規模と評価

書籍によれば、Google のエンジニアの約1〜2%が Readability の審査員で、審査員か受ける側として参加しているのは約20%である[^swe-ch3]。

仕組みには代償もある。認定を持つ人がいないチームは外の人にレビューを頼む必要があり、やり取りの回数も増える[^swe-ch3]。書籍は、社内の研究がこの仕組みの効果を純粋にプラスと評価したと述べている[^swe-ch3]。目先の待ち時間と引き換えに、長い目で見たコードの質を取るという考え方である。

## スタイルガイド

審査の基準になる書き方は、言語ごとのスタイルガイドにまとめられている。Google は C++、Java、Python、Go、TypeScript、Shell などのスタイルガイドを公開している。公開版は社内のものの写しで、外からの変更は受け付けていない[^styleguide]。

[^swe-ch3]: 『Software Engineering at Google』「[Knowledge Sharing](https://abseil.io/resources/swe-book/html/ch03.html)」第3章、2020年。

[^swe-ch9]: 『Software Engineering at Google』「[Code Review](https://abseil.io/resources/swe-book/html/ch09.html)」第9章、2020年。

[^mcr]: Caitlin Sadowski ほか「[Modern Code Review: A Case Study at Google](https://research.google/pubs/modern-code-review-a-case-study-at-google/)」ICSE SEIP、2018年。

[^styleguide]: Google「[Google Style Guides](https://google.github.io/styleguide/)」。2026年11月7日に閲覧。
