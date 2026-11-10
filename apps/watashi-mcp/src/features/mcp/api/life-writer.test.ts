import { afterAll, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { vi } from "vite-plus/test";

import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { closeDatabase, resetDatabase } from "./d1.test.support.ts";
import { routeLifeRead } from "./life-read-route.server";
import { findRecord } from "./life-store.server";
import { insertRecord, replaceRecord, snapshotOf } from "./life-writer.server";
import type { MemoryWriteValue } from "./memory-input";
import { writeMemory } from "./memory-write.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const WRITERS = 2;

const AT_ONCE = { concurrency: WRITERS } as const;

const todo = (title: string) =>
  ({
    record: "todo",
    source: "said",
    body: { title, status: "open", priority: "normal" },
  }) as const;

const memo = (name: string): MemoryWriteValue => ({
  project: "assistant",
  name,
  description: "同時に書くメモ",
  content: name,
});

it.effect("同時に足した記録は別々の id を受け取る", () =>
  Effect.gen(function* insertsAtOnce() {
    yield* resetDatabase;
    const ids = yield* Effect.all(
      [insertRecord(writer)(todo("洗濯")), insertRecord(writer)(todo("掃除"))],
      AT_ONCE,
    );
    expect(Arr.dedupe(ids)).toHaveLength(WRITERS);
  }),
);

it.effect("同じ記録を同時に直すと、リビジョンが続き番号で残る", () =>
  Effect.gen(function* replacesAtOnce() {
    yield* resetDatabase;
    const id = yield* insertRecord(writer)(todo("洗濯"));
    const entry = yield* findRecord({ record: "todo", id });
    const retitle = (title: string): Effect.Effect<void, StorageFailed> =>
      replaceRecord(writer)({
        entry,
        snapshot: { ...snapshotOf(entry), body: { ...entry.body, title } },
        op: "update",
      });
    yield* Effect.all([retitle("洗濯と乾燥"), retitle("洗濯とアイロン")], AT_ONCE);
    const history = yield* routeLifeRead({ ref: `todo:${id}`, revisions: true });
    expect(history).toMatchObject({ revisions: [{ rev: 3 }, { rev: 2 }, { rev: 1 }] });
  }),
);

it.effect("同時に作った作業メモは別々の id を受け取る", () =>
  Effect.gen(function* createsMemosAtOnce() {
    yield* resetDatabase;
    const results = yield* Effect.all(
      [writeMemory(writer)(memo("first")), writeMemory(writer)(memo("second"))],
      AT_ONCE,
    );
    const refs = pipe(
      results,
      Arr.flatMap((result) => result.written),
    );
    expect(Arr.dedupe(refs)).toHaveLength(WRITERS);
  }),
);
