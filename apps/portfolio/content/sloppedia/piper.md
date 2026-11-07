---
title: "Piper"
description: "Google が全社のソースコードを1つのリポジトリに置くために作った、集中型のバージョン管理システム。"
tags: ["Google", "バージョン管理システム", "モノレポ"]
published: true
infobox:
  - label: "種類"
    value: "集中型のバージョン管理システム"
  - label: "開発"
    value: "Google（社内専用）"
  - label: "前身"
    value: "Perforce の単一のサーバー"
  - label: "保存先"
    value: "Bigtable、のちに Spanner"
  - label: "規模（2016年）"
    value: "20億行、900万ファイル、86 TB"
  - label: "手元の作業"
    value: "CitC"
---

Piper は、全社のソースコードを1つのリポジトリにまとめる、Google の集中型のバージョン管理システムである。社外には公開されていない。[Google のソフトウェア開発](/sloppedia/google-software-engineering)で、すべてのコードの置き場所になっている。

## 経緯

Google は10年以上にわたり、1台の Perforce のサーバーに独自のキャッシュを足して全社のコードを置いていた。さらに規模を広げる必要から Piper を作った[^wikipedia]。2020年の書籍『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、Piper を分散したマイクロサービスとして作られた集中型のシステムと説明している[^swe-ch16]。

## 作り

Piper は Google の汎用のストレージの上に作られている。はじめは Bigtable を、のちに Spanner を使い、世界の10か所のデータセンターに Paxos で複製している[^wikipedia]。

開発者は、リポジトリ全体を手元に写さない。多くの開発者は [CitC](/sloppedia/clients-in-the-cloud) を通して Piper を使い、変えたファイルだけをクラウドの作業場所に持つ[^wikipedia]。

## 規模

2016年の論文によれば、約2万5,000人の開発者が1日に約1万6,000件の変更を入れ、自動化された仕組みがさらに約2万4,000件を入れていた[^potvin]。同じ年の時点で、中身は86 TB、20億行、900万ファイルだった[^wikipedia]。2020年の書籍は、80 TB を超える中身と、平日に6万から7万件のコミットを挙げている[^swe-ch16]。新しい作業場所を作り、ファイルを足してコミットするまでは15秒ほどで済むという[^swe-ch16]。

## 権限と記録

コードの大部分は全社の開発者が読める。機密の扱いが要るファイルだけを読める人を絞っており、2016年の時点でその割合は1%未満だった[^wikipedia]。Piper への操作はすべて記録され、誤ってコミットしたファイルは消せる[^wikipedia]。

コミットは、[Critique](/sloppedia/critique) でのコードレビューを経てからでなければできない[^wikipedia]。

## ブランチ

Google の開発者の大半は個人のブランチを使わず、トランクに直接変更を入れる。ブランチは主にリリースに使う[^wikipedia]。この運用は[トランクベース開発](/sloppedia/trunk-based-development)と呼ばれる。

## 社外への影響

Piper の公開版は無い。社内の Piper と公開の GitHub のリポジトリの間でコードを行き来させる道具として、[Copybara](/sloppedia/copybara) が公開されている[^copybara]。Google が GitHub で公開しているリポジトリのコミットには、Piper の変更番号を示す `PiperOrigin-RevId` の行が付く[^abseil]。

大規模なモノレポを持つほかの会社も、既存のバージョン管理システムでは足りず、独自のものを作ってきた。[バージョン管理システムの一覧](/sloppedia/version-control-systems)に例がある。

[^potvin]: Rachel Potvin、Josh Levenberg「[Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)」CACM、2016年。本文は取得できず、数値は検索結果の抜粋による。

[^wikipedia]: 「[Piper (source control system)](<https://en.wikipedia.org/wiki/Piper_(source_control_system)>)」Wikipedia。Potvin と Levenberg の論文を出典にしている。2026年11月7日に閲覧。

[^swe-ch16]: 『Software Engineering at Google』「[Version Control and Branch Management](https://abseil.io/resources/swe-book/html/ch16.html)」第16章、2020年。

[^copybara]: Google「[Copybara](https://github.com/google/copybara)」GitHub。2026年11月7日に閲覧。

[^abseil]: Abseil「[abseil-cpp](https://github.com/abseil/abseil-cpp)」GitHub。2026年11月7日の最新のコミットで確認。
