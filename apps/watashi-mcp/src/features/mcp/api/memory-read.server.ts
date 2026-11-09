import { Array as Arr, Effect, Option, pipe } from "effect";

import { InvalidRecord } from "#/features/mcp/model/invalid-record";
import { MemoryNotFound } from "#/features/mcp/model/memory-not-found";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { listHistory } from "./history-store.server";
import type { HistoryEntry } from "./history-store.server";
import type { Body } from "./life-record";
import { timeOut } from "./life-time";
import { DEFAULT_MEMORY_LIMIT } from "./memory-input";
import type { MemoryReadValue } from "./memory-input";
import { findMemory, memoryItem, searchMemories } from "./memory-store.server";

type Named = Readonly<{ project: string; name: string }>;

const HISTORY_LIMIT = 100;

const NO_QUERY = "";

const revisionItem = (entry: HistoryEntry): Body => ({
  rev: entry.rev,
  op: entry.op,
  actor: entry.actor,
  at: timeOut(entry.at),
  body: entry.body,
});

const withRetraction = (row: Memory): Body => {
  if (row.retractedAt === "") {
    return memoryItem(row);
  }
  return { ...memoryItem(row), retracted: { at: row.retractedAt, reason: row.retractReason } };
};

const revisionsOf = (row: Memory): Effect.Effect<Body, StoreFailure> =>
  listHistory({ entity: "memory", id: row.id, limit: HISTORY_LIMIT }).pipe(
    Effect.map((entries) => ({
      ref: `memory:${row.id}`,
      revisions: pipe(entries, Arr.map(revisionItem)),
    })),
  );

const shown =
  (input: MemoryReadValue) =>
  (row: Memory): Effect.Effect<Body, StoreFailure> => {
    if (input.revisions === true) {
      return revisionsOf(row);
    }
    return Effect.succeed({ total: 1, items: [withRetraction(row)] });
  };

const foundOrFail =
  (named: Named) =>
  (row: Option.Option<Memory>): Effect.Effect<Memory, StoreFailure> =>
    Effect.fromOption(row).pipe(
      Effect.mapError(() =>
        MemoryNotFound.make({ project: named.project, memoryName: named.name }),
      ),
    );

const readNamed =
  (input: MemoryReadValue) =>
  (named: Named): Effect.Effect<Body, StoreFailure> =>
    findMemory(named).pipe(Effect.flatMap(foundOrFail(named)), Effect.flatMap(shown(input)));

const searchNamed = (input: MemoryReadValue): Effect.Effect<Body, StoreFailure> =>
  searchMemories({
    query: input.query ?? NO_QUERY,
    project: Option.fromUndefinedOr(input.project),
    limit: input.limit ?? DEFAULT_MEMORY_LIMIT,
  }).pipe(
    Effect.map((rows) => ({ total: Arr.length(rows), items: pipe(rows, Arr.map(memoryItem)) })),
  );

const projectFor =
  (name: string) =>
  (project: string): Option.Option<Named> =>
    Option.some({ project, name });

const namedOf = (input: MemoryReadValue): Effect.Effect<Option.Option<Named>, InvalidRecord> =>
  Option.match(Option.fromUndefinedOr(input.name), {
    onNone: () => Effect.succeedNone,
    onSome: (name) =>
      Effect.fromOption(Option.fromUndefinedOr(input.project)).pipe(
        Effect.mapBoth({
          onFailure: () => InvalidRecord.make({ message: "Pass project together with name." }),
          onSuccess: projectFor(name),
        }),
      ),
  });

const readMemory = (input: MemoryReadValue): Effect.Effect<Body, StoreFailure> => {
  const named = readNamed(input);
  return namedOf(input).pipe(
    Effect.flatMap(Option.match({ onNone: () => searchNamed(input), onSome: named })),
  );
};

export { readMemory };
