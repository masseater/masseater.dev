import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { ARTICLES, config } from "#/entities/article/model/article.test.support.ts";

import { CategoriesView } from "./categories-view.tsx";

test("カテゴリ一覧はタグごとに記事を並べる", () => {
  const html = renderToStaticMarkup(<CategoriesView articles={ARTICLES} config={config} />);
  expect(html).toContain('id="挨拶"');
  expect(html).toContain("1 本");
  expect(html).toContain('href="/wiki/hello"');
});
