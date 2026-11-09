import { eq, max } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { NOT_RETRACTED, SOURCES, lifeRecord } from "#/features/mcp/model/life-record.table";
import type { LifeRecordName, Source } from "#/features/mcp/model/life-record.table";
import type { RevisionOp } from "#/features/mcp/model/revision.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { columnsOf } from "./life-record";
import type { Body } from "./life-record";
import type { LifeEntry } from "./life-store.server";
import { commit } from "./revision-writer.server";
import { encodeJson, nextAfterMax, nowIso, query } from "./storage.server";

const Snapshot = Schema.Struct({
  source: Schema.Literals(SOURCES),
  body: Schema.Record(Schema.String, Schema.Unknown),
  retractedAt: Schema.String,
  retractReason: Schema.String,
});

type SnapshotValue = typeof Snapshot.Type;

type NewRecord = Readonly<{ record: LifeRecordName; source: Source; body: Body }>;

type Writer = Readonly<{ actor: string }>;

type Replacement = Readonly<{ entry: LifeEntry; snapshot: SnapshotValue; op: RevisionOp }>;

const NO_REASON = "";

const nextId: Effect.Effect<number, StorageFailed> = query(() =>
  db.select({ max: max(lifeRecord.id) }).from(lifeRecord),
).pipe(Effect.map(nextAfterMax));

const snapshotOf = ({ row, body }: LifeEntry): SnapshotValue => ({
  source: row.source,
  body,
  retractedAt: row.retractedAt,
  retractReason: row.retractReason,
});

const insertRecord =
  ({ actor }: Writer) =>
  ({ record, source, body }: NewRecord): Effect.Effect<number, StorageFailed> =>
    Effect.gen(function* insertLifeRecord() {
      const now = yield* nowIso;
      const id = yield* nextId;
      const encoded = yield* encodeJson(body);
      const snapshot: SnapshotValue = {
        source,
        body,
        retractedAt: NOT_RETRACTED,
        retractReason: NO_REASON,
      };
      const row = { id, record, source, ...columnsOf(record)(body), body: encoded };
      yield* commit({
        entity: record,
        entityId: String(id),
        op: "create",
        body: snapshot,
        actor,
        at: now,
      })(db.insert(lifeRecord).values({ ...row, createdAt: now, updatedAt: now }));
      return id;
    });

const replaceRecord =
  ({ actor }: Writer) =>
  ({ entry, snapshot, op }: Replacement): Effect.Effect<void, StorageFailed> =>
    Effect.gen(function* replaceLifeRecord() {
      const now = yield* nowIso;
      const { record, id } = entry.row;
      const encoded = yield* encodeJson(snapshot.body);
      const columns = { ...columnsOf(record)(snapshot.body), body: encoded };
      yield* commit({ entity: record, entityId: String(id), op, body: snapshot, actor, at: now })(
        db
          .update(lifeRecord)
          .set({ ...snapshot, ...columns, updatedAt: now })
          .where(eq(lifeRecord.id, id)),
      );
    });

export { Snapshot, insertRecord, replaceRecord, snapshotOf };
export type { NewRecord, Replacement, SnapshotValue, Writer };
