import { Effect } from "effect";

import { conversationChunk, conversationSession } from "#/shared/db";
import type { ConversationChunk, ConversationSession } from "#/shared/db";
import { db, attempt } from "#/shared/db/index.server";
import type { WriteFailure } from "#/shared/db/index.server";

export type ChunkRecord = ConversationChunk &
  Pick<ConversationSession, "cwd" | "source" | "remoteSession">;

export const appendChunk = ({
  cwd,
  source,
  remoteSession,
  ...chunk
}: ChunkRecord): Effect.Effect<void, WriteFailure> =>
  attempt(() =>
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
  ).pipe(Effect.asVoid);
