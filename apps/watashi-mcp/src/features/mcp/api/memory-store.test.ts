import { afterAll, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { vi } from "vite-plus/test";

import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { routeLifeRead } from "./life-read-route.server";
import { writeLife } from "./life-write.server";
import { readMemory } from "./memory-read.server";
import { writeMemory } from "./memory-write.server";
import { ownerProfile } from "./watashi-profile.server";
import { watashiSearch } from "./watashi-search.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

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
    const profile = yield* ownerProfile({ scope: Option.none(), topic: Option.none() });
    expect(profile).toMatchObject({
      openTodos: [{ title: "確定申告" }],
      recentMedia: [{ title: "三体" }],
    });
    expect(profile["traits"]).toStrictEqual({});
  }),
);

const bicycle = { project: "assistant", name: "bicycle" } as const;

it.effect("作業メモは無ければ作り、あれば渡した項目だけを置き換える", () =>
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
);

it.effect("無い作業メモは取り消せない", () =>
  Effect.gen(function* refusesRetract() {
    yield* resetDatabase;
    const failure = yield* Effect.flip(
      writeMemory(writer)({ ...bicycle, retract: true, reason: "不要" }),
    );
    expect(failure).toMatchObject({ _tag: "MemoryNotFound" });
  }),
);

it.effect("人生の記録と作業メモを store で分けて返す", () =>
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
);
