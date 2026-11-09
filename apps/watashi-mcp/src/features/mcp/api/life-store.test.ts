import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase, resetDatabase } from "#/shared/db/d1.test.support";

import { routeLifeRead } from "./life-read-route.server";
import { lifeStats } from "./life-stats.server";
import { writeLife } from "./life-write.server";

vi.mock("cloudflare:workers", () => import("#/shared/db/d1.test.support"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const NIGHT = "2026-11-08";

const ALL_DRINKS = 5;

const FIXED_DRINKS = 3;

const YEN = 6000;

const REVISIONS_AFTER_RETRACT = 4;

const FIRST_REVISION = 1;

const drinkingNight = {
  record: "life_event",
  source: "said",
  text: "夜、田中と池袋で飲んでた。ビール3杯とハイボール2杯で6000円",
  at: NIGHT,
  timeOfDay: "evening",
  kind: "met",
  people: ["田中"],
  place: "池袋",
  values: { drinks: ALL_DRINKS, yen: YEN },
} as const;

const typesOf = (notices: readonly Readonly<{ type: string }>[]): readonly string[] =>
  pipe(
    notices,
    Arr.map((notice) => notice.type),
  );

const drinksOnNight = lifeStats({ metrics: ["drinks"], from: NIGHT, to: NIGHT }).pipe(
  Effect.map(Arr.head),
  Effect.flatMap(Effect.fromOption),
);

const writeNight = resetDatabase.pipe(
  Effect.andThen(writeLife(writer)([drinkingNight])),
  Effect.map((result) => result.written),
  Effect.flatMap((written) => Effect.fromOption(Arr.head(written))),
);

it.effect("初めての kind と指標を登録して知らせる", () =>
  Effect.gen(function* registersVocabulary() {
    yield* resetDatabase;
    const result = yield* writeLife(writer)([drinkingNight]);
    expect(result.written).toHaveLength(FIRST_REVISION);
    expect(typesOf(result.notices)).toStrictEqual(["new_kind", "new_metric", "new_metric"]);
  }),
);

it.effect("書いた出来事を日付の精度つきで読める", () =>
  Effect.gen(function* readsWithPrecision() {
    const ref = yield* writeNight;
    const read = yield* routeLifeRead({ record: "life_event", people: ["田中"] });
    expect(read).toMatchObject({
      total: FIRST_REVISION,
      items: [{ ref, source: "said", at: { date: NIGHT, precision: "day" } }],
    });
  }),
);

it.effect("直した値と、前のリビジョンに戻した値で集計する", () =>
  Effect.gen(function* fixesAndRestores() {
    const ref = yield* writeNight;
    yield* writeLife(writer)([{ ref, values: { drinks: FIXED_DRINKS, yen: YEN } }]);
    const fixed = yield* drinksOnNight;
    expect(fixed).toMatchObject({ total: FIXED_DRINKS });
    yield* writeLife(writer)([{ ref, restoreTo: FIRST_REVISION }]);
    const restored = yield* drinksOnNight;
    expect(restored).toMatchObject({ total: ALL_DRINKS });
  }),
);

it.effect("取り消した記録は一覧から消え、リビジョンには残る", () =>
  Effect.gen(function* retractsRecord() {
    const ref = yield* writeNight;
    yield* writeLife(writer)([{ ref, values: { drinks: FIXED_DRINKS, yen: YEN } }]);
    yield* writeLife(writer)([{ ref, restoreTo: FIRST_REVISION }]);
    yield* writeLife(writer)([{ ref, retract: true, reason: "書き間違い" }]);
    const listed = yield* routeLifeRead({ record: "life_event" });
    expect(listed).toMatchObject({ total: 0 });
    const history = yield* routeLifeRead({ ref, revisions: true });
    expect(history["revisions"]).toHaveLength(REVISIONS_AFTER_RETRACT);
  }),
);

const sleepKind = {
  record: "event_kind",
  kind: "sleep",
  valuesSchema: {
    type: "object",
    additionalProperties: false,
    properties: { sleep_hours: { type: "number", minimum: 0 } },
  },
} as const;

it.effect("valuesSchema に合わない値は書けない", () =>
  Effect.gen(function* rejectsValues() {
    yield* resetDatabase;
    yield* writeLife(writer)([sleepKind]);
    const failure = yield* Effect.flip(
      writeLife(writer)([
        {
          record: "life_event",
          source: "said",
          text: "寝た",
          at: NIGHT,
          kind: "sleep",
          values: { sleep_hours: "長め" },
        },
      ]),
    );
    expect(failure).toMatchObject({ _tag: "InvalidRecord" });
  }),
);

const home = (statement: string, since: string) =>
  ({ record: "profile_fact", source: "said", topic: "住まい", statement, since }) as const;

it.effect("新しい事実は同じ topic の今の事実を終わらせる", () =>
  Effect.gen(function* replacesFact() {
    yield* resetDatabase;
    yield* writeLife(writer)([home("池袋に住んでいる", "2020-04")]);
    const moved = yield* writeLife(writer)([home("新宿に住んでいる", "2024-04")]);
    expect(typesOf(moved.notices)).toContain("replaced");
    const past = yield* routeLifeRead({
      record: "profile_fact",
      topics: ["住まい"],
      asOf: "2022-06",
    });
    expect(past).toMatchObject({ total: 1, items: [{ statement: "池袋に住んでいる" }] });
  }),
);

const book = { record: "media_item", source: "said", mediaType: "book", title: "三体" } as const;

it.effect("同じ作品は更新として扱う", () =>
  Effect.gen(function* updatesMedia() {
    yield* resetDatabase;
    const first = yield* writeLife(writer)([{ ...book, status: "doing" }]);
    const second = yield* writeLife(writer)([{ ...book, status: "done" }]);
    expect(second.written).toStrictEqual(first.written);
    expect(typesOf(second.notices)).toContain("updated_existing");
  }),
);
