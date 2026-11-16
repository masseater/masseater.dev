import { Record } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { songs } from "./songs.ts";

const labs = "../../../../../labs";

const pages = import.meta.glob("../../../../../labs/pages/ai-produced/*/index.html");

const thumbnails = import.meta.glob("../../../../../labs/public/ai-produced/*/thumb.webp");

describe("ai-produced", () => {
  test.each(songs)("$slug のページが labs にある", ({ slug }) => {
    expect(Record.has(pages, `${labs}/pages/ai-produced/${slug}/index.html`)).toBe(true);
  });

  test.each(songs)("$slug のサムネイルが labs にある", ({ slug }) => {
    expect(Record.has(thumbnails, `${labs}/public/ai-produced/${slug}/thumb.webp`)).toBe(true);
  });

  test("labs の曲はすべて一覧に載っている", () => {
    expect(Record.size(pages)).toBe(songs.length);
  });
});
