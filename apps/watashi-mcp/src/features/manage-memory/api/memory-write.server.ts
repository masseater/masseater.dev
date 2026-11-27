import { MemoView } from "@masseater.dev/watashi-protocol";
import type { MemoViewValue } from "@masseater.dev/watashi-protocol";
import { Array as Arr, Effect, Equal, Option, Schema } from "effect";

import {
  findMemory,
  MemorySnapshot,
  create as createMemo,
  resultOf,
  save,
  snapshotOf,
} from "#/entities/memory/index.server.ts";
import type { MemoryResult, MemorySnapshotValue, Writer } from "#/entities/memory/index.server.ts";
import type { MemoryWriteValue } from "#/entities/memory/index.ts";
import { InvalidRecord, MemoryNotFound } from "#/shared/api/index.ts";
import type { StoreFailure } from "#/shared/api/index.ts";
import type { Database } from "#/shared/db/index.server.ts";
import { findRevision, nowIso } from "#/shared/db/index.server.ts";
import { NOT_RETRACTED } from "#/shared/db/index.ts";
import type { Memory } from "#/shared/db/index.ts";

const decodeSnapshot = Schema.decodeUnknownEffect(Schema.fromJsonString(MemorySnapshot));

const encodeView = Schema.encodeEffect(Schema.fromJsonString(MemoView));

const NO_VIEW = "";

const viewOf = (view: MemoViewValue | undefined, current: string): Effect.Effect<string> =>
  Option.match(Option.fromUndefinedOr(view), {
    onNone: () => Effect.succeed(current),
    onSome: (next) => encodeView(next).pipe(Effect.orDie),
  });

const notFound = (input: MemoryWriteValue): MemoryNotFound =>
  MemoryNotFound.make({ project: input.project, memoryName: input.name });

const required = (value: string | undefined, field: string): Effect.Effect<string, InvalidRecord> =>
  Effect.fromOption(Option.fromUndefinedOr(value)).pipe(
    Effect.mapError(() => InvalidRecord.make({ message: `Pass ${field} to create a new memo.` })),
  );

const create =
  (writer: Writer) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure, Database> =>
    Effect.gen(function* createMemory() {
      const description = yield* required(input.description, "description");
      const content = yield* required(input.content, "content");
      const view = yield* viewOf(input.view, NO_VIEW);
      return yield* createMemo(writer)({
        project: input.project,
        name: input.name,
        description,
        content,
        evidence: input.evidence ?? [],
        view,
        retractedAt: NOT_RETRACTED,
        retractReason: "",
      });
    });

const restore =
  (writer: Writer, row: Memory) =>
  (rev: number): Effect.Effect<MemoryResult, StoreFailure, Database> =>
    findRevision({ entity: "memory", id: row.id, rev }).pipe(
      Effect.flatMap((revision) => decodeSnapshot(revision.body).pipe(Effect.orDie)),
      Effect.flatMap((snapshot) => save({ writer, op: "restore" })({ id: row.id, snapshot })),
    );

const retract =
  (writer: Writer, row: Memory) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure, Database> =>
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
  current.view === next.view &&
  Arr.makeEquivalence(Equal.equals)(current.evidence, next.evidence);

const update =
  (writer: Writer, row: Memory) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure, Database> =>
    Effect.gen(function* updateMemory() {
      const current = snapshotOf(row);
      const view = yield* viewOf(input.view, current.view ?? NO_VIEW);
      const next = {
        ...current,
        description: input.description ?? current.description,
        content: input.content ?? current.content,
        evidence: input.evidence ?? current.evidence,
        view,
        retractedAt: NOT_RETRACTED,
        retractReason: "",
      };
      if (isUnchanged(current, next)) {
        return resultOf(row.id);
      }
      return yield* save({ writer, op: "update" })({ id: row.id, snapshot: next });
    });

const change =
  (writer: Writer, input: MemoryWriteValue) =>
  (row: Memory): Effect.Effect<MemoryResult, StoreFailure, Database> => {
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
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure, Database> => {
    if (needsExisting(input)) {
      return Effect.fail(notFound(input));
    }
    return create(writer)(input);
  };

export const writeMemory =
  (writer: Writer) =>
  (input: MemoryWriteValue): Effect.Effect<MemoryResult, StoreFailure, Database> => {
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
