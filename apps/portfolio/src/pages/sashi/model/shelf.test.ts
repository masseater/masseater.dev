import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { shelfOf } from "./shelf.ts";

test("種類の名前をタグにし、リンクのホスト名を添える", () => {
  expect(
    shelfOf([
      {
        slug: "quiet-site",
        title: "静かなサイト",
        kind: "site",
        url: "https://example.com/path",
        at: "0:12-0:20",
        note: "余白が広い",
        date: "2026-11-28",
      },
    ]),
  ).toStrictEqual([
    {
      slug: "quiet-site",
      title: "静かなサイト",
      note: "余白が広い",
      tags: ["サイト"],
      link: Option.some("https://example.com/path"),
      facts: ["0:12-0:20", "example.com"],
    },
  ]);
});

test("リンクのない概念はリンクも添え書きも持たない", () => {
  expect(
    shelfOf([{ slug: "ma", title: "間", kind: "concept", note: "効く", date: "2026-11-27" }]),
  ).toStrictEqual([
    {
      slug: "ma",
      title: "間",
      note: "効く",
      tags: ["概念・用語"],
      link: Option.none(),
      facts: [],
    },
  ]);
});
