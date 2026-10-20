import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const star = sqliteTable(
  "star",
  {
    category: text().notNull(),
    slug: text().notNull(),
    visitor: text().notNull(),
  },
  (table) => [primaryKey({ columns: [table.category, table.slug, table.visitor] })],
);
