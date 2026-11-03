---
title: "モノレポとポリレポ"
description: "複数のプロジェクトのコードを、1つのリポジトリにまとめるか、リポジトリを分けて置くかという構成の選択。"
tags: ["バージョン管理システム", "ソフトウェア開発", "ソフトウェアアーキテクチャ"]
published: true
infobox:
  - label: "モノレポ"
    value: "複数のプロジェクトを1つのリポジトリに置く"
  - label: "ポリレポ"
    value: "プロジェクトごとにリポジトリを分ける"
  - label: "主な論点"
    value: "横断的な変更、依存の版、ビルドとCI、権限、リリースの周期"
  - label: "代表的な事例"
    value: "Google、Segment"
---

モノレポとポリレポは、複数のプロジェクトのコードをどう置くかという2つの構成である。モノレポは、関係のはっきりした複数のプロジェクトを1つのリポジトリに置く[^monorepo-tools]。ポリレポは、プロジェクトごとにリポジトリを分ける。マルチレポとも呼ぶ。どちらが優れているかは長く論じられてきたが、どちらか一方が常に優れているわけではないというのが多くの論者の見方である[^danluu][^spectro]。

## 用語

モノレポは、1つのアプリケーションを1つのリポジトリに置くモノリスとは別の概念である。Nx が運営する monorepo.tools は、よいモノレポはモノリスの反対だと述べている。コードを1か所に集めただけで、プロジェクト同士の関係が決まっていないものはモノレポとは呼ばない[^monorepo-tools]。

ポリレポにも2つの形がある。1つはリポジトリを分けたうえで、共有のライブラリをパッケージとして配って依存させる形である。もう1つは、プロジェクトが互いにコードを共有せず、それぞれ独立している形である。両者では、リポジトリをまたぐ調整の量が大きく違う[^riftmap]。

## モノレポ

### 利点

横断的な変更を1つのコミットで済ませられる。Dan Luu は、API を変えるときに呼び出し側もまとめて1つのコミットで直せる点を挙げた[^danluu]。monorepo.tools も、プロジェクトをまたぐ原子的なコミットを利点に数えている[^monorepo-tools]。

依存の版をそろえやすい。リポジトリ全体で1つの版を使えるので、プロジェクトごとに版がずれない[^danluu]。Google の Rachel Potvin と Josh Levenberg は、単一のリポジトリが世界中の数万人の開発者にとって共通の正となる情報源になっていると書いた[^google]。

共有のコードを使う手間が減る。パッケージとして公開し直さなくても、別のプロジェクトのコードを直接参照できる[^monorepo-tools]。静的解析、結合テスト、コード検索もリポジトリ全体に掛けられる[^danluu]。

### 欠点

ビルドと CI を作り込む必要がある。変更の影響が及ぶ範囲だけを検査するには、Bazel、Nx、Pants、Turborepo のようなビルドグラフを持つ道具を整え、育て続けなければならない[^riftmap]。

チームの間で規約やレビューの文化をそろえる調整が要る[^riftmap]。

## ポリレポ

### 利点

プロジェクトごとに CI とリリースの周期を独立させられる。使わなくなったサービスは、リポジトリをアーカイブすれば片付く[^riftmap]。

### 欠点

横断的な変更が、複数のリポジトリにまたがる PR の調整になる。リポジトリごとに依存の版がずれやすい。規約を全体でそろえるのは、1つのコミットではなく、リポジトリを1つずつ回る作業になる[^riftmap]。

共有のライブラリを直すと、それに依存するリポジトリをすべて検査して出し直す必要が生じる。Segment は、宛先ごとに分けた140を超えるサービスとリポジトリでこの負担に苦しんだ[^segment]。

## 独立したプロジェクト

プロジェクトが互いにコードを共有しないなら、上のポリレポの欠点の多くは生じない。リポジトリをまたぐ変更も、版のずれも起きないからである。Riftmap の作者の Daniel Westgaard は、論点はコードの置き場所ではなく、依存の関係が機械に分かる形で宣言されているか、人の記憶に頼っているかだと論じた[^riftmap]。

## 事例

### Google

Google は、全社のコードを単一のリポジトリで管理している。Potvin と Levenberg は2016年の Communications of the ACM の論文で、この方式の利点とトレードオフを論じた[^google]。

### Segment

Segment は2018年に、宛先ごとに分けていたマイクロサービスとリポジトリを、1つのサービスと1つのリポジトリにまとめた。共有のライブラリを直すたびに140を超えるサービスを出し直す必要が無くなり、全宛先のテストはミリ秒で終わるようになった。その代わり、1つの宛先の障害が全体へ広がりうる。障害の切り分けは難しくなった[^segment]。

## AI エージェントとの関係

2026年には、AI のコーディングエージェントとの相性が新しい論点になった。Spectro Cloud の Karl Cardenas は、もとはポリレポ派だったが、モノレポに明確な利点があると考えるようになったと書いた。AI のコードレビューが、同じ変更に含まれる別のフォルダの変更を踏まえて誤りを見つけた例を挙げ、エージェントへの指示を AGENTS.md の1か所にまとめられる点も挙げた。ただし、複数のフォルダを開けるエディタを使えば、索引の差はほとんど無いことも認めている[^spectro]。

monorepo.tools も、エージェントがリポジトリ全体を見渡せる点を利点に挙げている[^monorepo-tools]。Westgaard は、ポリレポでもリポジトリをまたぐ依存のグラフを解析して用意すれば、エージェントは同じことができると論じた[^riftmap]。

[^google]: Rachel Potvin、Josh Levenberg「[Why Google Stores Billions of Lines of Code in a Single Repository](https://research.google/pubs/why-google-stores-billions-of-lines-of-code-in-a-single-repository/)」CACM、2016年。

[^danluu]: Dan Luu「[Advantages of monorepos](https://danluu.com/monorepo/)」。2026年11月3日に閲覧。

[^monorepo-tools]: Nx「[Monorepo Explained](https://monorepo.tools/)」monorepo.tools。2026年11月3日に閲覧。

[^segment]: Alexandra Noonan「[Goodbye Microservices: From 100s of problem children to 1 superstar](https://www.twilio.com/en-us/blog/developers/best-practices/goodbye-microservices)」Segment、2018年7月10日。

[^spectro]: Karl Cardenas「[Will AI turn 2026 into the year of the monorepo?](https://www.spectrocloud.com/blog/will-ai-turn-2026-into-the-year-of-the-monorepo)」Spectro Cloud、2026年1月16日。

[^riftmap]: Daniel Westgaard「[Monorepo vs polyrepo: the debate is measuring the wrong thing](https://riftmap.dev/blog/monorepo-vs-polyrepo/)」Riftmap、2026年6月5日。
