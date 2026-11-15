import { eq, max } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { NOT_RETRACTED, SOURCES, lifeRecord } from "#/shared/db";
import type { LifeRecordName, Source, RevisionOp, StorageFailed } from "#/shared/db";
import {
  db,
  commitAll,
  numbered,
  attempt,
  encodeJson,
  nextAfterMax,
  nowIso,
} from "#/shared/db/index.server";
import type { RevisedWrite, WriteFailure } from "#/shared/db/index.server";

import { columnsOf } from "./life-record";
import type { Body } from "./life-record";
import type { LifeEntry } from "./life-store.server.ts";

export const Snapshot = Schema.Struct({
  source: Schema.Literals(SOURCES),
  body: Schema.Record(Schema.String, Schema.Unknown),
  retractedAt: Schema.String,
  retractReason: Schema.String,
});

export type SnapshotValue = typeof Snapshot.Type;

export type NewRecord = Readonly<{ record: LifeRecordName; source: Source; body: Body }>;

export type Writer = Readonly<{ actor: string }>;

export type Replacement = Readonly<{ entry: LifeEntry; snapshot: SnapshotValue; op: RevisionOp }>;

export type Succession = Readonly<{ ended: Replacement; created: NewRecord }>;

type Stamp = Readonly<{ actor: string; now: string }>;

type Numbered = NewRecord & Readonly<{ id: number }>;

const NO_REASON = "";

const nextId: Effect.Effect<number, WriteFailure> = attempt(() =>
  db.select({ max: max(lifeRecord.id) }).from(lifeRecord),
).pipe(Effect.map(nextAfterMax));

export const snapshotOf = ({ row, body }: LifeEntry): SnapshotValue => ({
  source: row.source,
  body,
  retractedAt: row.retractedAt,
  retractReason: row.retractReason,
});

const insertion =
  ({ actor, now }: Stamp) =>
  ({ id, record, source, body }: Numbered): Effect.Effect<RevisedWrite> =>
    Effect.gen(function* insertLifeRow() {
      const encoded = yield* encodeJson(body);
      const snapshot: SnapshotValue = {
        source,
        body,
        retractedAt: NOT_RETRACTED,
        retractReason: NO_REASON,
      };
      const row = { id, record, source, ...columnsOf(record)(body), body: encoded };
      return {
        record: {
          entity: record,
          entityId: String(id),
          op: "create",
          body: snapshot,
          actor,
          at: now,
        },
        write: db.insert(lifeRecord).values({ ...row, createdAt: now, updatedAt: now }),
      };
    });

const replacement =
  ({ actor, now }: Stamp) =>
  ({ entry, snapshot, op }: Replacement): Effect.Effect<RevisedWrite> =>
    Effect.gen(function* replaceLifeRow() {
      const { record, id } = entry.row;
      const encoded = yield* encodeJson(snapshot.body);
      const columns = { ...columnsOf(record)(snapshot.body), body: encoded };
      return {
        record: { entity: record, entityId: String(id), op, body: snapshot, actor, at: now },
        write: db
          .update(lifeRecord)
          .set({ ...snapshot, ...columns, updatedAt: now })
          .where(eq(lifeRecord.id, id)),
      };
    });

export const insertRecord =
  ({ actor }: Writer) =>
  (created: NewRecord): Effect.Effect<number, StorageFailed> =>
    Effect.gen(function* insertLifeRecord() {
      const now = yield* nowIso;
      const id = yield* nextId;
      const inserted = yield* insertion({ actor, now })({ ...created, id });
      yield* commitAll([inserted]);
      return id;
    }).pipe(numbered);

export const replaceRecord =
  ({ actor }: Writer) =>
  (replaced: Replacement): Effect.Effect<void, StorageFailed> =>
    Effect.gen(function* replaceLifeRecord() {
      const now = yield* nowIso;
      const changed = yield* replacement({ actor, now })(replaced);
      yield* commitAll([changed]);
    }).pipe(numbered);

export const succeedRecord =
  ({ actor }: Writer) =>
  ({ ended, created }: Succession): Effect.Effect<number, StorageFailed> =>
    Effect.gen(function* succeedLifeRecord() {
      const now = yield* nowIso;
      const id = yield* nextId;
      const changed = yield* replacement({ actor, now })(ended);
      const inserted = yield* insertion({ actor, now })({ ...created, id });
      yield* commitAll([changed, inserted]);
      return id;
    }).pipe(numbered);
