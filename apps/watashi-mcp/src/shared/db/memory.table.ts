import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { retractableColumns } from "./retractable.ts";

const memory = sqliteTable(
  "memory",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    project: text("project").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    evidence: text("evidence").notNull().default("[]"),
    ...retractableColumns,
  },
  (table) => [uniqueIndex("memory_project_name_idx").on(table.project, table.name)],
);

type Memory = typeof memory.$inferSelect;

export { memory };
export type { Memory };
