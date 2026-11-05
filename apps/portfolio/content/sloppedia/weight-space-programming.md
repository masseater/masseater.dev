---
title: "Weight-Space Programming"
description: "大規模言語モデルが、別のニューラルネットワークの重みを学習なしに直接読み書きする手法。"
tags: ["大規模言語モデル", "機械学習", "解釈可能性", "2026年のソフトウェア"]
published: true
infobox:
  - label: "提唱"
    value: "Rikiya Takehi、Jayden Teoh、Alex Zhang、Omar Khattab（MIT CSAIL）"
  - label: "発表"
    value: "2026年11月2日（ブログ記事）"
  - label: "使ったモデル"
    value: "GPT-6 Astra"
  - label: "査読"
    value: "なし"
---

Weight-Space Programming は、汎用の大規模言語モデルが、別のニューラルネットワークの重みを直接読み書きする手法である。勾配降下法のような最適化を通さず、自然言語で与えた目標に合わせて重みを変える。環境からのフィードバックを一切使わない場合もある[^sparks]。

## 発表

この名前は、2026年11月2日のブログ記事「Sparks of Weight-Space Programming」で付けられた。著者は MIT CSAIL の Rikiya Takehi、Jayden Teoh、Alex Zhang、Omar Khattab である[^sparks]。著者らはこれを論文ではなくブログ記事と位置づけている[^willison]。実験には OpenAI の GPT-6 Astra を使った[^sparks]。

著者らは、深層学習はこれまで Adam や Muon のような小さな記号的な最適化手法に重みを任せてきたと述べた。そのうえで、重みはまもなく、重みについて推論する大規模言語モデルが直接最適化するようになると主張した[^sparks]。

## 実験

記事は8つの実験を、重みを読む、直す、一から書くの3つに分けて報告した[^sparks]。

| 種類 | 内容                                                                                        | 結果                                                     |
| ---- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 読む | PPO で4つのゲームを学習させた同じ形のネットワークの重みだけを見せ、どのゲームかを当てさせる | 選択肢を見せずに4つとも当てた                            |
| 読む | 円、三角、四角を生成する拡散モデルの重みから、何を描くかを当てさせる                        | 3つとも当てたが、塗りつぶしの図形を輪郭として描いた      |
| 読む | 入力層と出力層を外した文字単位の言語モデルから、学習した言語と各ヘッドの役割を当てさせる    | 3つの言語を当て、コピーをするヘッドをすべて見つけた      |
| 直す | 坂を越えられない車の制御のネットワークを直させる                                            | 重みの3.5%を一度で書き換え、1,024回すべてで成功させた    |
| 直す | Qwen3.5-0.8B の数学の力を勾配なしで上げさせる                                               | 重みの0.016%を書き換え、MATH-500 を7.9%から48.1%に上げた |

拡散モデルの図形を輪郭で描いた誤りについて、著者らは、順伝播を計算せずに重みの構造を読んでいる証拠だと解釈した[^sparks]。

Qwen3.5-0.8B の実験では、Astra は Qwen のモデルカードも注意している推論の堂々巡りの原因を重みの中に見つけた。直した重みは、指示に従う力を測る IFEval の値も3倍にした。この実験では、Astra は Python の環境で重みを編集したが、学習のループは書かせていない[^sparks]。

## 反応

Simon Willison は2026年11月3日、論文の形をしたブログ記事だと評した。そのうえで、道具なしで重みを読む話と、コードを使ってほかのモデルを直す話は分けて扱うべきだと書いた。spaCy の作者の Matthew Honnibal がこの2つを混ぜていると批判したことと、Sean Goedecke が Qwen3.5-0.8B の例を人間の研究者と同じ手順だと分析したことも紹介した[^willison]。

Willison 自身は、手元のノート PC で動かした Qwen 3.8 27B でも、ゲームを当てる実験と同じことができたと報告した[^willison]。

[^sparks]: Rikiya Takehi ほか「[Sparks of Weight-Space Programming](https://rikiyat.github.io/blog/weight-space-programming/)」2026年11月2日。

[^willison]: Simon Willison「[Qwen 3.8 27B on my laptop can interpret model weights, too](https://simonwillison.net/2026/Nov/3/qwen-can-interpret-model-weights/)」2026年11月3日。
