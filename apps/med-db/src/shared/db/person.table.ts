import { searchKeyColumns } from "@masseater.dev/like-pattern/column";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const person = sqliteTable("person", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  ...searchKeyColumns,
});

export const personAlias = sqliteTable(
  "person_alias",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    alias: text().notNull(),
    ...searchKeyColumns,
  },
  (table) => [
    unique().on(table.personId, table.alias),
    index("person_alias_alias_idx").on(table.alias),
  ],
);
