import { and, desc, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { db } from "./client.server.ts";
import { RevisionNotFound } from "./revision-not-found";
import { revision } from "./revision.table.ts";
import type { Revision, RevisionEntity } from "./revision.table.ts";
import type { StorageFailed } from "./storage-failed";
import { firstRow, query } from "./storage.server.ts";

type RecordRef = Readonly<{ entity: RevisionEntity; id: number }>;

type HistoryQuery = RecordRef & Readonly<{ limit: number }>;

type RevisionRef = RecordRef & Readonly<{ rev: number }>;

type HistoryEntry = Omit<Revision, "body"> & Readonly<{ body: unknown }>;

const decodeJson = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const entryOf = ({ body, ...row }: Revision): Effect.Effect<HistoryEntry> =>
  decodeJson(body).pipe(
    Effect.orDie,
    Effect.map((decoded) => ({ ...row, body: decoded })),
  );

const listHistory = ({
  entity,
  id,
  limit,
}: HistoryQuery): Effect.Effect<readonly HistoryEntry[], StorageFailed> => {
  const ofRecord = and(eq(revision.entity, entity), eq(revision.entityId, String(id)));
  return query(() =>
    db.select().from(revision).where(ofRecord).orderBy(desc(revision.rev)).limit(limit),
  ).pipe(Effect.flatMap(Effect.forEach(entryOf)));
};

const findRevision = ({
  entity,
  id,
  rev,
}: RevisionRef): Effect.Effect<Revision, RevisionNotFound | StorageFailed> => {
  const entityId = String(id);
  const ofRevision = and(
    eq(revision.entity, entity),
    eq(revision.entityId, entityId),
    eq(revision.rev, rev),
  );
  return query(() => db.select().from(revision).where(ofRevision)).pipe(
    Effect.flatMap(firstRow(() => RevisionNotFound.make({ entity, entityId, rev }))),
  );
};

export { findRevision, listHistory };
export type { HistoryEntry, HistoryQuery, RecordRef, RevisionRef };
