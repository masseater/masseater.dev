import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const uploads = sqliteTable(
  "uploads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day").notNull(),
  },
  (table) => [index("uploads_day_idx").on(table.day, table.id)],
);

export const objectReads = sqliteTable(
  "object_reads",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day").notNull(),
  },
  (table) => [index("object_reads_day_idx").on(table.day, table.id)],
);
