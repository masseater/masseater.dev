import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable(
  "entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: text("value"),
    valueBytes: integer("value_bytes").notNull(),
    blobBytes: integer("blob_bytes"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("entries_namespace_key_idx").on(table.namespace, table.key, table.id)],
);

export const publicNamespaces = sqliteTable("public_namespaces", {
  name: text("name").primaryKey(),
});
