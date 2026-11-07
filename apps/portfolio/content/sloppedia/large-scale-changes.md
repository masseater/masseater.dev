---
title: "大規模変更（Google）"
description: "Google で、論理的には1つでも1回のコミットには収まらない、リポジトリ全体に及ぶ変更。Rosie が持ち主ごとに分け、それぞれにレビューとテストを通させる。"
tags: ["Google", "リファクタリング", "モノレポ"]
published: true
infobox:
  - label: "略称"
    value: "LSC（Large-Scale Change）"
  - label: "道具"
    value: "Rosie、ClangMR、Refaster"
  - label: "変更に占める割合"
    value: "プロジェクトによって10〜20%"
  - label: "自動化の目安"
    value: "500か所を超える編集"
---

大規模変更（LSC）は、Google で、論理的には関係しているのに1つの原子的な単位としては入れられない変更の集まりを指す[^swe-ch22]。古い API の置き換え、コンパイラの更新、悪い書き方の一掃などが当たる。

## 種類

『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』は、大規模変更を次のように分けている[^swe-ch22]。

| 種類                    | 例                                     |
| ----------------------- | -------------------------------------- |
| 悪い書き方の一掃        | 全社で見つかった誤りやすい書き方を直す |
| 非推奨の API の置き換え | 古い関数の呼び出しを新しいものに替える |
| 基盤の更新              | コンパイラの版を上げる                 |
| システムの移行          | ある仕組みから別の仕組みへ移る         |

プロジェクトによっては、全変更の10〜20%を大規模変更が占める[^swe-ch22]。

## なぜ1回で入れないか

単一のリポジトリなら、理屈の上では全社の変更を1回のコミットで入れられる。実際には、変更が大きいほど、入れる前にほかの変更とぶつかる。テストのどれかが落ちる確率も上がる。何千人もの持ち主の承認を1つの変更で集めるのも難しい[^swe-ch22]。

## Rosie

[Rosie](/sloppedia/rosie) は、大きな変更をプロジェクトと持ち主ごとに分ける道具である。分けた1つひとつが、それぞれ原子的にコミットできる[^swe-ch22]。それぞれの変更は [TAP](/sloppedia/google-tap) の「トレイン」でテストされる[^swe-ch22]。

1. 3時間ごとに、変更ごとに無作為な1,000件のテストを走らせる。
2. 通った変更を1つにまとめる。
3. まとめた変更に影響するテストをすべて走らせる。
4. 不安定でない失敗があれば、変更ごとに走らせ直す。
5. 結果を報告する。

変更を書き換えるための道具として、ClangMR、JavacFlume、Refaster がある[^swe-ch22]。

## 手順

大規模変更は、委員会の承認を受けてから始める。変更を作り、分けた変更の進み具合を管理し、最後に片付けをする[^swe-ch22]。分けた変更のレビューの多くは、リポジトリ全体の承認の権限を持つ人が引き受ける[^swe-ch22]。書籍は、500か所を超える編集なら自動化に値すると目安を示している[^swe-ch22]。

## 事例

C++ の `scoped_ptr` を `std::unique_ptr` に置き換えたときは、50万を超える参照を直した。最も多い日には、700を超える変更で1万5,000のファイルを書き換えた[^swe-ch22]。

Operation RoseHub では、Apache Commons の脆弱性への対応として、50人を超える人が GitHub の外部のプロジェクトに2,600を超えるパッチを送った[^swe-ch22]。

## 難しさ

大規模変更の難しさの多くは、[ハイラムの法則](/sloppedia/hyrums-law)から来る。利用者が多いほど、約束していない振る舞いに頼るコードがどこかにある[^swe-ch1]。2025年には、Google が AI を使って大規模な移行を速めた事例を報告している。[Google の AI によるコーディング](/sloppedia/google-ai-assisted-coding)を参照。

[^swe-ch1]: 『Software Engineering at Google』「[What Is Software Engineering?](https://abseil.io/resources/swe-book/html/ch01.html)」第1章、2020年。

[^swe-ch22]: 『Software Engineering at Google』「[Large-Scale Changes](https://abseil.io/resources/swe-book/html/ch22.html)」第22章、2020年。
