import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Option, pipe } from "effect";

import { decide, transactions } from "#/entities/ledger/index.ts";
import type { Rule, Entry, Fingerprint } from "#/entities/ledger/index.ts";
import type { Build } from "#/shared/db/index.server.ts";

export type LedgerEntry = Entry & Readonly<{ memo: Option.Option<string> }>;

export type ImportRequest = Readonly<{
  accountId: string;
  source: string;
  entries: readonly LedgerEntry[];
}>;

export type NewRow = typeof transactions.$inferInsert;

export type Prepared = Readonly<{
  importId: string;
  rules: readonly Rule[];
  request: ImportRequest;
}>;

const COLUMNS_PER_ROW = 11;

const MAX_PARAMETERS = 100;

export const ROWS_PER_INSERT = Math.floor(MAX_PARAMETERS / COLUMNS_PER_ROW);

export const rowOf =
  ({ importId, rules, request }: Prepared) =>
  ([entry, print]: readonly [LedgerEntry, Fingerprint]): NewRow => {
    const { category, label } = decide(rules)({
      amount: entry.amount,
      normalized: print.normalized,
    });
    return {
      accountId: request.accountId,
      importId,
      date: entry.date,
      amount: entry.amount,
      description: entry.description,
      normalized: print.normalized,
      memo: Option.getOrNull(entry.memo),
      category,
      label: Option.getOrNull(label),
      manual: false,
      hash: print.hash,
    };
  };

export const insertsOf =
  (rows: readonly NewRow[]): Build<readonly BatchItem<"sqlite">[]> =>
  (db) =>
    pipe(
      rows,
      Arr.chunksOf(ROWS_PER_INSERT),
      Arr.map((chunk): BatchItem<"sqlite"> =>
        db
          .insert(transactions)
          .values([...chunk])
          .onConflictDoNothing({ target: transactions.hash }),
      ),
    );
