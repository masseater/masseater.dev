import { Array as Arr, Effect, Option, Predicate, Record as Rec, Schema } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { findRevision } from "./history-store.server";
import { assumedNotices, invalid, lifeKeyOf, normalize, validateBody } from "./life-checks";
import type { ItemResult } from "./life-checks";
import type { ChangeValue } from "./life-input";
import { refOf } from "./life-record";
import type { Body } from "./life-record";
import { findRecord } from "./life-store.server";
import type { LifeEntry } from "./life-store.server";
import { vocabularyNotices } from "./life-vocabulary.server";
import type { Notice, ValuesCheck } from "./life-vocabulary.server";
import { Snapshot, replaceRecord, snapshotOf } from "./life-writer.server";
import type { SnapshotValue, Writer } from "./life-writer.server";
import { nowIso } from "./storage.server";

type ChangeFailure = Exclude<StoreFailure, Readonly<{ _tag: "MemoryNotFound" }>>;

type LifeRecordName = LifeEntry["row"]["record"];

type Action = (entry: LifeEntry) => Effect.Effect<ItemResult, ChangeFailure>;

type Check = (entry: LifeEntry) => Effect.Effect<void, ChangeFailure>;

type Merged = Readonly<{ record: LifeRecordName; body: Body; assumed: readonly string[] }>;

type Steps<Result> = Readonly<{
  restore: (rev: number) => Result;
  retract: (reason: Option.Option<string>) => Result;
  update: () => Result;
}>;

const CONTROL_KEYS = ["ref", "retract", "reason", "restoreTo"] as const;

const decodeSnapshot = Schema.decodeUnknownEffect(Schema.fromJsonString(Snapshot));

const applyField = (out: Body, [key, value]: readonly [string, unknown]): Body => {
  if (Predicate.isNull(value)) {
    return Rec.remove(out, key);
  }
  return { ...out, [key]: value };
};

const fieldsOf = (change: ChangeValue): Body => {
  const fields: Body = change;
  return Arr.reduce(CONTROL_KEYS, fields, (rest, key) => Rec.remove(rest, key));
};

const mergedBody = (body: Body, change: ChangeValue): Body =>
  Arr.reduce(Rec.toEntries(fieldsOf(change)), body, applyField);

const vocabularyFor =
  (writer: Writer, record: LifeRecordName) =>
  (body: Body): Effect.Effect<readonly Notice[], ChangeFailure> => {
    if (record === "life_event") {
      return vocabularyNotices(writer)(body);
    }
    return Effect.succeed<readonly Notice[]>([]);
  };

const mergedOf = (entry: LifeEntry, change: ChangeValue): Effect.Effect<Merged, ChangeFailure> =>
  Effect.gen(function* mergeLifeRecord() {
    const { record } = entry.row;
    const { body, assumed } = yield* normalize(record)(mergedBody(entry.body, change));
    const valid = yield* validateBody(record)(body);
    return { record, body: valid, assumed };
  });

const reasonOf = (reason: Option.Option<string>): Effect.Effect<string, ChangeFailure> =>
  Effect.fromOption(reason).pipe(
    Effect.mapError(() => invalid("Pass reason together with retract.")),
  );

const restoredOf = (entry: LifeEntry, rev: number): Effect.Effect<SnapshotValue, ChangeFailure> => {
  const { record, id } = entry.row;
  return findRevision({ entity: record, id, rev }).pipe(
    Effect.flatMap((revision) => decodeSnapshot(revision.body).pipe(Effect.orDie)),
  );
};

const updateEntry =
  (writer: Writer, change: ChangeValue): Action =>
  (entry) =>
    Effect.gen(function* updateLifeRecord() {
      const { record, body, assumed } = yield* mergedOf(entry, change);
      const vocabulary = yield* vocabularyFor(writer, record)(body);
      const snapshot = { ...snapshotOf(entry), body };
      yield* replaceRecord(writer)({ entry, snapshot, op: "update" });
      const ref = refOf(entry.row);
      return { ref, notices: [...vocabulary, ...assumedNotices(ref)(assumed)] };
    });

const retractEntry =
  (writer: Writer, reason: Option.Option<string>): Action =>
  (entry) =>
    Effect.gen(function* retractLifeRecord() {
      const retractReason = yield* reasonOf(reason);
      const retractedAt = yield* nowIso;
      const snapshot = { ...snapshotOf(entry), retractedAt, retractReason };
      yield* replaceRecord(writer)({ entry, snapshot, op: "retract" });
      return { ref: refOf(entry.row), notices: [] };
    });

const restoreEntry =
  (writer: Writer, rev: number): Action =>
  (entry) =>
    Effect.gen(function* restoreLifeRecord() {
      const snapshot = yield* restoredOf(entry, rev);
      yield* replaceRecord(writer)({ entry, snapshot, op: "restore" });
      return { ref: refOf(entry.row), notices: [] };
    });

const stepOf = <Result>(change: ChangeValue, steps: Steps<Result>): Result => {
  const restoreTo = Option.fromUndefinedOr(change.restoreTo);
  if (Option.isSome(restoreTo)) {
    return steps.restore(restoreTo.value);
  }
  if (change.retract === true) {
    return steps.retract(Option.fromUndefinedOr(change.reason));
  }
  return steps.update();
};

const actionOf = (writer: Writer, change: ChangeValue): Action =>
  stepOf(change, {
    restore: (rev) => restoreEntry(writer, rev),
    retract: (reason) => retractEntry(writer, reason),
    update: () => updateEntry(writer, change),
  });

const checkOf = (checkValues: ValuesCheck, change: ChangeValue): Check =>
  stepOf(change, {
    restore: (rev) => (entry) => Effect.asVoid(restoredOf(entry, rev)),
    retract: (reason) => () => Effect.asVoid(reasonOf(reason)),
    update: () => (entry) => mergedOf(entry, change).pipe(Effect.flatMap(checkValues)),
  });

const entryOf = (change: ChangeValue): Effect.Effect<LifeEntry, ChangeFailure> =>
  lifeKeyOf(change.ref).pipe(Effect.flatMap(findRecord));

const checkChange =
  (checkValues: ValuesCheck) =>
  (change: ChangeValue): Effect.Effect<void, ChangeFailure> =>
    entryOf(change).pipe(Effect.flatMap(checkOf(checkValues, change)));

const changeItem =
  (writer: Writer) =>
  (change: ChangeValue): Effect.Effect<ItemResult, ChangeFailure> =>
    entryOf(change).pipe(Effect.flatMap(actionOf(writer, change)));

export { changeItem, checkChange };
export type { ChangeFailure };
