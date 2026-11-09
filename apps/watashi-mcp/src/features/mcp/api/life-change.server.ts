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
import type { Notice } from "./life-vocabulary.server";
import { Snapshot, replaceRecord, snapshotOf } from "./life-writer.server";
import type { Writer } from "./life-writer.server";
import { nowIso } from "./storage.server";

type ChangeFailure = Exclude<StoreFailure, Readonly<{ _tag: "MemoryNotFound" }>>;

type LifeRecordName = LifeEntry["row"]["record"];

type Action = (entry: LifeEntry) => Effect.Effect<ItemResult, ChangeFailure>;

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

const updateEntry =
  (writer: Writer, change: ChangeValue): Action =>
  (entry) =>
    Effect.gen(function* updateLifeRecord() {
      const { record } = entry.row;
      const { body, assumed } = yield* normalize(record)(mergedBody(entry.body, change));
      const valid = yield* validateBody(record)(body);
      const vocabulary = yield* vocabularyFor(writer, record)(valid);
      const snapshot = { ...snapshotOf(entry), body: valid };
      yield* replaceRecord(writer)({ entry, snapshot, op: "update" });
      const ref = refOf(entry.row);
      return { ref, notices: [...vocabulary, ...assumedNotices(ref)(assumed)] };
    });

const retractEntry =
  (writer: Writer, reason: Option.Option<string>): Action =>
  (entry) =>
    Effect.gen(function* retractLifeRecord() {
      const retractReason = yield* Effect.fromOption(reason).pipe(
        Effect.mapError(() => invalid("Pass reason together with retract.")),
      );
      const retractedAt = yield* nowIso;
      const snapshot = { ...snapshotOf(entry), retractedAt, retractReason };
      yield* replaceRecord(writer)({ entry, snapshot, op: "retract" });
      return { ref: refOf(entry.row), notices: [] };
    });

const restoreEntry =
  (writer: Writer, rev: number): Action =>
  (entry) =>
    Effect.gen(function* restoreLifeRecord() {
      const { record, id } = entry.row;
      const revision = yield* findRevision({ entity: record, id, rev });
      const snapshot = yield* decodeSnapshot(revision.body).pipe(Effect.orDie);
      yield* replaceRecord(writer)({ entry, snapshot, op: "restore" });
      return { ref: refOf(entry.row), notices: [] };
    });

const actionOf = (writer: Writer, change: ChangeValue): Action => {
  const restoreTo = Option.fromUndefinedOr(change.restoreTo);
  if (Option.isSome(restoreTo)) {
    return restoreEntry(writer, restoreTo.value);
  }
  if (change.retract === true) {
    return retractEntry(writer, Option.fromUndefinedOr(change.reason));
  }
  return updateEntry(writer, change);
};

const changeItem =
  (writer: Writer) =>
  (change: ChangeValue): Effect.Effect<ItemResult, ChangeFailure> =>
    lifeKeyOf(change.ref).pipe(
      Effect.flatMap(findRecord),
      Effect.flatMap(actionOf(writer, change)),
    );

export { changeItem };
export type { ChangeFailure };
