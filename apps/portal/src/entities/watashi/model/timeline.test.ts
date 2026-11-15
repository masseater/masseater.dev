import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, pipe } from "effect";

import { mergeTimeline } from "./timeline";

const personal = [
  { occurredOn: "1999-10-22", title: "生まれる", note: "", topics: ["生活"] },
  { occurredOn: "小学生", title: "GBA", note: "エメラルド", topics: ["ゲーム"] },
  { occurredOn: "2026-08", title: "転職", note: "", topics: [] },
];

const life = [
  {
    ref: "life_event:2",
    source: "said",
    text: "飲み会",
    at: { utc: "2026-09-01T10:00:00Z", jst: "2026-09-01T19:00:00+09:00" },
    people: ["A"],
  },
  {
    ref: "life_event:1",
    source: "said",
    text: "引っ越し",
    at: { date: "2005", precision: "year" },
  },
  { ref: "todo:3", source: "said", text: "時刻の無い記録" },
];

describe("mergeTimeline", () => {
  it("places dated life records between the personal events and keeps undated ones after their predecessor", () => {
    const titles = pipe(
      mergeTimeline({ personal, life }),
      Arr.map((entry) => entry.title),
    );
    expect(titles).toStrictEqual(["生まれる", "GBA", "引っ越し", "転職", "飲み会"]);
  });

  it("shows the JST minute for timed records and the raw label for fuzzy personal dates", () => {
    const whens = pipe(
      mergeTimeline({ personal, life }),
      Arr.map((entry) => entry.when),
    );
    expect(whens).toStrictEqual(["1999-10-22", "小学生", "2005", "2026-08", "2026-09-01 19:00"]);
  });
});
