import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  theme: text("theme").notNull(),
  entries: integer("entries").notNull(),
  record: text("record").notNull(),
});
