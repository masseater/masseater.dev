import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vite-plus/test";

import { ArticleView } from "./article-view.tsx";
import type { Article } from "./article.ts";
import { CategoriesView } from "./categories-view.tsx";
import { defineSloppedia, githubSource } from "./config.ts";
import type { Heading } from "./headings.ts";
import { WikiLayout } from "./wiki-layout.tsx";

const config = defineSloppedia({
  name: "Testpedia",
  tagline: "試しの百科事典",
  basePath: "/wiki",
  home: { label: "トップ", href: "/" },
  ...githubSource({ repository: "https://github.com/example/site", directory: "content" }),
});

const BODY = "本文";

const NO_HEADINGS: readonly Heading[] = [];

const article: Article = {
  slug: "hello",
  title: "ハロー",
  description: "挨拶",
  date: "2026-01-01",
  updated: "2026-01-02",
  tags: ["挨拶"],
  infobox: [{ label: "種類", value: "挨拶" }],
};

const ARTICLES: readonly Article[] = [article];

describe("views", () => {
  test("レイアウトは basePath とホームへのリンクを持つ", () => {
    const html = renderToStaticMarkup(<WikiLayout config={config}>{BODY}</WikiLayout>);
    expect(html).toContain('href="/wiki"');
    expect(html).toContain('href="/"');
    expect(html).toContain("Testpedia の案内");
  });

  test("記事は本文・Infobox・カテゴリ・ソースへのリンクを出す", () => {
    const html = renderToStaticMarkup(
      <ArticleView article={article} config={config} headings={NO_HEADINGS}>
        <p>{BODY}</p>
      </ArticleView>,
    );
    expect(html).toContain("<p>本文</p>");
    expect(html).toContain("<caption");
    expect(html).toContain(`href="/wiki/categories#${encodeURIComponent("挨拶")}"`);
    expect(html).toContain('href="https://github.com/example/site/blob/main/content/hello.md"');
    expect(html).toContain("2026年1月2日");
  });

  test("カテゴリ一覧はタグごとに記事を並べる", () => {
    const html = renderToStaticMarkup(<CategoriesView articles={ARTICLES} config={config} />);
    expect(html).toContain('id="挨拶"');
    expect(html).toContain("1 本");
    expect(html).toContain('href="/wiki/hello"');
  });
});
