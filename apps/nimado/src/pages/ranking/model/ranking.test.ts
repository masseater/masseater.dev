import { DayViews, Table } from "@masseater.dev/nimado";
import { Array as Arr, Option, Schema, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { windowOf } from "./period";
import { gains, growth, rank, totals } from "./ranking";
import type { Ranked } from "./ranking";
import { rankingSearch, usableSearch } from "./search";

const decodeTable = Schema.decodeUnknownOption(Schema.fromJsonString(Table));
const decodeDay = Schema.decodeUnknownOption(Schema.fromJsonString(DayViews));

const day = (text: string): typeof DayViews.Type =>
  pipe(
    decodeDay(text),
    Option.getOrElse(() => []),
  );

const rows = pipe(
  decodeTable(`[
  [1, "A", "P1", "Original", "2010-01-01", 500000, 100000],
  [2, "B", "P2", "Original", "2020-01-01", 20000, 900000],
  [3, "C", "P3", "Cover", "2021-01-01", 80000, 70000],
  [4, "D", "P4", "Original", "2022-01-01", null, 40000]
]`),
  Option.getOrElse(() => []),
);

const names = (entries: readonly Ranked[]): readonly string[] =>
  pipe(
    entries,
    Arr.map(({ name }) => name),
  );

describe("rank", () => {
  it("YouTube の再生数順に並べ、値の無い曲は外す", () => {
    const ranked = rank({ entries: totals(rows), sort: "youtube", kind: "all", query: "" });
    expect(names(ranked)).toStrictEqual(["B", "A", "C", "D"]);
  });

  it("YouTube が多い順と、ニコニコが多い順の両方に並べられる", () => {
    const entries = totals(rows);
    expect(names(rank({ entries, sort: "youtube-lead", kind: "all", query: "" }))).toStrictEqual([
      "B",
      "C",
      "A",
    ]);
    expect(names(rank({ entries, sort: "nico-lead", kind: "all", query: "" }))).toStrictEqual([
      "A",
      "C",
      "B",
    ]);
  });

  it("オリジナルだけに絞り、曲名か作者で探せる", () => {
    const entries = totals(rows);
    expect(names(rank({ entries, sort: "nico", kind: "original", query: "" }))).toStrictEqual([
      "A",
      "B",
    ]);
    expect(names(rank({ entries, sort: "youtube", kind: "all", query: "p3" }))).toStrictEqual([
      "C",
    ]);
  });
});

describe("usableSearch", () => {
  it("YouTube の値が無い間は、どの並び順を選んでもニコニコの再生数順にする", () => {
    expect(
      usableSearch({ search: rankingSearch({ sort: "nico-lead", period: "7" }), youtube: false }),
    ).toStrictEqual(rankingSearch({ sort: "nico", period: "7" }));
  });
});

describe("growth", () => {
  it("両方の日に値がある曲だけ、その間に増えた再生数で並べる", () => {
    const nico = gains({
      start: day("[[1, 400000], [2, 10000]]"),
      end: day("[[1, 500000], [2, 20000], [3, 80000]]"),
    });
    const youtube = gains({
      start: day("[[2, 600000]]"),
      end: day("[[2, 900000]]"),
    });
    const entries = growth({ rows, nico, youtube });
    expect(names(rank({ entries, sort: "nico", kind: "all", query: "" }))).toStrictEqual([
      "A",
      "B",
    ]);
    expect(names(rank({ entries, sort: "youtube-lead", kind: "all", query: "" }))).toStrictEqual([
      "B",
    ]);
  });
});

describe("windowOf", () => {
  it("決まった長さの期間は最新の日で終わる", () => {
    expect(
      windowOf({
        search: rankingSearch({ period: "7" }),
        dates: ["2026-11-01", "2026-11-09", "2026-11-02"],
      }),
    ).toStrictEqual(Option.some({ start: "2026-11-02", end: "2026-11-09" }));
  });

  it("期間指定で日を選んでいなければ、ある日の最初から最後までにする", () => {
    expect(
      windowOf({
        search: rankingSearch({ period: "custom" }),
        dates: ["2026-11-05", "2026-11-01", "2026-11-09"],
      }),
    ).toStrictEqual(Option.some({ start: "2026-11-01", end: "2026-11-09" }));
  });

  it("終わりが始まりより前の期間指定は受け付けない", () => {
    expect(
      windowOf({
        search: rankingSearch({ period: "custom", from: "2026-11-09", to: "2026-11-02" }),
        dates: [],
      }),
    ).toStrictEqual(Option.none());
  });
});
