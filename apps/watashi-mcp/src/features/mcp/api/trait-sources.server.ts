import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Option } from "effect";

import type { LifeRow } from "#/features/mcp/model/life-record.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { collect, rowPositionFrom, rowPositionText, settledBefore } from "./trait-batch";
import type { Collected } from "./trait-batch";
import { collectConversations } from "./trait-conversations.server";
import { lifeAfter, memoriesAfter } from "./trait-source-store.server";
import { GLOBAL } from "./trait-state";
import type { BatchSource } from "./trait-state";
import { cursorOf } from "./trait-store.server";

const NOT_RETRACTED = "";

const memorySource = (row: Memory): readonly BatchSource[] => [
  {
    source: {
      ref: `memory:${row.id}`,
      origin: "memory",
      at: row.updatedAt,
      scope: row.project,
      text: `[${row.project}] ${row.name}: ${row.description}\n\n${row.content}`,
    },
    present: row.retractedAt === NOT_RETRACTED,
  },
];

const lifeSource = (row: LifeRow): readonly BatchSource[] => [
  {
    source: {
      ref: `${row.record}:${row.id}`,
      origin: "life",
      at: row.updatedAt,
      scope: GLOBAL,
      text: row.searchText,
    },
    present: row.retractedAt === NOT_RETRACTED,
  },
];

const positionOfRow = (row: Readonly<{ updatedAt: string; id: number }>): Effect.Effect<string> =>
  rowPositionText({ at: row.updatedAt, id: row.id });

const collectMemory: Effect.Effect<Option.Option<Collected>, StorageFailed> = Effect.gen(
  function* collectMemory() {
    const stored = yield* cursorOf("memory");
    const before = yield* settledBefore;
    const rows = yield* memoriesAfter({ position: rowPositionFrom(stored), before });
    return yield* collect({
      origin: "memory",
      items: rows,
      batchOf: memorySource,
      positionOf: positionOfRow,
    });
  },
);

const collectLife: Effect.Effect<Option.Option<Collected>, StorageFailed> = Effect.gen(
  function* collectLife() {
    const stored = yield* cursorOf("life");
    const before = yield* settledBefore;
    const rows = yield* lifeAfter({ position: rowPositionFrom(stored), before });
    return yield* collect({
      origin: "life",
      items: rows,
      batchOf: lifeSource,
      positionOf: positionOfRow,
    });
  },
);

const collectSources: Effect.Effect<
  Option.Option<Collected>,
  StorageFailed | UpstreamFailed
> = Effect.gen(function* collectSources() {
  const fromMemory = yield* collectMemory;
  if (Option.isSome(fromMemory)) {
    return fromMemory;
  }
  const fromLife = yield* collectLife;
  if (Option.isSome(fromLife)) {
    return fromLife;
  }
  return yield* collectConversations;
});

export { collectSources };
