import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { computeStats } from "./life-stats";
import type { MetricStats, StatsData, StatsRequest } from "./life-stats";

const NO_SLEEP = 0;

const SHORT_SLEEP = 7;

const FULL_DAY = 24;

const data: StatsData = {
  aggregates: { hours: "avg", cups: "sum" },
  events: [
    { kind: "sleep", day: "2026-11-02", values: { hours: 6 } },
    { kind: "coffee", day: "2026-11-02", values: { cups: 2 } },
    { kind: "sleep", day: "2026-11-03", values: { hours: 8 } },
    { kind: "sleep", day: "2026-11-04", values: { hours: 7 } },
    { kind: "coffee", day: "2026-11-04", values: { cups: 1 } },
    { kind: "coffee", day: "2026-11-04", values: { cups: 1 } },
  ],
};

const base: StatsRequest = {
  metrics: ["hours"],
  period: { from: "2026-11-02", to: "2026-11-05" },
  bucket: "none",
  compare: Option.none(),
  where: [],
  groupBy: Option.none(),
};

const statsFor = (request: StatsRequest): readonly MetricStats[] => computeStats(request)(data);

describe("数値の集計", () => {
  it("1 日の値を定義の集計方法でまとめ、記録のあった日数とカレンダーの日数を分けて返す", () => {
    expect(statsFor(base)).toStrictEqual([
      {
        metric: "hours",
        aggregate: "avg",
        value: 7,
        total: 21,
        perLoggedDay: 7,
        perCalendarDay: 5.25,
        min: 6,
        max: 8,
        daysLogged: 3,
        daysWithAnyRecord: 3,
        firstRecord: "2026-11-02",
      },
    ]);
  });
});

describe("数え方と絞り込み", () => {
  it("count: は出来事の件数を、days: はあった日数を数える", () => {
    const [count, days, cups] = statsFor({
      ...base,
      metrics: ["count:coffee", "days:coffee", "cups"],
    });
    expect(count).toMatchObject({ value: 3, daysLogged: 2 });
    expect(days).toMatchObject({ value: 2 });
    expect(cups).toMatchObject({ aggregate: "sum", value: 4 });
  });

  it("where は条件を満たす日だけを残す", () => {
    expect(statsFor({ ...base, where: [{ metric: "cups", gte: 2 }] })).toMatchObject([
      { value: 6.5, daysLogged: 2, daysWithAnyRecord: 2 },
    ]);
  });
});

describe("区切りと比較", () => {
  it("記録の無い区切りには value を付けない", () => {
    expect(
      statsFor({ ...base, period: { from: "2026-11-02", to: "2026-11-09" }, bucket: "week" }),
    ).toMatchObject([
      {
        buckets: [
          { bucket: "2026-11-02", value: 7, daysLogged: 3 },
          { bucket: "2026-11-09", daysLogged: 0 },
        ],
      },
    ]);
  });

  it("前の期間と比べる", () => {
    expect(
      statsFor({ ...base, compare: Option.some({ from: "2026-10-29", to: "2026-11-01" }) }),
    ).toMatchObject([
      {
        compare: {
          from: "2026-10-29",
          to: "2026-11-01",
          total: 0,
          perCalendarDay: 0,
          daysLogged: 0,
        },
      },
    ]);
  });
});

describe("グループ分け", () => {
  it("has はその出来事があった日と無かった日に分ける", () => {
    expect(statsFor({ ...base, groupBy: Option.some({ has: "coffee" }) })).toMatchObject([
      {
        groups: [
          { group: "with:coffee", value: 6.5, daysLogged: 2 },
          { group: "without:coffee", value: 8, daysLogged: 1 },
        ],
      },
    ]);
  });

  it("bins は別の数値の範囲で日を分ける", () => {
    expect(
      statsFor({
        ...base,
        metrics: ["cups"],
        groupBy: Option.some({ metric: "hours", bins: [NO_SLEEP, SHORT_SLEEP, FULL_DAY] }),
      }),
    ).toMatchObject([
      {
        groups: [
          { group: "0-7", value: 2, daysLogged: 1 },
          { group: "7-24", value: 2, daysLogged: 1 },
        ],
      },
    ]);
  });

  it("kind は値を持つ種類だけを返す", () => {
    expect(statsFor({ ...base, groupBy: Option.some({ by: "kind" }) })).toMatchObject([
      { groups: [{ group: "sleep", value: 7 }] },
    ]);
  });

  it("weekday は曜日ごとに分ける", () => {
    expect(statsFor({ ...base, groupBy: Option.some({ by: "weekday" }) })).toMatchObject([
      {
        groups: [
          { group: "mon", value: 6 },
          { group: "tue", value: 8 },
          { group: "wed", value: 7 },
          { group: "thu", daysLogged: 0 },
        ],
      },
    ]);
  });
});
