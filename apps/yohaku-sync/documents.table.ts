import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const documents = sqliteTable(
  "documents",
  {
    revision: integer("revision").primaryKey({ autoIncrement: true }),
    kind: text("kind", { enum: ["manuscript", "source"] }).notNull(),
    id: text("id").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deleted: integer("deleted", { mode: "boolean" }).notNull(),
    body: text("body").notNull(),
  },
  (table) => [uniqueIndex("documents_kind_id_idx").on(table.kind, table.id)],
);

export { documents };
