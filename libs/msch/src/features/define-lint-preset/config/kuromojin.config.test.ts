import { expect, test } from "vite-plus/test";

import { KUROMOJIN, requireWithY8Kuromojin } from "./kuromojin.config.ts";

test("textlint rules that require kuromojin get the y8 tokenizer", () => {
  const required = requireWithY8Kuromojin(import.meta.url);
  expect(required.resolve(KUROMOJIN)).toMatch(/y8/u);
});
