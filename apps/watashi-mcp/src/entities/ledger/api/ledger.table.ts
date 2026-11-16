import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { ACCOUNT_CLASSES } from "#/entities/ledger/model/accounts.ts";
import { CATEGORIES } from "#/entities/ledger/model/categories.ts";

export const accounts = sqliteTable("ledger_account", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  class: text("class", { enum: ACCOUNT_CLASSES }).notNull(),
});

export const imports = sqliteTable("ledger_import", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id),
  source: text("source").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const transactions = sqliteTable(
  "ledger_transaction",
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
    uniqueIndex("ledger_transaction_hash_idx").on(table.hash),
    index("ledger_transaction_date_idx").on(table.date),
    index("ledger_transaction_import_idx").on(table.importId),
  ],
);

export const balances = sqliteTable(
  "ledger_balance",
  {
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id),
    date: text("date").notNull(),
    balance: integer("balance").notNull(),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.date] })],
);

export const categoryRules = sqliteTable("ledger_category_rule", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull().unique(),
  category: text("category", { enum: CATEGORIES }).notNull(),
  label: text("label"),
});
