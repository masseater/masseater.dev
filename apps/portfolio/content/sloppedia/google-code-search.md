---
title: "Code Search（Google）"
description: "Google の社内のコード検索の道具。単一のリポジトリ全体を正規表現で探し、Kythe の相互参照で定義や呼び出し元へたどれる。"
tags: ["Google", "コード検索", "開発者ツール"]
published: true
infobox:
  - label: "開発"
    value: "Google"
  - label: "検索の回数"
    value: "1日に100万回超（社内）"
  - label: "索引の大きさ"
    value: "約1.5 TB"
  - label: "応答の中央値"
    value: "50ミリ秒未満"
  - label: "相互参照"
    value: "Kythe"
---

Code Search は、Google の社内のコード検索の道具である。[Piper](/sloppedia/piper) の単一のリポジトリ全体を探せる。社内の開発者は1日に100万回を超えて使う[^swe-ch17]。『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、その目標を「コードについての次の疑問に1回のクリックで答える」と書いている[^swe-ch17]。

## 何を探すか

書籍は、検索の目的を次のように分けている[^swe-ch17]。

| 問い       | 内容                            | 割合     |
| ---------- | ------------------------------- | -------- |
| どこ       | あるコードがどこにあるか        | 約16%    |
| 何         | あるコードが何をしているか      | 約25%    |
| どうやって | ある API をどう使うか、例を探す | 約3分の1 |
| なぜ       | コードがなぜそう振る舞うか      | 約16%    |
| 誰・いつ   | 誰がいつ書いたか                | 約8%     |

使い方の例を探す検索が最も多い。単一のリポジトリでは、ほかのチームが同じ API をどう使っているかをすぐに確かめられる。

## 作り

索引は約1.5 TB で、毎秒約200件の検索を受ける。サーバーでの応答の中央値は50ミリ秒を下回り、変更が索引に入るまでの時間の中央値は10秒未満である[^swe-ch17]。

同じ速さを総当たりで出すには約30万のコアが要るという試算がある。今の索引は疎な n-gram の索引を使い、総当たりより500倍を超えて効率がよく、正規表現の検索にも対応する[^swe-ch17]。

## Kythe

定義へ飛ぶ機能や呼び出し元の一覧は、Kythe の相互参照の索引で動く[^swe-ch17]。Kythe は、Google の巨大で多言語の社内のコードに対して意味の上での相互参照の索引を作った経験から生まれた[^kythe]。もとは Grok という社内のプロジェクトで、2008年に Steve Yegge が提案した[^kythe-wikipedia]。

Kythe は公開されており、C++ と Java の索引作成器や、javac・Maven・Bazel などからコンパイルの情報を取り出す部品を持つ[^kythe-site]。[Critique](/sloppedia/critique) の差分の画面でも、Kythe を使って定義へ飛べる。

[^swe-ch17]: 『Software Engineering at Google』「[Code Search](https://abseil.io/resources/swe-book/html/ch17.html)」第17章、2020年。

[^kythe]: Kythe「[Kythe Overview](https://kythe.io/docs/kythe-overview.html)」。2026年11月7日に閲覧。

[^kythe-wikipedia]: 「[Google Kythe](https://en.wikipedia.org/wiki/Kythe)」Wikipedia。2026年11月7日に閲覧。

[^kythe-site]: Kythe「[Kythe](https://kythe.io/)」。2026年11月7日に閲覧。
