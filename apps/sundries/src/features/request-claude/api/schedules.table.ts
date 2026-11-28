import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const schedules = sqliteTable("schedules", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cron: text("cron").notNull(),
  timezone: text("timezone").notNull(),
  project: text("project"),
  model: text("model"),
  prompt: text("prompt").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const scheduleRevisions = sqliteTable(
  "schedule_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    scheduleId: text("schedule_id").notNull(),
    definition: text("definition").notNull(),
    changedBy: text("changed_by").notNull(),
    changedAt: integer("changed_at").notNull(),
  },
  (table) => [index("schedule_revisions_schedule_id_idx").on(table.scheduleId)],
);
