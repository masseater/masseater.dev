---
title: "Indra OCR"
description: "Datalab が公開した、CPU だけで速く動く約100万パラメータの OCR モデル。"
tags: ["OCR", "オープンソースソフトウェア", "機械学習"]
published: true
infobox:
  - label: "開発元"
    value: "Datalab"
  - label: "リポジトリ"
    value: "datalab-to/indra"
    href: "https://github.com/datalab-to/indra"
  - label: "最新版"
    value: "1.1.2（2026年10月20日）"
  - label: "パラメータ数"
    value: "主な認識器で約125万"
  - label: "対応言語"
    value: "80以上"
  - label: "ライセンス"
    value: "コードは Apache 2.0、重みは改変した OpenRAIL-M"
---

Indra OCR は、Datalab が公開した、CPU だけで動く OCR モデルである。PDF や画像を Markdown、テキスト、位置の枠付きの JSON に変える。手書きの文字、80以上の言語、どの向きのページも読める。Marker や Surya を作った Vik Paruchuri が率いる Datalab が開発し、2026年10月19日に版1.1を出した[^pypi][^vik]。名前はインド神話の神インドラにちなむ[^pypi]。

## 特徴

主な認識器（ラテン文字用）は約125万パラメータで、既定のモデルをすべて合わせても730万パラメータである。モデルの大きさは約76 MB で、初回の実行時に Hugging Face から取得する。ONNX Runtime で動き、PyTorch と GPU は要らない[^pypi]。

32コアの CPU で毎秒約44ページを処理し、同じ条件で Tesseract の15倍、[PaddleOCR](/sloppedia/paddleocr) の PP-OCR のテキストのモデルの10倍速い。4コアでは1ページ約210ミリ秒である[^pypi]。

Paruchuri は、OmniParseBench で34億パラメータの DeepSeek OCR 2 に4ポイント差まで迫ると告知した[^vik]。

## 性能

OmniParseBench の総合の点は66.7（数式のモデルを使うと71.4）で、PaddleOCR の PP-StructureV3 の58.4を上回る。テキストの点は46.7で、PaddleOCR の PP-OCR の35.8、Tesseract の19.3より高い。手書きの試験の点は25.2%にとどまる[^pypi]。

## 機能

ラテン文字の各言語、ロシア語とキリル文字の各言語、ギリシャ語、中国語、日本語、韓国語、アラビア語、ヘブライ語、ヒンディー語とインドの各言語、タイ語、クメール語などを読む。横倒し、逆さま、45度までの傾き、暗い地の明るい文字にも対応する。各行と各ブロックに枠、見出しや表などの種類、読む順番を付ける。テキストの層がある PDF はそれを読み、欠けた部分だけを OCR する[^pypi]。

## ライセンス

コードは Apache 2.0 である。重みは改変した OpenRAIL-M で、研究、個人の利用、資金調達か売上が2,000万ドル未満のスタートアップには無料だが、Datalab の API と競合する使い方はできない[^pypi]。

[^pypi]: Datalab「[indra-ocr](https://pypi.org/project/indra-ocr/)」PyPI。

[^vik]: Vik Paruchuri「[X への投稿](https://x.com/VikParuchuri/status/2112216762767085883)」X、2026年10月19日。
