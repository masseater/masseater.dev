import { and, asc, count, desc, eq, gte, max, sum } from "drizzle-orm";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { conversationChunk, conversationSession } from "#/features/mcp/model/conversation.table";
import type {
  ConversationChunk,
  ConversationKind,
  ConversationSession,
} from "#/features/mcp/model/conversation.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { query } from "./storage.server";

export type SessionKey = Readonly<{ kind: ConversationKind; sessionId: string }>;

export type FileKey = SessionKey & Readonly<{ file: string }>;

export type ChunkKey = FileKey & Readonly<{ start: number }>;

export type ChunkPage = FileKey & Readonly<{ cursor: number; limit: number }>;

export type SessionPage = Readonly<{ kind: ConversationKind; limit: number }>;

export type FileSummary = Readonly<{
  file: string;
  bytes: number;
  chunks: number;
  redactions: number;
}>;

export type SessionSummary = ConversationSession & Readonly<{ files: readonly FileSummary[] }>;

type FileTotals = Readonly<{
  file: string;
  bytes: number | null;
  chunks: number;
  redactions: string | null;
}>;

const NOTHING = 0;

const sameFile = ({ kind, sessionId, file }: FileKey): ReturnType<typeof and> =>
  and(
    eq(conversationChunk.kind, kind),
    eq(conversationChunk.sessionId, sessionId),
    eq(conversationChunk.file, file),
  );

const orNothing = (value: number | null): number =>
  pipe(
    Option.fromNullishOr(value),
    Option.getOrElse(() => NOTHING),
  );

export const committedEnd = (key: FileKey): Effect.Effect<number, StorageFailed> =>
  query(() =>
    db
      .select({ end: max(conversationChunk.end) })
      .from(conversationChunk)
      .where(sameFile(key)),
  ).pipe(
    Effect.map((rows) =>
      pipe(
        Arr.head(rows),
        Option.match({ onNone: () => NOTHING, onSome: (row) => orNothing(row.end) }),
      ),
    ),
  );

export const chunkAt = ({
  start,
  ...key
}: ChunkKey): Effect.Effect<Option.Option<ConversationChunk>, StorageFailed> =>
  query(() =>
    db
      .select()
      .from(conversationChunk)
      .where(and(sameFile(key), eq(conversationChunk.start, start))),
  ).pipe(Effect.map(Arr.head));

const toFileSummary = ({ file, bytes, chunks, redactions }: FileTotals): FileSummary => ({
  file,
  bytes: orNothing(bytes),
  chunks,
  redactions: pipe(
    Option.fromNullishOr(redactions),
    Option.match({ onNone: () => NOTHING, onSome: Number }),
  ),
});

export const filesOf = ({
  kind,
  sessionId,
}: SessionKey): Effect.Effect<readonly FileSummary[], StorageFailed> =>
  query(() =>
    db
      .select({
        file: conversationChunk.file,
        bytes: max(conversationChunk.end),
        chunks: count(),
        redactions: sum(conversationChunk.redactions),
      })
      .from(conversationChunk)
      .where(and(eq(conversationChunk.kind, kind), eq(conversationChunk.sessionId, sessionId)))
      .groupBy(conversationChunk.file)
      .orderBy(asc(conversationChunk.file)),
  ).pipe(Effect.map(Arr.map(toFileSummary)));

const withFiles = (session: ConversationSession): Effect.Effect<SessionSummary, StorageFailed> =>
  filesOf(session).pipe(Effect.map((files) => ({ ...session, files })));

export const listSessions = ({
  kind,
  limit,
}: SessionPage): Effect.Effect<readonly SessionSummary[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(conversationSession)
      .where(eq(conversationSession.kind, kind))
      .orderBy(desc(conversationSession.lastAt))
      .limit(limit),
  ).pipe(Effect.flatMap(Effect.forEach(withFiles)));

export const chunksFrom = ({
  cursor,
  limit,
  ...key
}: ChunkPage): Effect.Effect<readonly ConversationChunk[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(conversationChunk)
      .where(and(sameFile(key), gte(conversationChunk.start, cursor)))
      .orderBy(asc(conversationChunk.start))
      .limit(limit),
  );
