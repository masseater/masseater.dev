import { and, desc, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";

import { RevisionNotFound } from "#/features/mcp/model/revision-not-found";
import { revision } from "#/features/mcp/model/revision.table";
import type { Revision, RevisionEntity } from "#/features/mcp/model/revision.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { firstRow, query } from "./storage.server";

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
