import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { ACCOUNT_CLASSES } from "#/features/mcp/model/accounts";
import { CATEGORIES } from "#/features/mcp/model/categories";

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  class: text("class", { enum: ACCOUNT_CLASSES }).notNull(),
});

export const imports = sqliteTable("imports", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  source: text("source").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    importId: text("import_id")
      .notNull()
      .references(() => imports.id),
    date: text("date").notNull(),
    amount: integer("amount").notNull(),
    description: text("description").notNull(),
    normalized: text("normalized").notNull(),
    memo: text("memo"),
    category: text("category", { enum: CATEGORIES }).notNull(),
    label: text("label"),
    manual: integer("manual", { mode: "boolean" }).notNull(),
    hash: text("hash").notNull(),
  },
  (table) => [
    uniqueIndex("transactions_hash_idx").on(table.hash),
    index("transactions_date_idx").on(table.date),
    index("transactions_import_idx").on(table.importId),
  ],
);

export const balances = sqliteTable(
  "balances",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    date: text("date").notNull(),
    balance: integer("balance").notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.date] })],
);

export const categoryRules = sqliteTable("category_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull().unique(),
  category: text("category", { enum: CATEGORIES }).notNull(),
  label: text("label"),
});
