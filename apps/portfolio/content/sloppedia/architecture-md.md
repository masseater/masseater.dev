---
title: "ARCHITECTURE.md"
description: "リポジトリの構成を説明する文書の慣習と、それを AI エージェント向けのひな形として配るサイト architecture.md。"
tags: ["ソフトウェアドキュメント", "AI エージェント", "ソフトウェアアーキテクチャ"]
published: true
infobox:
  - label: "種類"
    value: "リポジトリに置く文書の慣習"
  - label: "提唱"
    value: "matklad（2021年2月6日）"
  - label: "ひな形のサイト"
    value: "architecture.md"
    href: "https://architecture.md/"
  - label: "ひな形の作者"
    value: "Tim Williams"
  - label: "ひな形のライセンス"
    value: "MIT"
---

ARCHITECTURE.md は、リポジトリの大まかな構成を書いて README の隣に置く文書である。2021年に matklad がブログで広めた[^matklad]。2025年には、AI エージェントにリポジトリを早く理解させるためのひな形が、同じ名前のサイト architecture.md で公開された[^site][^repo]。

## matklad の提案

matklad は2021年2月6日のブログで、1万行から20万行ほどのオープンソースのプロジェクトに、README と CONTRIBUTING の隣に ARCHITECTURE の文書を置くよう勧めた[^matklad]。

理由として、たまに貢献する人と中心の開発者の差は、プロジェクトの物理的な構成を知っているかどうかにあると述べた。不慣れなプロジェクトでは、パッチを書く時間は2倍になるが、どこを直すべきかを探す時間は10倍になるという[^matklad]。

書き方の指針として、まず短く保つことを挙げた。繰り返し貢献する人は全員が読み、短いほどのちの変更で古くなりにくいからである。頻繁には変わらないことだけを書き、コードと同期させようとせず年に数回見直すとした[^matklad]。

中身は、解く問題の概観から始め、モジュールの関係を示すコードマップを書く。重要なファイルやモジュールや型の名前は書くが、リンクは古くなるので張らず、読み手には名前で検索してもらう。何かが無いことで表される不変条件と、層の境界も明示する[^matklad]。

## architecture.md

architecture.md は、ARCHITECTURE.md のひな形を配るサイトである。「エージェントに自分のリポジトリについて埋めさせる」ためのひな形とうたい、.md の形でダウンロードやコピーができる[^site]。

作者は Tim Williams で、ソースは GitHub の timajwilliams/architecture にある。2025年7月23日に最初のコミットがあった。2026年11月5日の時点でコミットは7つで、最後のコミットは2026年7月15日だった[^repo]。

ひな形の節は次の11個である[^site]。

| 番号 | 節                 |
| ---- | ------------------ |
| 1    | プロジェクトの構造 |
| 2    | システムの概略図   |
| 3    | 中心の部品         |
| 4    | データストア       |
| 5    | 外部の連携と API   |
| 6    | デプロイと基盤     |
| 7    | セキュリティ       |
| 8    | 開発とテストの環境 |
| 9    | 今後の課題         |
| 10   | プロジェクトの識別 |
| 11   | 用語集             |

README は、節を空にせず埋めきるよう勧めており、不完全な文書は文書が無いより悪いと書いている。人間の開発者と AI エージェントの両方に向けて書くことも勧めている。文書を作らせるためのプロンプトのファイルも、2026年4月25日に足された[^repo]。

## 二つの違い

matklad の提案は、変わりにくいことだけを短く書くものである。architecture.md のひな形は、技術やデプロイ先や監視の道具まで含めて、すべての節を埋めるものである[^matklad][^repo]。

[^matklad]: matklad「[ARCHITECTURE.md](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)」2021年2月6日。

[^site]: Tim Williams「[ARCHITECTURE.md](https://architecture.md/)」。2026年11月5日に閲覧。

[^repo]: Tim Williams「[architecture](https://github.com/timajwilliams/architecture)」GitHub。2026年11月5日に閲覧。
