import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import {
  BODY,
  NO_HEADINGS,
  article,
  config,
} from "#/entities/article/model/article.test.support.ts";

import { ArticleView } from "./article-view.tsx";

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
