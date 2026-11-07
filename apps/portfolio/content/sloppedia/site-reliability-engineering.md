---
title: "サイト信頼性エンジニアリング"
description: "Google が2003年に始めた、ソフトウェアエンジニアリングの手法で本番の運用を担う職種と考え方。SLO、エラーバジェット、トイルの削減を柱にする。"
tags: ["Google", "運用", "信頼性"]
published: true
infobox:
  - label: "略称"
    value: "SRE"
  - label: "始まり"
    value: "2003年、Google"
  - label: "提唱者"
    value: "Benjamin Treynor Sloss"
  - label: "運用の仕事の上限"
    value: "50%"
  - label: "主な概念"
    value: "SLO、エラーバジェット、トイル"
  - label: "URL"
    value: "sre.google"
    href: "https://sre.google/"
---

サイト信頼性エンジニアリング（SRE）は、ソフトウェアエンジニアリングの手法で本番のシステムの運用を担う職種と、その考え方である。Google の Benjamin Treynor Sloss が始めた。彼はこれを「ソフトウェアエンジニアに運用チームを設計させると起きること」と定義している[^intro]。

## 始まり

Treynor Sloss は2003年、Google に入社して7人のエンジニアからなる本番環境のチームを任された[^intro]。それまでの運用は、システム管理者が手作業で回すのが一般的だった。Treynor Sloss は、運用の仕事をソフトウェアで自動化することを前提にチームを組んだ[^intro]。

## 50%の上限

Google は、SRE が担うチケット対応・オンコール・手作業などの運用の仕事を、合計で50%までに抑えている[^intro]。残りの時間は、運用を減らすためのソフトウェアの開発に充てる。50%は上限であり、目標ではない[^intro]。運用の負荷が上限を超えた分は、開発チームに回される[^intro]。

## エラーバジェット

Treynor Sloss は、100%はほぼすべてのものにとって誤った信頼性の目標だと書いた[^intro]。利用者の端末や回線のほうがずっと不安定で、その差に気づけないからである[^intro]。

サービスごとに信頼性の目標（SLO）を決め、1から目標を引いた分を[エラーバジェット](/sloppedia/error-budget)とする[^intro]。たとえば目標が99.99%なら、0.01%までは失敗してよい。バジェットが残っているうちは新しい機能を速く出し、使い切ったら出すのを止めて信頼性を上げる。開発の速さと信頼性の取り合いを、数字で決めるための仕組みである。

## 書籍

Google は SRE の考え方を書籍で公開している。多くは無料のオンライン版がある[^books]。

| 書名                               | 内容                                         |
| ---------------------------------- | -------------------------------------------- |
| Site Reliability Engineering       | 最初の本                                     |
| The Site Reliability Workbook      | 2018年の実践編[^workbook]                    |
| Building Secure & Reliable Systems | セキュリティと信頼性の両立                   |
| Site Reliability Engineering 第2版 | 最初の本から10年の変化を踏まえて書き直した版 |

第2版は、クラウドの信頼性や AI を含めて全面的に書き直したと紹介されている[^books]。

## 最近の動き

sre.google は、SRE の20年の教訓をまとめた記事を出している[^twenty]。Google が AI を使って運用をどう変えようとしているかを扱った記事もある[^ai-sre]。

## 開発との関係

SRE は、[Google のソフトウェア開発](/sloppedia/google-software-engineering)の中で、出したものを動かし続ける段階を受け持つ。開発の側の「速いほど安全」という考え方と、エラーバジェットで信頼性を数える考え方は、どちらも変更を小さく頻繁に出すことを前提にしている。

[^intro]: Benjamin Treynor Sloss「[Introduction](https://sre.google/sre-book/introduction/)」『Site Reliability Engineering』第1章。

[^books]: Google「[SRE Books](https://sre.google/books/)」。2026年11月7日に閲覧。

[^workbook]: Google「[The Site Reliability Workbook](https://sre.google/workbook/table-of-contents/)」O'Reilly、2018年。

[^twenty]: Adrienne Walcer ほか「[Lessons Learned from Twenty Years of Site Reliability Engineering](https://sre.google/resources/practices-and-processes/twenty-years-of-sre-lessons-learned/)」。

[^ai-sre]: Ioannis Papapanagiotou ほか「[AI in SRE](https://sre.google/resources/practices-and-processes/ai-engineering-reliable-operations/)」。2026年11月7日に閲覧。
