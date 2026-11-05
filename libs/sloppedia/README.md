# sloppedia

Markdown で書いた記事を、Wikipedia に似た百科事典の見た目で出す React の部品である。[Sloppedia](https://masseater.dev/sloppedia/) がこれで動いている。

記事のページには Infobox・目次・カテゴリ・最終更新日が付く。メインページとカテゴリ一覧の部品もある。部品はルーターに依存しない。記事の読み込みと Markdown の変換は使う側が受け持つ。

## 入れ方

```sh
npm install sloppedia effect react
```

React 19、Tailwind CSS 4、Effect 4 が要る。Tailwind の CSS で `sloppedia/styles.css` を読み込むと、色と本文の体裁が入る。

```css
@import "tailwindcss";
@import "sloppedia/styles.css";
```

## 使い方

`defineSloppedia` で名前と置き場所を決め、その設定を各部品に渡す。

```tsx
import { ArticleView, WikiLayout, defineSloppedia, githubSource, headingsOf } from "sloppedia";

const wiki = defineSloppedia({
  name: "Sloppedia",
  tagline: "趣味嗜好に偏った個人の百科事典もどき",
  basePath: "/sloppedia",
  home: { label: "トップ", href: "/" },
  ...githubSource({ repository: "https://github.com/me/site", directory: "content/wiki" }),
});

const Page = ({ article, module }) => (
  <WikiLayout config={wiki}>
    <ArticleView article={article} config={wiki} headings={headingsOf(module.tableOfContents)}>
      <module.default />
    </ArticleView>
  </WikiLayout>
);
```

`MainView` と `CategoriesView` は記事の一覧を受け取り、メインページとカテゴリ一覧を描く。

## 記事

記事は frontmatter を持つ Markdown である。`Frontmatter` がその Effect Schema で、`title`・`description`・`date`・`updated`・`published` を必ず書く。`tags` はカテゴリになり、`infobox` は `label` と `value`（任意で `href`）の並びである。

```yaml
---
title: 記事の名前
description: 一覧に出る説明
date: 2026-11-03
updated: 2026-11-03
published: true
tags: [カテゴリ]
infobox:
  - label: 種類
    value: 例
---
```

Vite では、`remark-mdx-frontmatter` が export する `frontmatter` を `import.meta.glob` で集めて `articlesOf` に渡す。すると、ファイル名を slug にした公開済みの記事が新しい順に返る。

```ts
const articles = articlesOf(
  import.meta.glob("/content/wiki/*.md", { eager: true, import: "frontmatter" }),
);
```

目次は、MDX を `rehype-slug` と `@stefanprobst/rehype-extract-toc` で変換して出る `tableOfContents` を `headingsOf` に渡して作る。脚注は `remark-gfm` のものに体裁が付く。

## リンク

部品のリンクは既定では `<a>` である。ルーターのリンクを使うときは `link` に部品を渡す。部品は行き先を表す `target` と、既定の `href` を受け取る。

```tsx
const wiki = defineSloppedia({
  ...options,
  link: ({ href, className, children }) => (
    <RouterLink className={className} to={href}>
      {children}
    </RouterLink>
  ),
});
```

文言は日本語が既定で、`labels` で差し替えられる。日付の書式は `locale` で決まる。

## ライセンス

MIT
