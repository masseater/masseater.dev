import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const CONVERSATION_KINDS = ["claude-code"] as const;

const conversationSession = sqliteTable(
  "conversation_session",
  {
    kind: text("kind", { enum: CONVERSATION_KINDS }).notNull(),
    sessionId: text("session_id").notNull(),
    cwd: text("cwd").notNull(),
    source: text("source").notNull(),
    remoteSession: text("remote_session").notNull(),
    firstAt: text("first_at").notNull(),
    lastAt: text("last_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.kind, table.sessionId] }),
    index("conversation_session_last_at_idx").on(table.lastAt),
  ],
);

const conversationChunk = sqliteTable(
  "conversation_chunk",
  {
    kind: text("kind", { enum: CONVERSATION_KINDS }).notNull(),
    sessionId: text("session_id").notNull(),
    file: text("file").notNull(),
    start: integer("start").notNull(),
    end: integer("end").notNull(),
    redactions: integer("redactions").notNull(),
    storedBytes: integer("stored_bytes").notNull(),
    objectKey: text("object_key").notNull(),
    at: text("at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.kind, table.sessionId, table.file, table.start] })],
);

type ConversationSession = typeof conversationSession.$inferSelect;

type ConversationChunk = typeof conversationChunk.$inferSelect;

type ConversationKind = ConversationChunk["kind"];

export { CONVERSATION_KINDS, conversationChunk, conversationSession };
export type { ConversationChunk, ConversationKind, ConversationSession };
