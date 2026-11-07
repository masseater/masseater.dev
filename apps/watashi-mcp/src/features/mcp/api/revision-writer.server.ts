import { and, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { revision } from "#/features/mcp/model/revision.table";
import type { RevisionEntity, RevisionOp } from "#/features/mcp/model/revision.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { encodeJson, query } from "./storage.server";

type RevisionRecord = Readonly<{
  entity: RevisionEntity;
  entityId: string;
  op: RevisionOp;
  body: unknown;
  actor: string;
  at: string;
}>;

type RecordKey = Pick<RevisionRecord, "entity" | "entityId">;

const FIRST_REV = 1;

const nextRev = ({ entity, entityId }: RecordKey): Effect.Effect<number, StorageFailed> =>
  query(() =>
    db
      .select({ rev: max(revision.rev) })
      .from(revision)
      .where(and(eq(revision.entity, entity), eq(revision.entityId, entityId))),
  ).pipe(
    Effect.map((rows) =>
      pipe(
        Arr.head(rows),
        Option.flatMap((row) => Option.fromNullishOr(row.rev)),
        Option.match({ onNone: () => FIRST_REV, onSome: (rev) => rev + FIRST_REV }),
      ),
    ),
  );

const commit =
  (record: RevisionRecord) =>
  (write: BatchItem<"sqlite">): Effect.Effect<void, StorageFailed> =>
    Effect.gen(function* commitWithRevision() {
      const rev = yield* nextRev(record);
      const body = yield* encodeJson(record.body);
      yield* query(() => db.batch([write, db.insert(revision).values({ ...record, rev, body })]));
    });

export { commit };
export type { RevisionRecord };
