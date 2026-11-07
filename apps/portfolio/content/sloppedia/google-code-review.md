---
title: "Google のコードレビュー"
description: "Google で、ほぼすべての変更をコミット前に別の人が読む作法。LGTM・持ち主の承認・Readability の3つの承認と、小さな変更と速い返答を重んじる文化からなる。"
tags: ["Google", "コードレビュー", "ソフトウェア開発"]
published: true
infobox:
  - label: "道具"
    value: "Critique"
  - label: "必要な承認"
    value: "LGTM、持ち主の承認、Readability"
  - label: "レビュアーの数の中央値"
    value: "1人（2018年）"
  - label: "変更した行数の中央値"
    value: "24行（2018年）"
  - label: "全体の時間の中央値"
    value: "4時間未満（2018年）"
  - label: "公開の指針"
    value: "eng-practices"
---

Google のコードレビューは、Google で変更をトランクへ入れる前に、作者以外の人がそのコードを読む作法である。ほぼすべての変更がレビューを経る[^swe-ch9]。道具には [Critique](/sloppedia/critique) を使う。

## 3つの承認

変更をコミットするには、次の3つの承認がそろわなければならない[^swe-ch9]。

| 承認                                         | 確かめること                   | 与える人                  |
| -------------------------------------------- | ------------------------------ | ------------------------- |
| LGTM（Looks Good To Me）                     | 変更が正しく、読んで分かるか   | レビュアー                |
| 持ち主の承認                                 | その場所に入れてよい変更か     | OWNERS ファイルに載った人 |
| [Readability](/sloppedia/google-readability) | その言語の書き方に沿っているか | その言語の認定を持つ人    |

作者がその場所の持ち主か、その言語の Readability を持っていれば、その分は作者が満たせる。そのため、多くの変更はレビュアー1人で済む[^mcr]。持ち主も自分の変更をレビューしてもらう決まりである[^mcr]。

## 数字

Caitlin Sadowski らは2018年に、900万件のレビュー済みの変更の記録を分析した[^mcr]。

| 項目                         | 値                                         |
| ---------------------------- | ------------------------------------------ |
| 1人が1週間に出す変更の中央値 | 約3件                                      |
| 最初の反応までの時間の中央値 | 小さな変更で1時間未満、大きな変更で約5時間 |
| レビュー全体の時間の中央値   | 4時間未満                                  |
| 変更した行数の中央値         | 24行                                       |
| 1ファイルだけを変える変更    | 35%超                                      |
| レビュアーが2人以上の変更    | 25%未満                                    |

論文は、AMD や Microsoft で報告された承認までの時間の中央値（14.7〜24時間）と比べ、Google のレビューがかなり速いと述べている[^mcr]。

## 目的

Google がコードレビューを始めた理由は、コードを読みやすく保守しやすくすることだった[^mcr]。調査に答えた開発者は、レビューの目的として教育、規範の維持、境界の管理、事故の防止を挙げた。欠陥を見つけることも歓迎されるが、それだけが目的ではない[^mcr]。

## 指針

Google はレビューの指針を eng-practices として公開している[^eng-practices]。最も上位の原則は、変更に欠点が残っていても、システムのコードの健全さを確実に良くするなら承認すべきだというものである[^standard]。指針は「非の打ちどころのないコードは無い。あるのはより良いコードだけだ」とも書いている[^standard]。

速さも重んじる。レビューの依頼に返答するまでの時間は、最大でも1営業日である[^speed]。変更の大きさは100行ほどが妥当で、1,000行はふつう大きすぎるとしている[^small-cls]。大きすぎることだけを理由に、レビュアーは変更を突き返してよい[^small-cls]。

## 課題

2018年の調査は、レビューでのつまずきとして、地理や組織の上での距離と、言葉の調子や力関係を挙げた[^mcr]。レビューを引き延ばしたり承認を渋ったりして、相手の振る舞いを変えさせようとする使い方が問題になる[^mcr]。

## AI との関係

Google は2023年に、レビューのコメントに合わせてコードの修正案を機械学習で作る仕組みを社内に出した。作者は、示された修正案の40〜50%を採用した[^ml-review]。2024年には、レビューのコメントの8%を超える分が AI の手助けで解決されていた[^ai-se-2024]。

[^swe-ch9]: 『Software Engineering at Google』「[Code Review](https://abseil.io/resources/swe-book/html/ch09.html)」第9章、2020年。

[^mcr]: Caitlin Sadowski ほか「[Modern Code Review: A Case Study at Google](https://research.google/pubs/modern-code-review-a-case-study-at-google/)」ICSE SEIP、2018年。

[^eng-practices]: Google「[Google Engineering Practices Documentation](https://google.github.io/eng-practices/)」。2026年11月7日に閲覧。

[^standard]: Google「[The Standard of Code Review](https://google.github.io/eng-practices/review/reviewer/standard.html)」eng-practices。

[^speed]: Google「[Speed of Code Reviews](https://google.github.io/eng-practices/review/reviewer/speed.html)」eng-practices。

[^small-cls]: Google「[Small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)」eng-practices。

[^ml-review]: Alexander Frömmgen、Lera Kharatyan「[Resolving code review comments with ML](https://research.google/blog/resolving-code-review-comments-with-ml/)」2023年5月23日。

[^ai-se-2024]: Satish Chandra、Maxim Tabachnyk「[AI in software engineering at Google](https://research.google/blog/ai-in-software-engineering-at-google-progress-and-the-path-ahead/)」2024年6月6日。
