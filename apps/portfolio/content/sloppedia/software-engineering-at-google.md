---
title: "Software Engineering at Google"
description: "Google の社内のソフトウェアエンジニアリングの作法をまとめた2020年の書籍。本論は文化・プロセス・道具の部に分かれ、オンラインで無料で読める。"
tags: ["Google", "ソフトウェア開発", "書籍"]
published: true
infobox:
  - label: "編者"
    value: "Titus Winters、Tom Manshreck、Hyrum Wright"
  - label: "出版"
    value: "O'Reilly、2020年"
  - label: "構成"
    value: "主題、文化、プロセス、道具、結び"
  - label: "無料の版"
    value: "abseil.io"
    href: "https://abseil.io/resources/swe-book"
---

Software Engineering at Google は、Google の社内のソフトウェアエンジニアリングの作法をまとめた書籍である。Titus Winters、Tom Manshreck、Hyrum Wright が編み、2020年に O'Reilly から出た。[Abseil](/sloppedia/abseil) のサイトで全文を無料で読める[^swe-book]。

## 主題

書籍は、ソフトウェアエンジニアリングを「時間で積分したプログラミング」と定義する[^swe-ch1]。コードの寿命は、数分で捨てるものから何十年も使うものまで、およそ10万倍の幅がある。長く使うコードほど、変化に耐える仕組みが要る[^swe-ch1]。この考えから、書籍は時間、規模、トレードオフの3つを軸に話を進める。

## 構成

| 部       | 主な章                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 文化     | チームで働くこと、知識の共有、エンジニアリングの生産性の計測                                                                                                         |
| プロセス | スタイルガイド、[コードレビュー](/sloppedia/google-code-review)、文書、テスト、非推奨化                                                                              |
| 道具     | バージョン管理、[コード検索](/sloppedia/google-code-search)、ビルド、[Critique](/sloppedia/critique)、静的解析、[大規模変更](/sloppedia/large-scale-changes)、CI、CD |

## よく引かれる考え方

| 名前                                       | 内容                                                       |
| ------------------------------------------ | ---------------------------------------------------------- |
| [ハイラムの法則](/sloppedia/hyrums-law)    | 利用者が多ければ、観察できる振る舞いはすべて誰かに頼られる |
| ビヨンセ・ルール                           | 壊されたくないものには CI のテストを書いておけ             |
| シフトレフト                               | 問題は開発の流れのより早い段階で見つけるほど安く直せる     |
| [One Version](/sloppedia/one-version-rule) | どの依存にも選べる版は1つだけにする                        |

ハイラムの法則、ビヨンセ・ルール、シフトレフトは第1章に[^swe-ch1]、One Version は第16章に出てくる[^swe-ch16]。

## 数字の時点

書籍の数字は、2020年ごろの Google のものである。[TAP](/sloppedia/google-tap) が1日に40億を超えるテストケースを走らせる[^swe-ch23]、Code Search が1日に100万回を超えて使われる[^swe-ch17]といった数字は、その後の更新を経ていない。2020年代半ばからの AI によるコードの生成は、当然ながら扱っていない。その後の変化は[Google の AI によるコーディング](/sloppedia/google-ai-assisted-coding)にまとめた。

## 関連する資料

書籍の前に、Rachel Potvin と Josh Levenberg が2016年に単一のリポジトリについての論文を出している[^potvin]。運用の側の作法は、別の書籍群の『Site Reliability Engineering』にまとめられている。[サイト信頼性エンジニアリング](/sloppedia/site-reliability-engineering)を参照。

[^swe-book]: Titus Winters、Tom Manshreck、Hyrum Wright 編『[Software Engineering at Google](https://abseil.io/resources/swe-book)』O'Reilly、2020年。

[^swe-ch1]: 『Software Engineering at Google』「[What Is Software Engineering?](https://abseil.io/resources/swe-book/html/ch01.html)」第1章。

[^swe-ch16]: 『Software Engineering at Google』「[Version Control and Branch Management](https://abseil.io/resources/swe-book/html/ch16.html)」第16章。

[^swe-ch17]: 『Software Engineering at Google』「[Code Search](https://abseil.io/resources/swe-book/html/ch17.html)」第17章。

[^swe-ch23]: 『Software Engineering at Google』「[Continuous Integration](https://abseil.io/resources/swe-book/html/ch23.html)」第23章。

[^potvin]: Rachel Potvin、Josh Levenberg「[Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)」CACM、2016年。
