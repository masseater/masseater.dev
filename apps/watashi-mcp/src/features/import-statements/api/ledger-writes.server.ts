import { Array as Arr, Effect, Option, pipe } from "effect";

import type { MoneyWriteOf } from "#/entities/ledger";
import { parseCsv } from "#/features/import-statements/model/csv";
import { InvalidRecord } from "#/shared/api";

import { importEntries } from "./import-store.server";

const DEFAULT_HEADER_ROW = 1;

/** @internal */
export const importCsv = Effect.fn("importCsv")(function* importCsv(
  input: MoneyWriteOf<"import_csv">,
) {
  const headerRow = pipe(
    Option.fromUndefinedOr(input.headerRow),
    Option.getOrElse(() => DEFAULT_HEADER_ROW),
  );
  const parsed = yield* pipe(
    parseCsv({ csv: input.csv, headerRow, columns: input.columns }),
    Effect.fromResult,
    Effect.mapError((message) => InvalidRecord.make({ message })),
  );
  const imported = yield* importEntries({
    accountId: input.account,
    source: input.source,
    entries: parsed.rows,
  });
  return {
    importId: imported.importId,
    added: imported.added,
    duplicates: imported.duplicates,
    rows: parsed.rows.length,
    skippedLines: parsed.skipped,
  };
});

/** @internal */
export const addTransactions = Effect.fn("addTransactions")(function* addTransactions({
  account,
  source,
  transactions,
}: MoneyWriteOf<"transactions">) {
  const entries = pipe(
    transactions,
    Arr.map(({ date, amount, description, memo }) => ({
      date,
      amount,
      description,
      memo: Option.fromUndefinedOr(memo),
    })),
  );
  return yield* importEntries({ accountId: account, source, entries });
});
