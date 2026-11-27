import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import type { MemoValue } from "#/entities/watashi/index.ts";

import { monthsOf, projectsOf } from "./weeks.ts";
import type { MonthValue } from "./weeks.ts";

const memo = (project: string, name: string, description = "x"): MemoValue => ({
  ref: `memory:${project}:${name}`,
  project,
  name,
  description,
  content: description,
  evidence: [],
  updatedAt: { utc: "2026-11-24T01:00:00Z", jst: "2026-11-24 10:00" },
});

const memos = [
  memo("個人PJ", "weekly-2026-11-16", "監査をまとめた週"),
  memo("other-project", "weekly-2026-11-23", "レビュー対応"),
  memo("個人PJ", "weekly-2026-11-23", "リポジトリ分離"),
  memo("個人PJ", "weekly-2026-10-26", "十月末"),
  memo("個人PJ", "weekly-notes"),
];

const outline = (months: readonly MonthValue[]): unknown =>
  pipe(
    months,
    Arr.map((month) => ({
      month: month.label,
      weeks: pipe(
        month.weeks,
        Arr.map((week) => ({
          label: week.label,
          recent: week.recent,
          projects: pipe(
            week.memos,
            Arr.map((item) => item.project),
          ),
        })),
      ),
    })),
  );

describe("週次振り返りの並べ方", () => {
  it("新しい週から月ごとにまとめ、直近 2 週だけを開き、同じ週のプロジェクトを 1 つにする", () => {
    expect(outline(monthsOf({})(memos))).toStrictEqual([
      {
        month: "2026年11月",
        weeks: [
          { label: "11/23–29", recent: true, projects: ["other-project", "個人PJ"] },
          { label: "11/16–22", recent: true, projects: ["個人PJ"] },
        ],
      },
      {
        month: "2026年10月",
        weeks: [{ label: "10/26–11/1", recent: false, projects: ["個人PJ"] }],
      },
    ]);
  });

  it("プロジェクトと言葉で絞る", () => {
    expect(outline(monthsOf({ project: "個人PJ", keyword: "監査" })(memos))).toStrictEqual([
      {
        month: "2026年11月",
        weeks: [{ label: "11/16–22", recent: true, projects: ["個人PJ"] }],
      },
    ]);
  });

  it("絞り込みの選択肢にプロジェクトを 1 回ずつ並べる", () => {
    expect(projectsOf(memos)).toStrictEqual(["other-project", "個人PJ"]);
  });
});
