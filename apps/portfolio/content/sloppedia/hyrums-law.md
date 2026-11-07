---
title: "ハイラムの法則"
description: "API の利用者が十分に多ければ、契約で何を約束したかに関係なく、観察できる振る舞いはすべて誰かに頼られるという経験則。Google の Hyrum Wright にちなむ。"
tags: ["Google", "ソフトウェア開発", "API"]
published: true
infobox:
  - label: "英語名"
    value: "Hyrum's Law"
  - label: "名前の由来"
    value: "Hyrum Wright（Google）"
  - label: "主な出典"
    value: "Software Engineering at Google 第1章"
---

ハイラムの法則は、API の利用者が十分に多ければ、契約で何を約束したかに関係なく、システムの観察できる振る舞いはすべて誰かに頼られるという経験則である[^swe-ch1]。Google のソフトウェアエンジニアの Hyrum Wright にちなんで名付けられた。Wright は『[Software Engineering at Google](/sloppedia/software-engineering-at-google)』の編者の1人でもある[^swe-book]。

## 例

書籍は、ハッシュの表を順にたどったときの順番を例に挙げる[^swe-ch1]。多くの言語は、ハッシュの表の要素がどの順で出てくるかを約束していない。それでも、利用者が多ければ、その順番がたまたま同じであることに頼るコードがどこかに書かれる。ハッシュの関数を替えて順番が変わると、そのコードが壊れる。

## なぜ重要か

書籍は、ソフトウェアエンジニアリングを「時間で積分したプログラミング」と定義している[^swe-ch1]。コードを長く使うほど利用者は増え、約束していない振る舞いへの依存が溜まる。その結果、仕様の上では許されている変更でも、実際には誰かを壊す。

同じ章には「『賢い』が褒め言葉ならプログラミングで、非難ならソフトウェアエンジニアリングだ」という言い回しもある[^swe-ch1]。目先の工夫が、後で変えられない依存を生むからである。

## Google での扱い

Google の単一のリポジトリでは、ある API の利用者をすべて見つけ出せる。ハイラムの法則が当てはまるとしても、変える側が利用者を探して直せる。[大規模変更](/sloppedia/large-scale-changes)は、この前提で全社のコードを書き換える[^swe-ch22]。

それでも、基盤を変えたせいで製品が壊れたときに誰の落ち度とするかの決まりは要る。書籍は「ビヨンセ・ルール」として、壊されたくないものには CI のテストを書いておけと定めている[^swe-ch1]。テストが無かったなら、壊れた責任は基盤の側には無い。

## 計算機の資源

ハイラムの法則は API に限らない。2011年に Google の機械でプロセス ID を使い果たす事故が起きた。書籍は、この事故の説明でもハイラムの法則に触れている[^swe-ch25]。

[^swe-book]: Titus Winters、Tom Manshreck、Hyrum Wright 編『[Software Engineering at Google](https://abseil.io/resources/swe-book)』O'Reilly、2020年。

[^swe-ch1]: 『Software Engineering at Google』「[What Is Software Engineering?](https://abseil.io/resources/swe-book/html/ch01.html)」第1章、2020年。

[^swe-ch22]: 『Software Engineering at Google』「[Large-Scale Changes](https://abseil.io/resources/swe-book/html/ch22.html)」第22章、2020年。

[^swe-ch25]: 『Software Engineering at Google』「[Compute as a Service](https://abseil.io/resources/swe-book/html/ch25.html)」第25章、2020年。
