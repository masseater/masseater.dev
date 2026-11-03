---
title: "pfpdf"
description: "Preferred Networks が公開した、Markdown の文書をコマンド1つで日本語の PDF にする CLI ツール。"
tags: ["Markdown", "PDF", "オープンソースソフトウェア"]
published: true
infobox:
  - label: "開発元"
    value: "Preferred Networks"
  - label: "種別"
    value: "Markdown から PDF を作る CLI ツール"
  - label: "中身"
    value: "Vivliostyle CLI、Chromium"
---

pfpdf は、Preferred Networks（PFN）が公開した、Markdown で書いた文書をコマンド1つで顧客に渡せる日本語の PDF にする CLI ツールである[^pfn]。

## 仕組み

中身は Vivliostyle CLI と Chromium である。フォントを同梱しているので、OS に入っているフォントに出来上がりが左右されない[^pfn]。

## 機能

数式、コードのハイライト、BibTeX による引用に対応している。テンプレートは7種類ある[^pfn]。

[^pfn]: Preferred Networks「[MarkdownからきれいなPDFを作るCLIツールpfpdfを公開しました](https://www.preferred.jp/ja/blog/tech/1798)」Preferred Networks。
