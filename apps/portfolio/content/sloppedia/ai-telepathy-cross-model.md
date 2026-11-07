---
title: "Swarm Telepathy"
description: "別の系統の大規模言語モデルどうしで KV キャッシュを直接渡し、文章を介さずに通信させる手法。SwaT と略す。"
tags: ["大規模言語モデル", "マルチエージェントシステム", "論文"]
published: true
infobox:
  - label: "論文"
    value: "Swarm Telepathy: Prefill-Free KV-Cache Transfer Across Families"
    href: "https://arxiv.org/abs/2610.15095"
  - label: "著者"
    value: "Abdulrahman Alabdulkareem、Irene Tenison、Yang Zhang、Yada Zhu、Boris Katz、Dan Gutfreund"
  - label: "公開"
    value: "2026年10月10日（arXiv）"
  - label: "略称"
    value: "SwaT"
---

Swarm Telepathy（SwaT）は、大規模言語モデル（LLM）のエージェントどうしが、文章ではなく [KV キャッシュ](/sloppedia/kv-cache)を直接渡して通信する手法である。系統の違うモデルの間でも、受け手が文章を読み込み直さずに済む。Abdulrahman Alabdulkareem らが2026年10月に arXiv で論文を公開した[^paper]。日本では AIDB が、MIT の研究者らによる AI 同士の「テレパシー」として紹介した[^aidb]。

## 背景

LLM のマルチエージェントシステムでは、あるエージェントが調べた結果を文章にまとめ、別のエージェントがそれを読む。論文は、通信が離散的なトークンに縛られ、受け手が同じ内容を計算し直す無駄が生じる点を問題にしている[^paper]。

KV キャッシュを LLM の間で渡す先行研究はあったが、同じ系統のモデルに限られるか、受け手が文章を読み込み直す prefill を必要としていた[^paper]。

## 仕組み

SwaT は、送り手のモデルの KV キャッシュを、別の系統の受け手のモデルが使える形に変換して渡す。送り手と受け手のモデルはどちらも凍結したままで追加学習せず、学習に要るのは5,000万トークン未満と GPU 1台で1日未満である[^paper]。

## 結果

KV キャッシュを圧縮する最近の手法と組み合わせると、エージェント間の通信で、文章どうしのやり取りより正確さが平均40%高く、経過時間が平均で4分の1になった。6つの系統の12個の LLM で、17のベンチマークを試した[^paper]。

AIDB は、Meta の Llama 3 から Alibaba の Qwen 3、Google の Gemma 3 から IBM の Granite 3 のように、別の会社のモデルの組み合わせを例に挙げている[^aidb]。

送り手に画像を読める視覚言語モデルを使うと、文章しか読めない受け手のモデルに視覚の能力を渡せた。SwaT は文章だけで学習したにもかかわらず、画像の内容を文章で説明して渡すより成績が良かった[^paper]。

[^paper]: Abdulrahman Alabdulkareem ほか「[Swarm Telepathy: Prefill-Free KV-Cache Transfer Across Families](https://arxiv.org/abs/2610.15095)」arXiv、2026年10月10日。

[^aidb]: AIDB「[X への投稿](https://x.com/ai_database/status/2115422104657281392)」X、2026年10月28日。
