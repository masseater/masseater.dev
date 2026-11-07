---
title: "Google のソフトウェア開発"
description: "Google が社内でソフトウェアを作る方法。単一のリポジトリ、独自のビルドとテストの基盤、全変更のコードレビュー、SRE、2026年の AI による生成までを扱う。"
tags: ["Google", "ソフトウェア開発", "モノレポ", "2026年のソフトウェア"]
published: true
infobox:
  - label: "リポジトリ"
    value: "全社で単一（Piper）"
  - label: "ブランチ"
    value: "トランクベース開発"
  - label: "ビルド"
    value: "Blaze（公開版は Bazel）"
  - label: "テスト"
    value: "TAP"
  - label: "コードレビュー"
    value: "Critique"
  - label: "運用"
    value: "SRE"
  - label: "AI が生成した新しいコード"
    value: "75%（2026年4月）"
  - label: "情報の時点"
    value: "2026年11月7日"
---

Google のソフトウェア開発は、Google が社内でソフトウェアを書いて確かめ、出して動かし続けるための方法と道具の総体である。全社のコードを1つのリポジトリに置き、ほぼすべての開発者が同じ1本の幹（トランク）に変更を入れる点が最もよく知られている[^potvin]。その周りに、独自のバージョン管理システム・ビルドシステム・テストの基盤・コードレビューの道具が作られている。

社内の作法は、2016年の Rachel Potvin と Josh Levenberg の論文[^potvin]と、2020年の書籍『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』[^swe-book]でまとまって公開された。同書は、ソフトウェアエンジニアリングを「時間で積分したプログラミング」と定義している[^swe-ch1]。書いたコードが何年も使われ、何度も変えられることを前提に、仕組みを組んでいるということである。

2020年代の半ばからは、AI によるコードの生成がこの仕組みに入り込んだ。CEO の Sundar Pichai は2026年4月に、新しいコードの75%が AI の生成したもので、エンジニアが承認していると書いた[^next-2026]。

## 全体の構成

開発の流れに沿って、主な道具と作法を並べる。

| 段階             | 道具・作法                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| コードの置き場所 | [Piper](/sloppedia/piper) の単一のリポジトリ、[モノレポ](/sloppedia/monorepo-and-polyrepo)                                              |
| 手元の作業       | [CitC](/sloppedia/clients-in-the-cloud)                                                                                                 |
| ブランチの運用   | [トランクベース開発](/sloppedia/trunk-based-development)、[One Version Rule](/sloppedia/one-version-rule)                               |
| ビルド           | [Blaze と Bazel](/sloppedia/bazel)                                                                                                      |
| テスト           | [TAP](/sloppedia/google-tap)                                                                                                            |
| レビュー         | [Critique](/sloppedia/critique)、[Google のコードレビュー](/sloppedia/google-code-review)、[Readability](/sloppedia/google-readability) |
| 検査と検索       | [Tricorder](/sloppedia/tricorder)、[Code Search](/sloppedia/google-code-search)                                                         |
| 全社に及ぶ変更   | [大規模変更](/sloppedia/large-scale-changes)、[ハイラムの法則](/sloppedia/hyrums-law)                                                   |
| 運用             | [サイト信頼性エンジニアリング](/sloppedia/site-reliability-engineering)                                                                 |
| 外部との同期     | [Copybara](/sloppedia/copybara)                                                                                                         |
| AI               | [Google の AI によるコーディング](/sloppedia/google-ai-assisted-coding)                                                                 |

## 歴史

Google は10年以上にわたり、1台の [Perforce](/sloppedia/perforce) のサーバーに独自のキャッシュを足して全社のコードを置いていた。それでも規模に追いつかなくなり、自前のバージョン管理システムの Piper を作った[^wikipedia-piper]。

ビルドシステムの Blaze は2006年に作り始められた。2015年3月には、その一部を Bazel として公開した[^wikipedia-bazel]。運用の側では、Benjamin Treynor Sloss が2003年に7人の本番環境のチームを任され、これが SRE の始まりになった[^sre-intro]。

2016年の Potvin と Levenberg の論文は、単一のリポジトリという選択を社外に向けて初めてまとめて説明したものである[^potvin]。2020年には、Titus Winters、Tom Manshreck、Hyrum Wright の編による書籍が出た。無料のオンライン版もある[^swe-book]。

## コードの置き場所

Google は全社のコードを Piper の単一のリポジトリに置いている。2016年の時点で、約2万5,000人の開発者が1日に約1万6,000件の変更を入れ、自動化された仕組みがさらに約2万4,000件を入れていた[^potvin]。読み出しは平日の平均で毎秒およそ50万件だった[^potvin]。2020年の書籍は、80 TB を超える中身と、平日に6万から7万件のコミットを挙げている[^swe-ch16]。

開発者は手元にリポジトリを写さない。[CitC](/sloppedia/clients-in-the-cloud)（Clients in the Cloud）は、変えたファイルだけをクラウドに持ち、残りはリポジトリ全体が手元にあるように見せる[^wikipedia-piper]。

リポジトリの大部分は全社員が読める。コードの木の各ディレクトリに持ち主（[OWNERS](/sloppedia/google-owners)）がいて、そこへの変更には持ち主の承認が要る[^mcr]。

## ブランチと版

ほとんどの開発者は個人のブランチを作らず、トランクに直接変更を入れる。ブランチは主にリリースのために切る[^wikipedia-piper]。これが[トランクベース開発](/sloppedia/trunk-based-development)である。

書籍は、リポジトリの中のどの依存にも選べる版は1つだけであるべきだという決まりを「One Version」と呼んでいる[^swe-ch16]。同じライブラリの2つの版が混ざる問題を、そもそも起こさないためである。開発のためのブランチで製品を安定させるやり方を、同書は「もともと見当違い」と書いた[^swe-ch16]。

## ビルドとテスト

ビルドは [Blaze](/sloppedia/bazel) で行う。Blaze は、何を作るかを宣言で書かせ、どう作るかをシステムが決める。入力と出力を厳密に追うので、結果を使い回し、手順を並べて走らせられる[^swe-ch18]。

テストは [TAP](/sloppedia/google-tap)（Test Automation Platform）が回す。TAP は1日に5万を超える変更を扱い、40億を超えるテストケースを走らせる[^swe-ch23]。書籍は、壊されたくないものにはテストを書いておけという決まりを「ビヨンセ・ルール」と呼ぶ。基盤の変更で製品が壊れても、それを捕まえる CI のテストが無かったなら、基盤の側の落ち度ではないという考え方である[^swe-ch1]。

テストは使う資源で small・medium・large に分ける。small は1つのプロセスで、medium は1台の機械で動く。large はどこで動いてもよい[^swe-ch11]。

## コードレビュー

ほぼすべての変更は、トランクへ入る前に別の人がレビューする[^swe-ch9]。道具は [Critique](/sloppedia/critique) である。変更を入れるには、次の3つの承認がそろわなければならない[^swe-ch9]。

| 承認                                         | 意味                                          |
| -------------------------------------------- | --------------------------------------------- |
| LGTM                                         | 変更が正しく、読んで分かると認める            |
| 持ち主の承認                                 | OWNERS に載った人が、その場所への変更を認める |
| [Readability](/sloppedia/google-readability) | その言語の書き方の認定を持つ人が認める        |

作者がすでに持ち主や Readability の認定者なら、その分の承認は作者が満たせる。そのため、ほとんどの変更はレビュアーが1人で済む[^mcr]。2018年の調査では、レビュー全体にかかる時間の中央値は4時間を下回り、変更した行数の中央値は24行だった[^mcr]。

## 静的解析とコード検索

[Tricorder](/sloppedia/tricorder) は、100を超える解析器の結果をコードレビューの画面に出す。1日に5万を超える変更を見ている。誤検知が多いと開発者は警告を無視するので、効いていない警告の割合を10%未満に保つことを解析器に求めている[^swe-ch20]。

[Code Search](/sloppedia/google-code-search) は、社内の開発者が1日に100万回を超えて使うコードの検索の道具である[^swe-ch17]。

## 全社に及ぶ変更

1つのリポジトリにすべてのコードがあるので、ある API を使う箇所を全社で一度に直せる。とはいえ、変更が大きすぎると1つのコミットには収まらない。書籍は、論理的には1つでも、1回では入れられない変更を[大規模変更](/sloppedia/large-scale-changes)（LSC）と呼ぶ[^swe-ch22]。[Rosie](/sloppedia/rosie) という道具が、大きな変更を持ち主ごとの小さな変更に分け、それぞれにレビューとテストを通させる[^swe-ch22]。

API の利用者が十分に多いと、約束していない振る舞いにも誰かが頼るようになる。Hyrum Wright のこの観察は[ハイラムの法則](/sloppedia/hyrums-law)と呼ばれる[^swe-ch1]。大規模変更の難しさの多くは、ここから来る。

## リリースと運用

書籍は「速いほど安全」として、変更を小さく分けて頻繁に出すことを勧めている。あらゆる変更をフラグで守り、出してから機能を切り替えるやり方である[^swe-ch24]。

本番の運用は、[サイト信頼性エンジニアリング](/sloppedia/site-reliability-engineering)（SRE）が担う。Treynor Sloss は、SRE を「ソフトウェアエンジニアに運用チームを設計させると起きること」と定義した。SRE の運用の仕事は全体の50%までと上限を決め、残りを自動化の開発に充てる[^sre-intro]。

## 社外との関係

社内の道具の多くは、公開版や考え方の形で外に出ている。Blaze の公開版が Bazel で、2026年11月5日に 9.3.2 が出ている[^bazel-releases]。リポジトリの間でコードを写して変換する [Copybara](/sloppedia/copybara) は、社内のリポジトリと GitHub の公開リポジトリを同期させる道具である[^copybara]。[Abseil](/sloppedia/abseil) の GitHub のコミットには、社内の変更番号を示す `PiperOrigin-RevId` の行が付いている[^abseil]。

コードレビューの指針は eng-practices として[^eng-practices]、各言語の書き方の決まりはスタイルガイドとして公開されている[^styleguide]。スタイルガイドは社内のものの写しで、外からの変更は受け付けていない[^styleguide]。

## AI によるコーディング

Google は2022年に、機械学習によるコードの補完を社内の1万人を超える開発者に出した[^ml-completion]。2024年6月には、コードの文字の50%が AI の補完で入力されるようになったと報告した[^ai-se-2024]。同じ年の10月に Pichai は、新しいコードの4分の1を超える部分を AI が生成し、エンジニアがレビューして受け入れていると述べた[^q3-2024]。

2026年4月には、この割合が75%になった。前の年の秋は50%だったという[^next-2026]。Pichai は、エンジニアが自律的なエージェントの群れを動かす「真にエージェント的なワークフロー」に移っていると書いた[^next-2026]。社内の AI 開発ツールが処理するトークンの量は、2026年5月の I/O の時点で1日に3兆を超えていた[^io-2026]。詳しくは[Google の AI によるコーディング](/sloppedia/google-ai-assisted-coding)を参照。

## 評価

Potvin と Levenberg は、単一のリポジトリの利点として、版の統一、コードの共有と再利用、依存の管理の単純さ、原子的な変更、大きなリファクタリングを挙げた[^potvin]。代償として、道具への大きな投資、不要な依存が増えやすいこと、コードの健全さを保つための手間を挙げている[^potvin]。

この方式は、独自の道具を作り続けられる規模の会社だからこそ成り立つという見方がある。書籍の題名が「Google における」と断っているのも、そのまま他社に持ち込めるとは限らないからである。モノレポとポリレポのどちらがよいかの議論は、[モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)の記事にまとめてある。

AI の生成の割合については、どの程度の手直しを経て受け入れられたかが公表されていないという指摘がある。Semafor は、Pichai の挙げた所要時間の短縮について、事実を確かめるのはほぼ不可能だと書いた[^semafor]。

[^potvin]: Rachel Potvin、Josh Levenberg「[Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)」CACM、2016年。本文は取得できず、数値は検索結果の抜粋による。

[^wikipedia-piper]: 「[Piper (source control system)](<https://en.wikipedia.org/wiki/Piper_(source_control_system)>)」Wikipedia。Potvin と Levenberg の論文を出典にしている。2026年11月7日に閲覧。

[^wikipedia-bazel]: 「[Bazel (software)](<https://en.wikipedia.org/wiki/Bazel_(software)>)」Wikipedia。2026年11月7日に閲覧。

[^swe-book]: Titus Winters、Tom Manshreck、Hyrum Wright 編『[Software Engineering at Google](https://abseil.io/resources/swe-book)』O'Reilly、2020年。

[^swe-ch1]: 『Software Engineering at Google』「[What Is Software Engineering?](https://abseil.io/resources/swe-book/html/ch01.html)」第1章。

[^swe-ch9]: 『Software Engineering at Google』「[Code Review](https://abseil.io/resources/swe-book/html/ch09.html)」第9章。

[^swe-ch11]: 『Software Engineering at Google』「[Testing Overview](https://abseil.io/resources/swe-book/html/ch11.html)」第11章。

[^swe-ch16]: 『Software Engineering at Google』「[Version Control and Branch Management](https://abseil.io/resources/swe-book/html/ch16.html)」第16章。

[^swe-ch17]: 『Software Engineering at Google』「[Code Search](https://abseil.io/resources/swe-book/html/ch17.html)」第17章。

[^swe-ch18]: 『Software Engineering at Google』「[Build Systems and Build Philosophy](https://abseil.io/resources/swe-book/html/ch18.html)」第18章。

[^swe-ch20]: 『Software Engineering at Google』「[Static Analysis](https://abseil.io/resources/swe-book/html/ch20.html)」第20章。

[^swe-ch22]: 『Software Engineering at Google』「[Large-Scale Changes](https://abseil.io/resources/swe-book/html/ch22.html)」第22章。

[^swe-ch23]: 『Software Engineering at Google』「[Continuous Integration](https://abseil.io/resources/swe-book/html/ch23.html)」第23章。

[^swe-ch24]: 『Software Engineering at Google』「[Continuous Delivery](https://abseil.io/resources/swe-book/html/ch24.html)」第24章。

[^mcr]: Caitlin Sadowski ほか「[Modern Code Review: A Case Study at Google](https://research.google/pubs/modern-code-review-a-case-study-at-google/)」ICSE SEIP、2018年。

[^sre-intro]: Benjamin Treynor Sloss「[Introduction](https://sre.google/sre-book/introduction/)」『Site Reliability Engineering』第1章。

[^bazel-releases]: Bazel「[Releases](https://github.com/bazelbuild/bazel/releases)」GitHub。2026年11月7日に閲覧。

[^copybara]: Google「[Copybara](https://github.com/google/copybara)」GitHub。2026年11月7日に閲覧。

[^abseil]: Abseil「[abseil-cpp](https://github.com/abseil/abseil-cpp)」GitHub。2026年11月7日の最新のコミットで確認。

[^eng-practices]: Google「[Google Engineering Practices Documentation](https://google.github.io/eng-practices/)」。2026年11月7日に閲覧。

[^styleguide]: Google「[Google Style Guides](https://google.github.io/styleguide/)」。2026年11月7日に閲覧。

[^ml-completion]: Maxim Tabachnyk、Stoyan Nikolov「[ML-Enhanced Code Completion Improves Developer Productivity](https://research.google/blog/ml-enhanced-code-completion-improves-developer-productivity/)」Google Research、2022年7月26日。

[^ai-se-2024]: Satish Chandra、Maxim Tabachnyk「[AI in software engineering at Google: Progress and the path ahead](https://research.google/blog/ai-in-software-engineering-at-google-progress-and-the-path-ahead/)」2024年6月6日。

[^q3-2024]: Sundar Pichai「[Alphabet Q3 earnings call: CEO Sundar Pichai's remarks](https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2024/)」Google、2024年10月29日。

[^next-2026]: Sundar Pichai「[Sundar Pichai shares news from Google Cloud Next 2026](https://blog.google/innovation-and-ai/infrastructure-and-cloud/google-cloud/cloud-next-2026-sundar-pichai/)」2026年4月22日。

[^io-2026]: Sundar Pichai「[Google I/O 2026: Sundar Pichai's opening keynote](https://blog.google/innovation-and-ai/sundar-pichai-io-2026/)」Google、2026年5月19日。

[^semafor]: Tom Chivers「[Google CEO says 75% of company's new code is AI-generated](https://www.semafor.com/article/04/24/2026/google-ceo-says-75-of-companys-new-code-is-ai-generated)」Semafor、2026年4月24日。
