import { and, asc, eq, gt, lt, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Effect } from "effect";

import { conversationChunk } from "#/features/mcp/model/conversation.table";
import type { ConversationChunk } from "#/features/mcp/model/conversation.table";
import { lifeRecord } from "#/features/mcp/model/life-record.table";
import type { LifeRow } from "#/features/mcp/model/life-record.table";
import { memory } from "#/features/mcp/model/memory.table";
import type { Memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { SELF } from "./life-record";
import { query } from "./storage.server";
import type { ChunkPositionValue, RowPositionValue } from "./trait-batch";

type Window<Position> = Readonly<{ position: Position; before: string }>;

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

const memoriesAfter = ({
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

const lifeAfter = ({
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

const chunksAfter = ({
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

export { chunksAfter, lifeAfter, memoriesAfter };
export type { Window };
