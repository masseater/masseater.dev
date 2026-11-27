import { and, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, pipe } from "effect";

import { Database } from "./client.server.ts";
import { revision } from "./revision.table.ts";
import type { RevisionEntity, RevisionOp } from "./revision.table.ts";
import type { StorageFailed } from "./storage-failed.ts";
import { attempt, encodeJson, nextAfterMax, toStorageFailed } from "./storage.server.ts";
import type { WriteFailure } from "./storage.server.ts";

export type RevisionRecord = Readonly<{
  entity: RevisionEntity;
  entityId: string;
  op: RevisionOp;
  body: unknown;
  actor: string;
  at: string;
}>;

type RecordKey = Pick<RevisionRecord, "entity" | "entityId">;

export type Statement = BatchItem<"sqlite">;

export type RevisedWrite = Readonly<{ record: RevisionRecord; write: Statement }>;

const COLLISION_RETRIES = 2;

const nextRev = ({ entity, entityId }: RecordKey): Effect.Effect<number, WriteFailure, Database> =>
  attempt((db) =>
    db
      .select({ max: max(revision.rev) })
      .from(revision)
      .where(and(eq(revision.entity, entity), eq(revision.entityId, entityId))),
  ).pipe(Effect.map(nextAfterMax));

const statementsOf = ({
  record,
  write,
}: RevisedWrite): Effect.Effect<Arr.NonEmptyReadonlyArray<Statement>, WriteFailure, Database> =>
  Effect.gen(function* withRevision() {
    const db = yield* Database;
    const rev = yield* nextRev(record);
    const body = yield* encodeJson(record.body);
    return [write, db.insert(revision).values({ ...record, rev, body })];
  });

export type Commit = Readonly<{
  writes: Arr.NonEmptyReadonlyArray<RevisedWrite>;
  extra: readonly Statement[];
}>;

export const commitWith = ({
  writes,
  extra,
}: Commit): Effect.Effect<void, WriteFailure, Database> =>
  pipe(
    writes,
    (items) => Effect.forEach(items, statementsOf, { concurrency: 1 }),
    Effect.flatMap((statements) =>
      attempt((db) => db.batch(Arr.appendAll(Arr.flatten(statements), extra))),
    ),
    Effect.asVoid,
  );

export const commitAll = (
  writes: Arr.NonEmptyReadonlyArray<RevisedWrite>,
): Effect.Effect<void, WriteFailure, Database> => commitWith({ writes, extra: [] });

export const commit =
  (record: RevisionRecord) =>
  (write: Statement): Effect.Effect<void, WriteFailure, Database> =>
    commitAll([{ record, write }]);

export const numbered = <Value, Services>(
  write: Effect.Effect<Value, WriteFailure, Services | Database>,
): Effect.Effect<Value, StorageFailed, Services | Database> =>
  write.pipe(
    Effect.retry({ times: COLLISION_RETRIES, while: (failure) => failure.duplicate }),
    Effect.mapError(toStorageFailed),
  );
