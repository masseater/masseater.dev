import { and, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, pipe } from "effect";

import { revision } from "#/features/mcp/model/revision.table";
import type { RevisionEntity, RevisionOp } from "#/features/mcp/model/revision.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { attempt, encodeJson, nextAfterMax, toStorageFailed } from "./storage.server";
import type { WriteFailure } from "./storage.server";

type RevisionRecord = Readonly<{
  entity: RevisionEntity;
  entityId: string;
  op: RevisionOp;
  body: unknown;
  actor: string;
  at: string;
}>;

type RecordKey = Pick<RevisionRecord, "entity" | "entityId">;

type Statement = BatchItem<"sqlite">;

type RevisedWrite = Readonly<{ record: RevisionRecord; write: Statement }>;

const COLLISION_RETRIES = 2;

const nextRev = ({ entity, entityId }: RecordKey): Effect.Effect<number, WriteFailure> =>
  attempt(() =>
    db
      .select({ max: max(revision.rev) })
      .from(revision)
      .where(and(eq(revision.entity, entity), eq(revision.entityId, entityId))),
  ).pipe(Effect.map(nextAfterMax));

const statementsOf = ({
  record,
  write,
}: RevisedWrite): Effect.Effect<Arr.NonEmptyReadonlyArray<Statement>, WriteFailure> =>
  Effect.gen(function* withRevision() {
    const rev = yield* nextRev(record);
    const body = yield* encodeJson(record.body);
    return [write, db.insert(revision).values({ ...record, rev, body })];
  });

const commitAll = (
  writes: Arr.NonEmptyReadonlyArray<RevisedWrite>,
): Effect.Effect<void, WriteFailure> =>
  pipe(
    writes,
    Effect.forEach(statementsOf),
    Effect.flatMap((statements) => attempt(() => db.batch(Arr.flatten(statements)))),
    Effect.asVoid,
  );

const commit =
  (record: RevisionRecord) =>
  (write: Statement): Effect.Effect<void, WriteFailure> =>
    commitAll([{ record, write }]);

const numbered = <Value>(
  write: Effect.Effect<Value, WriteFailure>,
): Effect.Effect<Value, StorageFailed> =>
  write.pipe(
    Effect.retry({ times: COLLISION_RETRIES, while: (failure) => failure.duplicate }),
    Effect.mapError(toStorageFailed),
  );

export { commit, commitAll, numbered };
export type { RevisedWrite, RevisionRecord, Statement };
