import { Record } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { works } from "./works.ts";

const labs = "../../../../../labs";

const pages = import.meta.glob("../../../../../labs/pages/nikogori/*/index.html");

const thumbnails = import.meta.glob("../../../../../labs/public/nikogori/*/thumb.webp");

describe("nikogori", () => {
  test.each(works)("$slug のページが labs にある", ({ slug }) => {
    expect(Record.has(pages, `${labs}/pages/nikogori/${slug}/index.html`)).toBe(true);
  });

  test.each(works)("$slug のサムネイルが labs にある", ({ slug }) => {
    expect(Record.has(thumbnails, `${labs}/public/nikogori/${slug}/thumb.webp`)).toBe(true);
  });

  test("labs の絵はすべて一覧に載っている", () => {
    expect(Record.size(pages)).toBe(works.length);
  });
});
