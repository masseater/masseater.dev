import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const marks = sqliteTable(
  "marks",
  {
    id: text("id").primaryKey(),
    site: text("site").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    fromSeconds: real("from_seconds").notNull(),
    toSeconds: real("to_seconds").notNull(),
    verb: text("verb").notNull(),
    aspects: text("aspects").notNull(),
    words: text("words").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("marks_source").on(table.site, table.sourceId)],
);
