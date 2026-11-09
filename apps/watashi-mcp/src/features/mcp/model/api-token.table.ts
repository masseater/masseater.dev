import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const TOKEN_SCOPES = ["conversation:write"] as const;

const apiToken = sqliteTable(
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

type ApiToken = typeof apiToken.$inferSelect;

type TokenScope = ApiToken["scope"];

export { TOKEN_SCOPES, apiToken };
export type { ApiToken, TokenScope };
