---
title: Markdown をビルド時に React コンポーネントへ変換する
description: masseater.dev の記事を MDX の Vite プラグインで変換している理由のメモ。
date: 2026-10-12
tags: [MDX, Vite]
published: true
---

記事の Markdown は `@mdx-js/rollup` でビルド時に React コンポーネントへ変換している。
実行時に Markdown を解釈しないので、Workers で動くコードが軽く済む。

frontmatter は `remark-mdx-frontmatter` で named export にして、Effect Schema で検証する。
コードのハイライトは Shiki をビルド時に通すので、ブラウザには色付き済みの HTML だけが届く。
