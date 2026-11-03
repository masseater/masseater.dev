import { Effect } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { articlesOf } from "./article.ts";

const frontmatter = (title: string, date: string, published: boolean): unknown => ({
  title,
  description: `${title} の説明`,
  date,
  updated: date,
  published,
});

const frontmatters = {
  "/content/wiki/older.md": frontmatter("古い記事", "2026-01-01", true),
  "/content/wiki/draft.mdx": frontmatter("下書き", "2026-03-01", false),
  "/content/wiki/newer.mdx": frontmatter("新しい記事", "2026-02-01", true),
};

const malformed = { "a.md": frontmatter("記事", "2026/01/01", true) };

describe("articlesOf", () => {
  test("ファイル名を slug にし、公開済みの記事を新しい順に並べる", () =>
    expect(Effect.runPromise(articlesOf(frontmatters))).resolves.toStrictEqual([
      {
        slug: "newer",
        title: "新しい記事",
        description: "新しい記事 の説明",
        date: "2026-02-01",
        updated: "2026-02-01",
        tags: [],
        infobox: [],
      },
      {
        slug: "older",
        title: "古い記事",
        description: "古い記事 の説明",
        date: "2026-01-01",
        updated: "2026-01-01",
        tags: [],
        infobox: [],
      },
    ]));

  test("日付の形が違う frontmatter は失敗にする", () =>
    expect(Effect.runPromise(articlesOf(malformed))).rejects.toThrow());
});
