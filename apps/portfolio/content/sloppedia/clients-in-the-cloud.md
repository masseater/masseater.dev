---
title: "CitC"
description: "Google の開発者が使う、クラウドに置いた作業場所。変えたファイルだけを持ち、リポジトリ全体が手元にあるように見せる。"
tags: ["Google", "バージョン管理システム", "モノレポ"]
published: true
infobox:
  - label: "正式名"
    value: "Clients in the Cloud"
  - label: "開発"
    value: "Google（社内専用）"
  - label: "対象"
    value: "Piper のリポジトリ"
  - label: "仕組み"
    value: "クラウドの保存先と FUSE のファイルシステム"
  - label: "手元の写しの平均"
    value: "10ファイル未満（2016年）"
---

CitC（Clients in the Cloud）は、Google の開発者が [Piper](/sloppedia/piper) のリポジトリで作業するための、クラウドに置いた作業場所である。開発者が変えたファイルだけをクラウドに持ち、残りはリポジトリ全体が手元にあるように見せる[^wikipedia]。

## 仕組み

CitC は、クラウドの保存先と手元の FUSE のファイルシステムを組み合わせる。リポジトリ全体の上に、開発者の変更を重ねて見せる[^wikipedia]。同期の操作をしなくても、ふつうの Unix の道具でリポジトリ全体を読める。手元に持つ写しは小さく、2016年の時点では平均で10ファイルに満たなかった[^wikipedia]。

ファイルへの書き込みはすべてスナップショットとして残る。明示的に保存の操作をしなくても、前の状態に戻せる[^wikipedia]。

## 利点

作業場所はクラウドにあるので、別の機械に移っても同じ作業を続けられる。変更中のコードをほかの開発者に見せることも、自動のビルドやテストの道具に渡すこともできる[^wikipedia]。

単一のリポジトリが巨大になると、全体を手元に写す Git のような方式では、取得や状態の確認に時間がかかる。CitC は、写さずに見せることでこの問題を避けている。

## 関連

[モノレポとポリレポ](/sloppedia/monorepo-and-polyrepo)の記事に、大きなリポジトリの扱いの論点がある。

[^wikipedia]: 「[Piper (source control system)](<https://en.wikipedia.org/wiki/Piper_(source_control_system)>)」Wikipedia。Potvin と Levenberg の2016年の論文を出典にしている。2026年11月7日に閲覧。
