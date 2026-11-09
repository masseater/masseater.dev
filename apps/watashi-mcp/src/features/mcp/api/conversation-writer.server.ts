import { Array as Arr, Effect, Option, Predicate, String as Str, pipe } from "effect";

import { conversationChunk, conversationSession } from "#/features/mcp/model/conversation.table";
import type {
  ConversationChunk,
  ConversationSession,
} from "#/features/mcp/model/conversation.table";
import { db } from "#/shared/db/index.server";

type ChunkRecord = ConversationChunk &
  Pick<ConversationSession, "cwd" | "source" | "remoteSession">;

type AppendFailure = Readonly<{ duplicate: boolean; message: string }>;

const UNIQUE_VIOLATION = "UNIQUE constraint failed";

const messagesOf = (cause: unknown): readonly string[] =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({
      onNone: () => [String(cause)],
      onSome: (error) => [error.message, ...messagesOf(error.cause ?? "")],
    }),
  );

const appendFailure = (cause: unknown): AppendFailure => {
  const messages = messagesOf(cause);
  return {
    duplicate: pipe(messages, Arr.some(Str.includes(UNIQUE_VIOLATION))),
    message: pipe(messages, Arr.join(": ")),
  };
};

const appendChunk = ({
  cwd,
  source,
  remoteSession,
  ...chunk
}: ChunkRecord): Effect.Effect<void, AppendFailure> =>
  Effect.tryPromise({
    try: () =>
      db.batch([
        db
          .insert(conversationSession)
          .values({
            kind: chunk.kind,
            sessionId: chunk.sessionId,
            cwd,
            source,
            remoteSession,
            firstAt: chunk.at,
            lastAt: chunk.at,
          })
          .onConflictDoUpdate({
            target: [conversationSession.kind, conversationSession.sessionId],
            set: { cwd, source, remoteSession, lastAt: chunk.at },
          }),
        db.insert(conversationChunk).values(chunk),
      ]),
    catch: appendFailure,
  }).pipe(Effect.asVoid);

export { appendChunk };
export type { AppendFailure, ChunkRecord };
