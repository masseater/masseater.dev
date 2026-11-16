import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Body } from "#/entities/life-record/index.ts";
import { timeOut } from "#/entities/life-record/index.ts";
import { findMemory, memoryItem, searchMemories } from "#/entities/memory/index.server.ts";
import { DEFAULT_MEMORY_LIMIT } from "#/entities/memory/index.ts";
import type { MemoryReadValue } from "#/entities/memory/index.ts";
import { InvalidRecord, MemoryNotFound } from "#/shared/api/index.ts";
import type { StoreFailure } from "#/shared/api/index.ts";
import { listHistory } from "#/shared/db/index.server.ts";
import type { HistoryEntry } from "#/shared/db/index.server.ts";
import type { Memory } from "#/shared/db/index.ts";

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

export const readMemory = (input: MemoryReadValue): Effect.Effect<Body, StoreFailure> => {
  const named = readNamed(input);
  return namedOf(input).pipe(
    Effect.flatMap(Option.match({ onNone: () => searchNamed(input), onSome: named })),
  );
};
