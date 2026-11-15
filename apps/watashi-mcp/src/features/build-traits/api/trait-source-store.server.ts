import { and, asc, eq, gt, lt, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Effect } from "effect";

import { SELF } from "#/entities/life-record";
import type { ChunkPositionValue, RowPositionValue } from "#/entities/trait";
import { conversationChunk, lifeRecord, memory } from "#/shared/db";
import type { ConversationChunk, LifeRow, Memory, StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

export type Window<Position> = Readonly<{ position: Position; before: string }>;

const ROW_PAGE = 100;

const CHUNK_PAGE = 16;

const memoryAfter = ({ at, id }: RowPositionValue): SQL | undefined =>
  or(gt(memory.updatedAt, at), and(eq(memory.updatedAt, at), gt(memory.id, id)));

const lifeAfterPosition = ({ at, id }: RowPositionValue): SQL | undefined =>
  or(gt(lifeRecord.updatedAt, at), and(eq(lifeRecord.updatedAt, at), gt(lifeRecord.id, id)));

const chunkAfter = ({ at, sessionId, file, start }: ChunkPositionValue): SQL | undefined => {
  const laterStart = gt(conversationChunk.start, start);
  const laterFile = or(
    gt(conversationChunk.file, file),
    and(eq(conversationChunk.file, file), laterStart),
  );
  const laterSession = or(
    gt(conversationChunk.sessionId, sessionId),
    and(eq(conversationChunk.sessionId, sessionId), laterFile),
  );
  return or(gt(conversationChunk.at, at), and(eq(conversationChunk.at, at), laterSession));
};

export const memoriesAfter = ({
  position,
  before,
}: Window<RowPositionValue>): Effect.Effect<readonly Memory[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(memory)
      .where(and(memoryAfter(position), lt(memory.updatedAt, before)))
      .orderBy(asc(memory.updatedAt), asc(memory.id))
      .limit(ROW_PAGE),
  );

const traitBearing = or(
  eq(lifeRecord.record, "owner_reflection"),
  and(eq(lifeRecord.record, "profile_fact"), eq(lifeRecord.about, SELF)),
);

export const lifeAfter = ({
  position,
  before,
}: Window<RowPositionValue>): Effect.Effect<readonly LifeRow[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(lifeRecord)
      .where(and(traitBearing, lifeAfterPosition(position), lt(lifeRecord.updatedAt, before)))
      .orderBy(asc(lifeRecord.updatedAt), asc(lifeRecord.id))
      .limit(ROW_PAGE),
  );

export const chunksAfter = ({
  position,
  before,
}: Window<ChunkPositionValue>): Effect.Effect<readonly ConversationChunk[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(conversationChunk)
      .where(and(chunkAfter(position), lt(conversationChunk.at, before)))
      .orderBy(
        asc(conversationChunk.at),
        asc(conversationChunk.sessionId),
        asc(conversationChunk.file),
        asc(conversationChunk.start),
      )
      .limit(CHUNK_PAGE),
  );
