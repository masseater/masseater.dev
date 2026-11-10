import { Effect } from "effect";

import { conversationChunk, conversationSession } from "#/features/mcp/model/conversation.table";
import type {
  ConversationChunk,
  ConversationSession,
} from "#/features/mcp/model/conversation.table";
import { db } from "#/shared/db/index.server";

import { attempt } from "./storage.server";
import type { WriteFailure } from "./storage.server";

type ChunkRecord = ConversationChunk &
  Pick<ConversationSession, "cwd" | "source" | "remoteSession">;

const appendChunk = ({
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

export { appendChunk };
export type { ChunkRecord };
