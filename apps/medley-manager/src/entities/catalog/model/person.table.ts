import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

const person = sqliteTable("person", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
});

const personAlias = sqliteTable(
  "person_alias",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    personId: integer("person_id")
      .notNull()
      .references(() => person.id, { onDelete: "cascade" }),
    alias: text().notNull(),
  },
  (table) => [
    unique().on(table.personId, table.alias),
    index("person_alias_alias_idx").on(table.alias),
  ],
);

export { person, personAlias };
