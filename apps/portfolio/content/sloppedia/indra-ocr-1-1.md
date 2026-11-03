---
title: "Indra OCR"
description: "Vik Paruchuri が出した、CPU でも速く動く小さな OCR モデル。"
tags: ["OCR"]
published: true
infobox:
  - label: "開発者"
    value: "Vik Paruchuri"
  - label: "版"
    value: "1.1"
  - label: "パラメータ数"
    value: "100万"
  - label: "対応言語"
    value: "80以上"
---

**Indra OCR** は、Marker や Surya を作った Vik Paruchuri が出した OCR モデルである。版 1.1 の公開は X で告知された[^vik]。

## 特徴

版 1.1 は100万パラメータの小さなモデルで、CPU でも毎秒44ページを処理する。OmniParseBench では、34億パラメータの DeepSeek OCR 2 に4ポイント差まで迫る。80以上の言語と手書きの文字に対応している[^vik]。

[^vik]: Vik Paruchuri「[X への投稿](https://x.com/VikParuchuri/status/2112216762767085883)」X。
