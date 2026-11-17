import { createRequire } from "node:module";

import { expect, test } from "vite-plus/test";

import "./kuromojin.config.ts";

test("textlint rules that require kuromojin get the y8 tokenizer", () => {
  const required = createRequire(import.meta.url);
  expect(required.resolve("kuromojin")).toMatch(/y8/u);
});
