import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const claudeRequests = sqliteTable(
  "claude_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    text: text("text").notNull(),
    sender: text("sender").notNull(),
    createdAt: integer("created_at").notNull(),
    takenAt: integer("taken_at"),
    threadUrl: text("thread_url"),
    reply: text("reply"),
    repliedAt: integer("replied_at"),
  },
  (table) => [index("claude_requests_taken_at_idx").on(table.takenAt)],
);

export { claudeRequests };
