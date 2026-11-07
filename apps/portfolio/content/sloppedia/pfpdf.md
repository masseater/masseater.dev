---
title: "pfpdf"
description: "Preferred Networks が公開した、Markdown の文書をコマンド1つで日本語の PDF にする CLI ツール。"
tags: ["Markdown", "PDF", "オープンソースソフトウェア"]
published: true
infobox:
  - label: "開発元"
    value: "Preferred Networks"
  - label: "作者"
    value: "いもす"
  - label: "リポジトリ"
    value: "pfnet-research/pfpdf"
    href: "https://github.com/pfnet-research/pfpdf"
  - label: "公開"
    value: "2026年10月28日"
  - label: "種別"
    value: "Markdown から PDF を作る CLI ツール"
  - label: "中身"
    value: "Vivliostyle CLI、Chromium"
---

pfpdf は、[Preferred Networks](/sloppedia/preferred-networks)（PFN）が2026年10月にオープンソースとして公開した、Markdown で書いた文書をコマンド1つで日本語の PDF にする CLI ツールである。PFN のエンジニアのいもすが作った。文書の中身は Markdown と [Git](/sloppedia/git) で管理し、配布用の PDF はコマンドで作り直す、という使い方を想定している[^pfn]。

## 背景

いもすは、コーディングエージェントの進化で、Google Docs や Word より Markdown で書くほうが都合の良い場面が増えたと述べる。一方で Markdown には決まったレンダリングの道具が無く、そのまま顧客や利用者に渡せないことが作った動機である[^pfn]。

## 使い方

frontmatter に題名と著者とテンプレートを書いた Markdown のファイルを用意する。ファイルを入れたディレクトリでもよい。それを指定して `npx @pfnet-research/pfpdf@latest --input report.md --output report.pdf` のように実行する[^pfn]。

## 機能

GitHub Flavored Markdown の表やリスト、日本語の強調、数式、コードのハイライト、アンダースコア3個以上での改ページに対応する。BibTeX 形式の参考文献から引用と文献の一覧を作れる。テンプレートは7種類を同梱している[^pfn]。

## 仕組み

内部では Markdown を HTML に変え、[Vivliostyle](/sloppedia/vivliostyle) CLI と Chromium で PDF に組版する。Chromium は初回の実行時に自動で取得してキャッシュする。そのため最初に数百 MB を通信する場合がある[^pfn]。

環境によって日本語のフォントの有無や字形が変わると、見た目や改ページが変わる。pfpdf は再配布できるライセンスのフォントを同梱し、標準では OS のフォントに頼らない。数式やハイライトの資源も同梱しているため、組み込みの機能だけの文書なら、必要なものを一度取得した後はオフラインで変換できる[^pfn]。

[^pfn]: いもす「[MarkdownからきれいなPDFを作るCLIツールpfpdfを公開しました](https://www.preferred.jp/ja/blog/tech/1798)」Preferred Networks、2026年10月28日。
