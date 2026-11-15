import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const ownerProfile = sqliteTable("owner_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceHash: text("source_hash").notNull(),
  markdown: text("markdown").notNull(),
  markdownJa: text("markdown_ja").notNull(),
  builtAt: text("built_at").notNull(),
});

export type OwnerProfile = typeof ownerProfile.$inferSelect;
