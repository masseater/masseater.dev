import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { keepOnly, observe, pickVideos } from "./view-state.ts";
import type { ViewStateValue } from "./view-state.ts";

const HOT = 5000;
const COLD = 4999;
const ROTATION_DAYS = 2;
const EVERYTHING = 10;
const TWO = 2;
const THREE = 3;
const OLDEST = "2026-01-01";
const OLDER = "2026-01-02";
const NEWER = "2026-01-03";
const NEWEST = "2026-01-04";
const TODAY = "2026-01-10";
const GRACE_END = "2026-01-07";
const WITHIN_GRACE = "2026-01-08";
const MORE = 6000;

const seen = (views: number, at: string): ViewStateValue[string] => [Option.some(views), at];

const missing = (at: string): ViewStateValue[string] => [Option.none(), at];

const PICK_CASES: readonly Readonly<{
  title: string;
  state: ViewStateValue;
  ids: readonly string[];
  budget: number;
  picked: readonly string[];
}>[] = [
  {
    title: "まだ見ていない動画は、渡した順にすべて選ぶ",
    state: {},
    ids: ["sm1", "sm2", "sm3"],
    budget: EVERYTHING,
    picked: ["sm1", "sm2", "sm3"],
  },
  {
    title: "再生数がしきい値以上の動画は、毎回すべて選ぶ",
    state: { sm1: seen(HOT, NEWEST), sm2: seen(HOT, OLDEST) },
    ids: ["sm1", "sm2"],
    budget: EVERYTHING,
    picked: ["sm1", "sm2"],
  },
  {
    title: "しきい値に届かない動画は、取得日の古い順に一部だけを選ぶ",
    state: {
      sm1: seen(COLD, NEWEST),
      sm2: seen(COLD, OLDER),
      sm3: seen(COLD, OLDEST),
      sm4: seen(COLD, NEWER),
    },
    ids: ["sm1", "sm2", "sm3", "sm4"],
    budget: EVERYTHING,
    picked: ["sm3", "sm2"],
  },
  {
    title: "値が取れなかった動画は、しきい値に届かない動画として回す",
    state: { sm1: missing(OLDEST), sm2: seen(COLD, OLDER), sm3: seen(COLD, NEWER) },
    ids: ["sm1", "sm2", "sm3"],
    budget: EVERYTHING,
    picked: ["sm1", "sm2"],
  },
  {
    title: "再生数の多い動画、順番の回ってきた動画、まだ見ていない動画の順に並べる",
    state: { sm1: seen(COLD, OLDEST), sm2: seen(HOT, NEWEST) },
    ids: ["fresh", "sm1", "sm2"],
    budget: EVERYTHING,
    picked: ["sm2", "sm1", "fresh"],
  },
  {
    title: "予算を超えた分は、並べた順の後ろから落とす",
    state: { sm1: seen(COLD, OLDEST), sm2: seen(HOT, NEWEST) },
    ids: ["fresh", "sm1", "sm2"],
    budget: TWO,
    picked: ["sm2", "sm1"],
  },
  {
    title: "渡していない動画は、状態にあっても選ばない",
    state: { sm1: seen(HOT, NEWEST), gone: seen(HOT, NEWEST) },
    ids: ["sm1"],
    budget: EVERYTHING,
    picked: ["sm1"],
  },
];

describe("pickVideos", () => {
  it.each(PICK_CASES)("$title", ({ state, ids, budget, picked }) => {
    expect(pickVideos({ state, ids, budget, rotationDays: ROTATION_DAYS })).toStrictEqual(picked);
  });

  it("順番を回す日数が長いほど、1 回に選ぶ動画を減らす", () => {
    const state = { sm1: seen(COLD, OLDEST), sm2: seen(COLD, OLDER), sm3: seen(COLD, NEWER) };
    const ids = ["sm1", "sm2", "sm3"];
    expect(pickVideos({ state, ids, budget: EVERYTHING, rotationDays: THREE })).toStrictEqual([
      "sm1",
    ]);
  });
});

const KEEP_CASES: readonly Readonly<{
  title: string;
  state: ViewStateValue;
  keep: readonly string[];
  since: string;
  kept: ViewStateValue;
}>[] = [
  {
    title: "残す動画に入っていないものを捨てる",
    state: { sm1: seen(HOT, NEWER), sm2: seen(HOT, NEWER) },
    keep: ["sm1"],
    since: OLDEST,
    kept: { sm1: seen(HOT, NEWER) },
  },
  {
    title: "取得日が期限より古いものを捨て、期限の日のものは残す",
    state: { sm1: seen(HOT, OLDEST), sm2: seen(HOT, OLDER), sm3: missing(NEWER) },
    keep: ["sm1", "sm2", "sm3"],
    since: OLDER,
    kept: { sm2: seen(HOT, OLDER), sm3: missing(NEWER) },
  },
  {
    title: "残す動画が状態に無くても、何も足さない",
    state: { sm1: seen(HOT, NEWER) },
    keep: ["sm1", "sm2"],
    since: OLDEST,
    kept: { sm1: seen(HOT, NEWER) },
  },
];

describe("keepOnly", () => {
  it.each(KEEP_CASES)("$title", ({ state, keep, since, kept }) => {
    expect(keepOnly({ state, keep, since })).toStrictEqual(kept);
  });
});

const OBSERVE_CASES: readonly Readonly<{
  title: string;
  state: ViewStateValue;
  ids: readonly string[];
  views: Readonly<Record<string, number>>;
  observed: ViewStateValue;
}>[] = [
  {
    title: "値が取れた動画は、値と取得日を置き換える",
    state: { sm1: seen(HOT, WITHIN_GRACE) },
    ids: ["sm1"],
    views: { sm1: MORE },
    observed: { sm1: seen(MORE, TODAY) },
  },
  {
    title: "応答に無い動画は、前の値が猶予の内なら値も取得日もそのまま残す",
    state: { sm1: seen(HOT, WITHIN_GRACE) },
    ids: ["sm1"],
    views: {},
    observed: { sm1: seen(HOT, WITHIN_GRACE) },
  },
  {
    title: "応答に無い動画は、前の値が猶予の切れる日のものなら値なしにする",
    state: { sm1: seen(HOT, GRACE_END) },
    ids: ["sm1"],
    views: {},
    observed: { sm1: missing(TODAY) },
  },
  {
    title: "応答に無い動画は、前の値が猶予より古ければ値なしにする",
    state: { sm1: seen(HOT, OLDEST) },
    ids: ["sm1"],
    views: {},
    observed: { sm1: missing(TODAY) },
  },
  {
    title: "応答に無い動画は、前の値が無ければ値なしで記録する",
    state: {},
    ids: ["sm1"],
    views: {},
    observed: { sm1: missing(TODAY) },
  },
  {
    title: "猶予の内に値なしだった動画は、応答に無くても取得日を変えない",
    state: { sm1: missing(WITHIN_GRACE) },
    ids: ["sm1"],
    views: {},
    observed: { sm1: missing(WITHIN_GRACE) },
  },
  {
    title: "取得しなかった動画には触らない",
    state: { sm1: seen(HOT, OLDEST), sm2: seen(COLD, OLDER) },
    ids: ["sm1"],
    views: { sm1: MORE, sm2: MORE },
    observed: { sm1: seen(MORE, TODAY), sm2: seen(COLD, OLDER) },
  },
];

describe("observe", () => {
  it.each(OBSERVE_CASES)("$title", ({ state, ids, views, observed }) => {
    expect(observe({ state, ids, views, date: TODAY, keepAfter: GRACE_END })).toStrictEqual(
      observed,
    );
  });
});
