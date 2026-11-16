import { and, asc, count, desc, eq, gte, inArray, max, sum } from "drizzle-orm";
import { Array as Arr, Effect, Option, pipe } from "effect";

import { db, query } from "#/shared/db/index.server.ts";
import { conversationChunk, conversationSession } from "#/shared/db/index.ts";
import type {
  ConversationChunk,
  ConversationKind,
  ConversationSession,
  StorageFailed,
} from "#/shared/db/index.ts";

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

type SessionFileTotals = FileTotals & Readonly<{ sessionId: string }>;

const recentSessions = ({
  kind,
  limit,
}: SessionPage): Effect.Effect<readonly ConversationSession[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(conversationSession)
      .where(eq(conversationSession.kind, kind))
      .orderBy(desc(conversationSession.lastAt))
      .limit(limit),
  );

const recentFiles = ({
  kind,
  limit,
}: SessionPage): Effect.Effect<readonly SessionFileTotals[], StorageFailed> => {
  const recent = db
    .select({ sessionId: conversationSession.sessionId })
    .from(conversationSession)
    .where(eq(conversationSession.kind, kind))
    .orderBy(desc(conversationSession.lastAt))
    .limit(limit);
  const inPage = and(
    eq(conversationChunk.kind, kind),
    inArray(conversationChunk.sessionId, recent),
  );
  return query(() =>
    db
      .select({
        sessionId: conversationChunk.sessionId,
        file: conversationChunk.file,
        bytes: max(conversationChunk.end),
        chunks: count(),
        redactions: sum(conversationChunk.redactions),
      })
      .from(conversationChunk)
      .where(inPage)
      .groupBy(conversationChunk.sessionId, conversationChunk.file)
      .orderBy(asc(conversationChunk.file)),
  );
};

const NO_FILES: readonly FileSummary[] = [];

const summaryWith =
  (bySession: Readonly<Record<string, readonly SessionFileTotals[]>>) =>
  (session: ConversationSession): SessionSummary => ({
    ...session,
    files: pipe(
      Option.fromUndefinedOr(bySession[session.sessionId]),
      Option.match({ onNone: () => NO_FILES, onSome: Arr.map(toFileSummary) }),
    ),
  });

const attachFiles = ([sessions, files]: readonly [
  readonly ConversationSession[],
  readonly SessionFileTotals[],
]): readonly SessionSummary[] => {
  const bySession = pipe(
    files,
    Arr.groupBy((row) => row.sessionId),
  );
  return pipe(sessions, Arr.map(summaryWith(bySession)));
};

export const listSessions = (
  page: SessionPage,
): Effect.Effect<readonly SessionSummary[], StorageFailed> =>
  Effect.all([recentSessions(page), recentFiles(page)], { concurrency: "unbounded" }).pipe(
    Effect.map(attachFiles),
  );

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
