---
title: masseater.dev をポートフォリオとして作り直した
description: 名前を表示するだけだったトップページを、作ったものや記事を置くサイトに作り直した。
date: 2026-10-12
tags: [masseater.dev]
published: true
---

これまでの masseater.dev は、名前とリンクを表示するだけのページだった。
作ったものや書いたものを一か所にまとめたくなったので、ポートフォリオとして作り直した。

## カテゴリ

Projects には作ったものを、Blogs にはまとまった文章を置く。
Scraps は短いメモや作業ログの置き場である。
Zenn に書いていた記事も、このサイトの Zenn セクションに移す。

## 書き方

記事はすべてリポジトリ内の Markdown ファイルで、CMS は使わない。
`apps/web/content/<カテゴリ>/<slug>.md` を置けば、そのまま一覧と詳細ページ、RSS に載る。
frontmatter の `published` を `false` にすると、本番には出ず手元の開発サーバーでだけ表示される。
