import { searchKeyColumns } from "@masseater.dev/like-pattern/column";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { retractableColumns } from "./retractable.ts";

export const memory = sqliteTable(
  "memory",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    project: text("project").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    content: text("content").notNull(),
    evidence: text("evidence").notNull().default("[]"),
    view: text("view").notNull().default(""),
    ...searchKeyColumns,
    ...retractableColumns,
  },
  (table) => [uniqueIndex("memory_project_name_idx").on(table.project, table.name)],
);

export type Memory = typeof memory.$inferSelect;
