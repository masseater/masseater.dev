import { Option, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { MemoView } from "./view.ts";

const decode = Schema.decodeUnknownOption(MemoView);

const week = [
  { type: "Headline", text: "監査の定期タスクを4つにまとめた週" },
  {
    type: "Point",
    theme: "CI",
    text: "全 PR がマージキューを通るようになった",
    days: "水",
    detail: [
      { type: "Links", items: [{ label: "#1435", href: "https://github.com/x/y/pull/1435" }] },
    ],
  },
  {
    type: "Fold",
    label: "決めたこと・持ち越し",
    children: [{ type: "Section", title: "決めたこと", children: [{ type: "Text", text: "…" }] }],
  },
];

describe("メモの表示の形", () => {
  it("入れ子になった部品の木を受け取る", () => {
    expect(decode(week)).toStrictEqual(Option.some(week));
  });

  it("知らない部品を拒む", () => {
    expect(Option.isNone(decode([{ type: "Chart", data: [] }]))).toBe(true);
  });

  it("https 以外のリンクを拒む", () => {
    const view = [{ type: "Links", items: [{ label: "x", href: "http://example.com" }] }];
    expect(Option.isNone(decode(view))).toBe(true);
  });
});
