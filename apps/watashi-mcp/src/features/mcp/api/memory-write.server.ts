import { Array as Arr, Effect, Equal, Option, Schema } from "effect";

import { InvalidRecord } from "#/features/mcp/model/invalid-record";
import { MemoryNotFound } from "#/features/mcp/model/memory-not-found";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { findRevision } from "./history-store.server";
import type { MemoryWriteValue } from "./memory-input";
import { findMemory } from "./memory-store.server";
import {
  MemorySnapshot,
  NOT_RETRACTED,
  create as createMemo,
  resultOf,
  save,
  snapshotOf,
} from "./memory-writer.server";
import type { MemoryResult, MemorySnapshotValue, Writer } from "./memory-writer.server";
import { nowIso } from "./storage.server";

const decodeSnapshot = Schema.decodeUnknownEffect(Schema.fromJsonString(MemorySnapshot));

const notFound = (input: MemoryWriteValue): MemoryNotFound =>
  MemoryNotFound.make({ project: input.project, memoryName: input.name });

const required = (value: string | undefined, field: string): Effect.Effect<string, InvalidRecord> =>
  Effect.fromOption(Option.fromUndefinedOr(value)).pipe(
    Effect.mapError(() => InvalidRecord.make({ message: `Pass ${field} to create a new memo.` })),
  );

const create =
  (writer: Writer) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure> =>
    Effect.gen(function* createMemory() {
      const description = yield* required(input.description, "description");
      const content = yield* required(input.content, "content");
      return yield* createMemo(writer)({
        project: input.project,
        name: input.name,
        description,
        content,
        evidence: input.evidence ?? [],
        retractedAt: NOT_RETRACTED,
        retractReason: "",
      });
    });

const restore =
  (writer: Writer, row: Memory) =>
  (rev: number): Effect.Effect<MemoryResult, StoreFailure> =>
    findRevision({ entity: "memory", id: row.id, rev }).pipe(
      Effect.flatMap((revision) => decodeSnapshot(revision.body).pipe(Effect.orDie)),
      Effect.flatMap((snapshot) => save({ writer, op: "restore" })({ id: row.id, snapshot })),
    );

const retract =
  (writer: Writer, row: Memory) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure> =>
    Effect.gen(function* retractMemory() {
      const retractReason = yield* Effect.fromOption(Option.fromUndefinedOr(input.reason)).pipe(
        Effect.mapError(() =>
          InvalidRecord.make({ message: "Pass reason together with retract." }),
        ),
      );
      const retractedAt = yield* nowIso;
      return yield* save({ writer, op: "retract" })({
        id: row.id,
        snapshot: {
          ...snapshotOf(row),
          retractedAt,
          retractReason,
        },
      });
    });

const isUnchanged = (current: MemorySnapshotValue, next: MemorySnapshotValue): boolean =>
  current.description === next.description &&
  current.content === next.content &&
  current.retractedAt === next.retractedAt &&
  Arr.makeEquivalence(Equal.equals)(current.evidence, next.evidence);

const update =
  (writer: Writer, row: Memory) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure> => {
    const current = snapshotOf(row);
    const next = {
      ...current,
      description: input.description ?? current.description,
      content: input.content ?? current.content,
      evidence: input.evidence ?? current.evidence,
      retractedAt: NOT_RETRACTED,
      retractReason: "",
    };
    if (isUnchanged(current, next)) {
      return Effect.succeed(resultOf(row.id));
    }
    return save({ writer, op: "update" })({ id: row.id, snapshot: next });
  };

const change =
  (writer: Writer, input: MemoryWriteValue) =>
  (row: Memory): Effect.Effect<MemoryResult, StoreFailure> => {
    const restoreTo = Option.fromUndefinedOr(input.restoreTo);
    if (Option.isSome(restoreTo)) {
      return restore(writer, row)(restoreTo.value);
    }
    if (input.retract === true) {
      return retract(writer, row)(input);
    }
    return update(writer, row)(input);
  };

const needsExisting = (input: MemoryWriteValue): boolean =>
  input.retract === true || Option.isSome(Option.fromUndefinedOr(input.restoreTo));

const createOrFail =
  (writer: Writer) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure> => {
    if (needsExisting(input)) {
      return Effect.fail(notFound(input));
    }
    return create(writer)(input);
  };

const writeMemory =
  (writer: Writer) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure> => {
    const created = createOrFail(writer);
    const changed = change(writer, input);
    return findMemory(input).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => created(input),
          onSome: changed,
        }),
      ),
    );
  };

export { writeMemory };
