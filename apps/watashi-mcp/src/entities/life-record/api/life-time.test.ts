import { Result } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { dayRangeOf, parseTime, storedOf, timeOut } from "./life-time";

const stored = (input: string): string =>
  Result.match(parseTime(input), { onFailure: (message) => message, onSuccess: storedOf });

describe("日時の読み方", () => {
  it("タイムゾーン付きの時刻を UTC で持つ", () => {
    expect(stored("2026-11-08T19:00+09:00")).toBe("2026-11-08T10:00:00.000Z");
    expect(stored("2026-11-08T10:00Z")).toBe("2026-11-08T10:00:00.000Z");
  });

  it("タイムゾーンの無い時刻は日本時間として読み、そう読んだことを返す", () => {
    expect(parseTime("2026-11-08T19:00")).toStrictEqual(
      Result.succeed({ kind: "instant", utc: "2026-11-08T10:00:00.000Z", assumedZone: true }),
    );
  });

  it("日付・月・年は UTC に変えずそのまま持つ", () => {
    expect(parseTime("2024-03")).toStrictEqual(
      Result.succeed({ kind: "date", date: "2024-03", precision: "month" }),
    );
    expect(stored("2010")).toBe("2010");
  });

  it("形の違う日時は書き方を添えて断る", () => {
    expect(Result.isFailure(parseTime("昨日の夜"))).toBe(true);
    expect(Result.isFailure(parseTime("2026-13-01"))).toBe(true);
  });

  it("時刻は UTC と日本時間の両方で返す", () => {
    expect(timeOut("2026-11-08T10:00:00.000Z")).toStrictEqual({
      utc: "2026-11-08T10:00:00.000Z",
      jst: "2026-11-08T19:00+09:00",
    });
    expect(timeOut("2026-11")).toStrictEqual({ date: "2026-11", precision: "month" });
  });

  it("日ごとの集計は日本時間の暦日で区切る", () => {
    expect(dayRangeOf("2026-11-08T16:00:00.000Z")).toStrictEqual({
      start: "2026-11-09",
      end: "2026-11-09",
    });
    expect(dayRangeOf("2024-02")).toStrictEqual({ start: "2024-02-01", end: "2024-02-29" });
    expect(dayRangeOf("2010")).toStrictEqual({ start: "2010-01-01", end: "2010-12-31" });
  });
});
