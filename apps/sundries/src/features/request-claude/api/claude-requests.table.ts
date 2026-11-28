import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const claudeRequests = sqliteTable(
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
    project: text("project"),
    scheduleId: text("schedule_id"),
    slot: integer("slot"),
    wokenAt: integer("woken_at"),
  },
  (table) => [
    index("claude_requests_taken_at_idx").on(table.takenAt),
    uniqueIndex("claude_requests_schedule_slot_idx").on(table.scheduleId, table.slot),
  ],
);
