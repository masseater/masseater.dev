import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Option } from "effect";

import { collect, rowPositionFrom, rowPositionText, settledBefore, GLOBAL } from "#/entities/trait";
import type { Collected, BatchSource } from "#/entities/trait";
import { cursorOf } from "#/entities/trait/index.server";
import { NOT_RETRACTED } from "#/shared/db";
import type { LifeRow, Memory, StorageFailed } from "#/shared/db";

import { collectConversations } from "./trait-conversations.server.ts";
import { lifeAfter, memoriesAfter } from "./trait-source-store.server.ts";

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
