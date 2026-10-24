import { Option } from "effect";
import { describe, expect, test } from "vite-plus/test";

import type { Entry } from "#/entities/entry";

import { tagCounts, withTag } from "./tag-filter";

const entry = (slug: string, tags: readonly string[]): Entry => ({
  category: "blogs",
  slug,
  title: slug,
  description: "",
  date: "2026-10-24",
  tags,
  status: "published",
});

const both = entry("a", ["OSS", "CI"]);

const entries = [both, entry("b", ["OSS"]), entry("c", [])];

describe("tagCounts", () => {
  test("件数の多い順、同数なら名前順に並ぶ", () => {
    expect(tagCounts(entries)).toStrictEqual([
      { tag: "OSS", count: 2, search: { tag: "OSS" } },
      { tag: "CI", count: 1, search: { tag: "CI" } },
    ]);
  });
});

describe("withTag", () => {
  test("タグを持つ記事だけを残す", () => {
    expect(withTag(Option.some("CI"))(entries)).toStrictEqual([both]);
  });

  test("タグがなければすべて残す", () => {
    expect(withTag(Option.none())(entries)).toBe(entries);
  });
});
