import { afterAll, expect, it } from "@effect/vitest";
import { Effect } from "effect";

import {
  readMemory,
  writeMemory,
  watashiProfile,
  watashiSearch,
} from "#/features/manage-memory/index.test.support.ts";
import { routeLifeRead, writeLife } from "#/features/record-life/index.test.support.ts";

import { closeDatabase, resetDatabase, provided } from "./d1.test.support.ts";

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const NIGHT = "2026-11-08";

const night = {
  record: "life_event",
  source: "said",
  text: "夜、田中と池袋で飲んでた",
  at: NIGHT,
  kind: "met",
  people: ["田中"],
  place: "池袋",
  values: { drinks: 5 },
} as const;

const writeNight = resetDatabase.pipe(Effect.andThen(writeLife(writer)([night])));

const book = { record: "media_item", source: "said", mediaType: "book", title: "三体" } as const;

it.effect("語彙・振り返りの材料・概要を返す", () =>
  provided(
    Effect.gen(function* readsOverview() {
      yield* writeNight;
      yield* writeLife(writer)([
        { ...book, status: "doing" },
        { record: "todo", source: "said", title: "確定申告" },
      ]);
      const vocabulary = yield* routeLifeRead({ record: "event_kind" });
      expect(vocabulary).toMatchObject({ metrics: [{ metric: "drinks", count: 1 }] });
      const digest = yield* routeLifeRead({ record: "digest", from: "2026-11-02", to: NIGHT });
      expect(digest).toMatchObject({ kindCounts: { met: 1 } });
      const profile = yield* watashiProfile({});
      expect(profile).toBe("# USER.md\n\nThe profile has not been built yet.\n");
    }),
  ),
);

const bicycle = { project: "assistant", name: "bicycle" } as const;

it.effect("作業メモは無ければ作り、あれば渡した項目だけを置き換える", () =>
  provided(
    Effect.gen(function* upsertsMemory() {
      yield* resetDatabase;
      yield* writeMemory(writer)({
        ...bicycle,
        description: "自転車",
        content: "クロスバイクを買った",
      });
      yield* writeMemory(writer)({ ...bicycle, content: "GIANT ESCAPE R3" });
      const read = yield* readMemory(bicycle);
      expect(read).toMatchObject({
        total: 1,
        items: [{ store: "memory", description: "自転車", content: "GIANT ESCAPE R3" }],
      });
    }),
  ),
);

const week = { project: "個人PJ", name: "weekly-2026-11-16" } as const;

const weekView = [
  { type: "Headline", text: "監査をまとめた週" },
  { type: "Point", theme: "CI", text: "マージキューを通るようになった", days: "水" },
] as const;

it.effect("作業メモに表示の部品を持たせ、内容を変えても表示は残る", () =>
  provided(
    Effect.gen(function* keepsView() {
      yield* resetDatabase;
      yield* writeMemory(writer)({
        ...week,
        description: "監査をまとめた週",
        content: "監査をまとめた",
        view: weekView,
      });
      yield* writeMemory(writer)({ ...week, content: "監査を4つにまとめた" });
      const read = yield* readMemory(week);
      expect(read).toMatchObject({
        items: [{ content: "監査を4つにまとめた", view: weekView }],
      });
    }),
  ),
);

it.effect("無い作業メモは取り消せない", () =>
  provided(
    Effect.gen(function* refusesRetract() {
      yield* resetDatabase;
      const failure = yield* Effect.flip(
        writeMemory(writer)({ ...bicycle, retract: true, reason: "不要" }),
      );
      expect(failure).toMatchObject({ _tag: "MemoryNotFound" });
    }),
  ),
);

it.effect("人生の記録と作業メモを store で分けて返す", () =>
  provided(
    Effect.gen(function* separatesStores() {
      yield* writeNight;
      yield* writeMemory(writer)({
        project: "assistant",
        name: "drinks",
        description: "池袋の飲み",
        content: "池袋でよく飲む",
      });
      const found = yield* watashiSearch({ query: "池袋" });
      expect(found).toMatchObject({ total: 2, countsByStore: { life: 1, memory: 1 } });
    }),
  ),
);

const LONG_TERM = "あいうえおかきくけこさしすせそたちつてとなにぬねの";

it.effect("LIKE のパターン長の上限を超える検索語でも、先頭部分で探して失敗しない", () =>
  provided(
    Effect.gen(function* searchesLongTerm() {
      yield* resetDatabase;
      yield* writeMemory(writer)({
        project: "assistant",
        name: "kana",
        description: "かな",
        content: LONG_TERM,
      });
      const found = yield* watashiSearch({ query: LONG_TERM });
      expect(found).toMatchObject({ total: 1, countsByStore: { memory: 1 } });
    }),
  ),
);

const memo = (name: string, description: string, content: string) =>
  ({ project: "assistant", name, description, content }) as const;

const writeWildcards = Effect.gen(function* writesWildcards() {
  yield* resetDatabase;
  yield* Effect.forEach(
    [
      memo("juice", "果汁", "果汁 100% のジュース"),
      memo("snake", "snake_case", "名前の付け方"),
      memo("plain", "ただの記録", "記号を含まない"),
    ],
    writeMemory(writer),
    { concurrency: 1 },
  );
  yield* writeLife(writer)([{ ...night, text: "50% オフの夜" }]);
});

it.effect("検索語の % と _ は文字として探し、すべての記録には当たらない", () =>
  provided(
    Effect.gen(function* searchesWildcards() {
      yield* writeWildcards;
      const percent = yield* watashiSearch({ query: "%" });
      const underscore = yield* watashiSearch({ query: "_" });
      expect(percent).toMatchObject({ total: 2, countsByStore: { life: 1, memory: 1 } });
      expect(underscore).toMatchObject({ total: 1, countsByStore: { memory: 1 } });
    }),
  ),
);

it.effect("書き換えた記録も % と _ を文字として探す", () =>
  provided(
    Effect.gen(function* searchesUpdated() {
      yield* writeWildcards;
      yield* writeMemory(writer)(memo("plain", "ただの記録", "a_b を含むようになった"));
      const updated = yield* watashiSearch({ query: "_" });
      expect(updated).toMatchObject({ total: 2, countsByStore: { memory: 2 } });
    }),
  ),
);
