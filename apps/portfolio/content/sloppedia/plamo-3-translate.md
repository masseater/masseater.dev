---
title: "PLaMo 3 Translate"
description: "Preferred Networks が開発し、2026年11月にオープンウェイトで公開した翻訳特化型の大規模言語モデル。"
tags: ["大規模言語モデル", "機械翻訳", "Preferred Networks", "2026年のソフトウェア"]
published: true
infobox:
  - label: "開発"
    value: "Preferred Networks"
  - label: "公開"
    value: "2026年11月5日（オープンウェイト）"
  - label: "サイズ"
    value: "0.8B、2B、8B、31B"
  - label: "対応言語"
    value: "53言語"
  - label: "基盤モデル"
    value: "PLaMo 3 NICT"
  - label: "ライセンス"
    value: "PLaMo コミュニティライセンス"
  - label: "配布先"
    value: "Hugging Face"
    href: "https://huggingface.co/pfnet/plamo-3-translate-8b"
---

PLaMo 3 Translate は、[Preferred Networks](/sloppedia/preferred-networks)（PFN）が開発した翻訳特化型の大規模言語モデルである。PFN の翻訳サービス「PLaMo翻訳」で使われているモデルで、2026年11月5日にオープンウェイトで公開された[^pfn-release]。

## 開発

基盤は、PFN と、国の研究機関の NICT の共同研究で作った事前学習モデル PLaMo 3 NICT である[^pfn-release]。PFN はこれに翻訳向けのデータを数百億トークン追加で学習させた[^hf-8b]。

## モデル

サイズは0.8B、2B、8B、31B の4つがある。最小の0.8B は、ネットにつながっていない機内モードのスマートフォンで翻訳を動かす例が示された[^pfn-release]。

各サイズに BF16 の重みのほか、FP8、W4A16、W4AFP8、NVFP4 の量子化版と、GGUF 形式と MLX 形式の変換版がある。量子化で精度が大きく落ちるのは、一部の指標での GGUF の Q2_K だけだとされる[^hf-8b]。

53言語の間で翻訳できる。学習時の最大長は、入力と出力の合計で32,768トークンだった[^hf-8b]。

## 機能

原文の前後の文脈を参考として与えられる。用語集で固有名詞や専門用語の訳も指定できる。日本語に訳すときは、です・ます調とだ・である調を選べる[^pfn-release]。

## 性能

PFN の比較では、最小のモデルでも Google の TranslateGemma と Tencent の Hy-MT2 を上回った[^pfn-release]。モデルカードは、2B のモデルが比べた翻訳特化型モデルをすべての指標で上回ったと書いている。日英の翻訳は PFTB、SaaS、WMT24++ で COMET-22 を測り、多言語の翻訳は FLORES+ で chrF++ を測った[^hf-8b]。これらの評価には PFN 自身のベンチマークが含まれる[^pfn-release]。

## ライセンス

PLaMo コミュニティライセンスで配られる。学習や趣味の利用と、学術を含む非商用の利用は、事前の登録なしに無償で使える[^hf-8b]。直近の事業年度の売上が10億円未満の企業と個人は、商用でも無償で使える。それを超える商用の利用には、PFN との商用ライセンスの契約が要る[^pfn-release]。

PFN は公開の目的として、PLaMo を広く知ってもらうことと、端末で動かす LLM を通じたオープンイノベーションを挙げた[^pfn-release]。

[^pfn-release]: Preferred Networks「[PFN、世界最高水準のAI翻訳がエッジで可能な大規模言語モデル PLaMo 3 Translate をオープンウェイトで公開](https://www.preferred.jp/ja/news/pr20261105)」2026年11月5日。

[^hf-8b]: Preferred Networks「[PLaMo 3 Translate 8B](https://huggingface.co/pfnet/plamo-3-translate-8b)」Hugging Face。2026年11月5日に閲覧。
