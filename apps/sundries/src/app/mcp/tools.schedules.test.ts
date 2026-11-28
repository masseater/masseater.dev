import { expect, it } from "@effect/vitest";
import { Array as Arr, Cron, DateTime, Effect, Option, Schema, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";
import { afterAll, beforeEach } from "vite-plus/test";

import { dispatchSchedules, provideRequests } from "#/features/request-claude/index.ts";

import {
  bindings,
  call,
  closeDatabase,
  resetDatabase,
  value,
  wakes,
} from "./claude-request-tools.test.support.ts";

beforeEach(() => {
  wakes.outcome = "fired";
  wakes.count = 0;
  wakes.projects = [];
  return Effect.runPromise(resetDatabase);
});
afterAll(() => Effect.runPromise(closeDatabase));

const OWNER = "claude-code";

const MINUTE = 60_000;

const ONE = 1;

const NOON_IN_UTC = 3;

const PROJECT = "aredoko";

const DAILY = {
  id: "memory-tidy",
  name: "メモリ整理",
  description: "プロジェクトメモリを短くまとめる",
  cron: "0 12 * * *",
  prompt: "memory-tidy スキルを実行する",
};

const Row = Schema.Struct({
  id: Schema.Int,
  text: Schema.String,
  sender: Schema.String,
  project: Schema.NullOr(Schema.String),
  scheduleId: Schema.NullOr(Schema.String),
  slot: Schema.NullOr(Schema.Int),
});

type Request = typeof Row.Type;

const decodeRows = Schema.decodeUnknownEffect(Schema.Array(Row));

const View = Schema.Struct({
  id: Schema.String,
  enabled: Schema.Boolean,
  timezone: Schema.String,
  nextRun: Schema.NullOr(Schema.Int),
});

type Listed = typeof View.Type;

const decodeViews = Schema.decodeUnknownEffect(Schema.Array(View));

const owner = value(OWNER);

const tryAs = call(OWNER);

const takeArgs = (project: Option.Option<string>): Readonly<Record<string, string>> =>
  project.pipe(Option.match({ onNone: () => ({}), onSome: (name) => ({ project: name }) }));

const take = (project: Option.Option<string>): Effect.Effect<readonly Request[]> =>
  pipe(takeArgs(project), owner("take_claude_requests"), Effect.flatMap(decodeRows), Effect.orDie);

type Dispatched = Readonly<{ queued: number; woken: readonly string[] }>;

const NOTHING = 0;

const dispatch: Effect.Effect<Dispatched> = bindings.pipe(
  Effect.flatMap((found) => dispatchSchedules.pipe(provideRequests(found))),
  Effect.orDie,
);

const views = owner("list_schedules")({}).pipe(Effect.flatMap(decodeViews), Effect.orDie);

const hourOf = (at: number): number => DateTime.getPartUtc(DateTime.makeUnsafe(at), "hour");

const nextNoon = Cron.next(Cron.parseUnsafe(DAILY.cron, "Asia/Tokyo")).getTime();

const texts = (requests: readonly Request[]): readonly string[] =>
  pipe(
    requests,
    Arr.map(({ text }) => text),
  );

it.effect("定義を作ると一覧に出て、次の実行時刻は時間帯で読んだ cron になる", () =>
  Effect.gen(function* created() {
    yield* owner("create_schedule")(DAILY);
    const listed = yield* views;
    const hours = pipe(
      listed,
      Arr.map(({ timezone, nextRun }: Listed) => ({
        timezone,
        hour: Option.map(Option.fromNullishOr(nextRun), hourOf),
      })),
    );
    expect(hours).toStrictEqual([{ timezone: "Asia/Tokyo", hour: Option.some(NOON_IN_UTC) }]);
  }),
);

it.effect("同じ id の定義は 2 つ作れず、壊れた cron と時間帯は受け付けない", () =>
  Effect.gen(function* rejected() {
    yield* owner("create_schedule")(DAILY);
    const twice = yield* tryAs("create_schedule")(DAILY);
    const badCron = yield* tryAs("create_schedule")({ ...DAILY, id: "x", cron: "毎日" });
    const badZone = yield* tryAs("create_schedule")({ ...DAILY, id: "y", timezone: "Mars/Base" });
    expect([twice.isError, badCron.isError, badZone.isError]).toStrictEqual([true, true, true]);
  }),
);

it.effect(
  "send_to_claude に定義の id を渡すと、その定義の依頼を今すぐ積み、定義のプロジェクトを起こす",
  () =>
    Effect.gen(function* runNow() {
      yield* owner("create_schedule")({ ...DAILY, project: PROJECT, model: "claude-opus-5-5" });
      yield* owner("send_to_claude")({ schedule: DAILY.id });
      const forDefault = yield* take(Option.none());
      const forProject = yield* take(Option.some(PROJECT));
      expect(forDefault).toStrictEqual([]);
      expect(forProject).toMatchObject([
        { scheduleId: DAILY.id, project: PROJECT, slot: Option.getOrNull(Option.none()) },
      ]);
      expect(
        Arr.every(
          texts(forProject),
          (text) =>
            Str.includes(DAILY.prompt)(text) && Str.includes("モデル: claude-opus-5-5")(text),
        ),
      ).toBe(true);
      expect(wakes.projects).toStrictEqual([PROJECT]);
    }),
);

it.effect("text と schedule は片方だけ受け付ける", () =>
  Effect.gen(function* exclusive() {
    const both = yield* tryAs("send_to_claude")({ text: "a", schedule: DAILY.id });
    const neither = yield* tryAs("send_to_claude")({});
    expect([both.isError, neither.isError]).toStrictEqual([true, true]);
  }),
);

it.effect("止めた定義は次の実行時刻を持たず、無い定義は変えられない", () =>
  Effect.gen(function* disabled() {
    yield* owner("create_schedule")(DAILY);
    yield* owner("update_schedule")({ id: DAILY.id, enabled: false });
    const listed = yield* views;
    const missing = yield* tryAs("update_schedule")({ id: "nothing", enabled: false });
    expect(listed).toMatchObject([
      { id: DAILY.id, enabled: false, nextRun: Option.getOrNull(Option.none()) },
    ]);
    expect(missing.isError).toBe(true);
  }),
);

const dispatchAt = (at: number): Effect.Effect<Dispatched> =>
  TestClock.setTime(at).pipe(Effect.andThen(dispatch));

it.effect(
  "毎分の配りは時刻の来た枠を 1 度だけ積み、起こしたプロジェクトは 10 分は起こし直さない",
  () =>
    Effect.gen(function* dispatched() {
      yield* owner("create_schedule")(DAILY);
      const first = yield* dispatchAt(nextNoon + MINUTE);
      const second = yield* dispatchAt(nextNoon + MINUTE + MINUTE);
      const taken = yield* take(Option.none());
      expect([first.queued, second.queued, second.woken]).toStrictEqual([ONE, NOTHING, []]);
      expect(taken).toMatchObject([{ scheduleId: DAILY.id, slot: nextNoon, sender: "schedule" }]);
      expect(wakes.count).toBe(ONE);
    }),
);
