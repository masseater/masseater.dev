import { TOKEN_SCOPES } from "@masseater.dev/watashi-protocol";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const apiToken = sqliteTable(
  "api_token",
  {
    id: text("id").primaryKey(),
    scope: text("scope", { enum: TOKEN_SCOPES }).notNull(),
    label: text("label").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at").notNull(),
    revokedAt: text("revoked_at"),
  },
  (table) => [uniqueIndex("api_token_hash_idx").on(table.tokenHash)],
);

export type ApiToken = typeof apiToken.$inferSelect;

export type TokenScope = ApiToken["scope"];
