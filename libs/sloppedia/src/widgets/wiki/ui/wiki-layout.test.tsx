import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";

import { BODY, config } from "#/entities/article/model/article.test.support.ts";

import { WikiLayout } from "./wiki-layout.tsx";

test("レイアウトは basePath とホームへのリンクを持つ", () => {
  const html = renderToStaticMarkup(<WikiLayout config={config}>{BODY}</WikiLayout>);
  expect(html).toContain('href="/wiki"');
  expect(html).toContain('href="/"');
  expect(html).toContain("Testpedia の案内");
});
