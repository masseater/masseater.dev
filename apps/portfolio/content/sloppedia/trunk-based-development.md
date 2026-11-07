---
title: "トランクベース開発"
description: "開発者が1本の幹（トランク）に小さな変更を頻繁に入れ、長く生きる開発用のブランチを作らないブランチの運用。Google が大規模に実践している。"
tags: ["バージョン管理システム", "ソフトウェア開発", "継続的インテグレーション"]
published: true
infobox:
  - label: "別名"
    value: "TBD"
  - label: "ブランチの数"
    value: "3本以下（DORA）"
  - label: "トランクへの統合"
    value: "少なくとも1日1回"
  - label: "代表的な実践者"
    value: "Google、Facebook"
---

トランクベース開発は、開発者が1本の幹（トランク）で共同作業し、長く生きる開発用のブランチを作らないブランチの運用である[^tbd]。[Git](/sloppedia/git) の世界では、2020年からトランクを「main」と呼ぶことが多い[^tbd]。

## やり方

小さな変更を頻繁にトランクへ入れる。レビューや CI のために短命のフィーチャーブランチを使うことはあるが、そこから成果物を作って出すことはしない[^tbd]。ごく小さなチームなら、トランクに直接コミットしてもよい[^tbd]。

リリースのためにブランチを切ることはある。トランクからリリースの直前に切り、仕上げてから出し、終わったら消す。リリースのブランチを作らず、トランクから出して問題は前へ直していくチームもある[^tbd]。

[DORA](/sloppedia/dora) の研究は、次の3つを実践の目安に挙げている[^dora]。

| 目安                                           |
| ---------------------------------------------- |
| 活動中のブランチを3本以下にする                |
| ブランチを少なくとも1日に1回トランクに統合する |
| コードの凍結期間や統合のための期間を設けない   |

フィーチャーブランチがふつう数日から数週間続くのに対し、トランクベース開発のブランチは長くても数時間で終わる[^dora]。DORA は、トランクベース開発を継続的インテグレーションに欠かせない実践と位置づけている[^dora]。

## Google での実践

Google の開発者の大半は個人のブランチを使わず、[Piper](/sloppedia/piper) のトランクに直接変更を入れる。ブランチは主にリリースに使う[^wikipedia]。『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、トランクを常に緑で保つこと、テストと CI を頼ること、出来ていない機能を無効にしたまま出すことを求めている[^swe-ch16]。開発用のブランチで製品を安定させるやり方は、もともと見当違いだと書いている[^swe-ch16]。

トランクベース開発の案内サイトは、Google と Facebook を大規模な実践者として挙げている[^tbd]。

## 支える仕組み

トランクに未完成の変更が入ってもよいように、機能をフラグで隠す。Google では、あらゆる変更をフラグで守り、出してから機能を切り替える[^swe-ch24]。

壊れた変更がトランクに入るのを防ぐのは、入れる前のテストである。Google では [TAP](/sloppedia/google-tap) が presubmit で速いテストを走らせ、入れた後に残りのテストを走らせる[^swe-ch23]。

[^tbd]: Paul Hammant「[Introduction](https://trunkbaseddevelopment.com/)」Trunk Based Development。2026年11月7日に閲覧。

[^dora]: DORA「[Trunk-based development](https://dora.dev/capabilities/trunk-based-development/)」。2026年11月7日に閲覧。

[^wikipedia]: 「[Piper (source control system)](<https://en.wikipedia.org/wiki/Piper_(source_control_system)>)」Wikipedia。2026年11月7日に閲覧。

[^swe-ch16]: 『Software Engineering at Google』「[Version Control and Branch Management](https://abseil.io/resources/swe-book/html/ch16.html)」第16章、2020年。

[^swe-ch23]: 『Software Engineering at Google』「[Continuous Integration](https://abseil.io/resources/swe-book/html/ch23.html)」第23章、2020年。

[^swe-ch24]: 『Software Engineering at Google』「[Continuous Delivery](https://abseil.io/resources/swe-book/html/ch24.html)」第24章、2020年。
