---
title: "TAP"
description: "Google の社内の継続的インテグレーションの基盤 Test Automation Platform。単一のリポジトリへの変更を受けて、影響するテストを1日に数十億件走らせる。"
tags: ["Google", "テスト", "継続的インテグレーション"]
published: true
infobox:
  - label: "正式名"
    value: "Test Automation Platform"
  - label: "開発"
    value: "Google（社内専用）"
  - label: "扱う変更"
    value: "1日に5万件超"
  - label: "テストケースの実行"
    value: "1日に40億件超"
  - label: "提出までの平均の待ち"
    value: "約11分"
---

TAP（Test Automation Platform）は、Google の社内の継続的インテグレーション（CI）の基盤である。[Piper](/sloppedia/piper) の単一のリポジトリに入る変更を受けて、その変更に影響されるテストを走らせる。1日に5万を超える変更を扱い、40億を超えるテストケースを実行する[^swe-ch23]。

## 2段階の検査

TAP の検査は、変更を入れる前の presubmit と、入れた後の post-submit に分かれる[^swe-ch23]。

| 段階        | 走らせるテスト         | 目的                               |
| ----------- | ---------------------- | ---------------------------------- |
| presubmit   | 速く、安定したものだけ | 壊れた変更をトランクに入れない     |
| post-submit | 影響するテストすべて   | 入った変更が何を壊したかを見つける |

presubmit を通った変更は、95%を超える確率で残りの検査も通る[^swe-ch23]。変更を提出するまでの待ちは平均で約11分である[^swe-ch23]。すべてのテストを入れる前に走らせると待ちが長くなりすぎるので、ここで速さと確かさを分け合っている。

## 原因の特定

post-submit では、複数の変更をまとめてテストする。まとめた中のどれかが失敗すると、TAP はまとまりを分けて変更ごとに走らせ直し、壊した変更を突き止める[^swe-ch23]。同時に入った2つの変更がぶつかって壊れる「空中衝突」も、Google の規模では毎日のように起きるという[^swe-ch23]。

チームには「ビルドコップ」と呼ばれる係がいる。誰が壊したかにかかわらず、テストを緑に保つ責任を負う[^swe-ch23]。

## 不安定なテスト

同じコードで通ったり落ちたりするテストを、不安定な（flaky）テストと呼ぶ。2020年の書籍によれば、Google の不安定なテストの割合は0.15%前後である[^swe-ch11]。割合が小さく見えても、テストの数が多いと調べる手間は大きい。0.1%の割合で1万件のテストがあれば、1日に約10件の調査が要る[^swe-ch11]。

Google Assistant のチームは、presubmit のテストを外部に依存しない密閉した形へ移した。実行時間は14分の1になり、不安定さはほぼ無くなった[^swe-ch23]。

## 研究

Atif Memon らは2017年の論文で、TAP の記録を分析した。失敗するテストはごく少なく、失敗するテストは変更されたコードの近くにあることが多いと報告している[^memon]。

## 大規模変更との関係

[大規模変更](/sloppedia/large-scale-changes)は、多数の変更を TAP の「トレイン」に載せて検査する。3時間ごとに、変更ごとに1,000件の無作為なテストを走らせ、通ったものをまとめて影響するテスト全体にかける[^swe-ch22]。

[^swe-ch11]: 『Software Engineering at Google』「[Testing Overview](https://abseil.io/resources/swe-book/html/ch11.html)」第11章、2020年。

[^swe-ch22]: 『Software Engineering at Google』「[Large-Scale Changes](https://abseil.io/resources/swe-book/html/ch22.html)」第22章、2020年。

[^swe-ch23]: 『Software Engineering at Google』「[Continuous Integration](https://abseil.io/resources/swe-book/html/ch23.html)」第23章、2020年。

[^memon]: Atif Memon ほか「[Taming Google-Scale Continuous Testing](https://research.google/pubs/taming-google-scale-continuous-testing/)」ICSE SEIP、2017年。
