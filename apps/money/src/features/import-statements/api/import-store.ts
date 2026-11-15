import { count, eq } from "drizzle-orm";
import { Array as Arr, Clock, Effect, Option, pipe } from "effect";
import { SecureRandom } from "effect/crypto";

import {
  fingerprints,
  accountNamed,
  userRules,
  db,
  query,
  runAll,
  imports,
  transactions,
} from "#/entities/ledger";
import type { Failure } from "#/entities/ledger";
import { rejected } from "#/shared/api";

import { ROWS_PER_INSERT, insertsOf, rowOf } from "./import-rows";
import type { ImportRequest, NewRow, Prepared } from "./import-rows";

const NOTHING = 0;

const MAX_STATEMENTS = 900;

const MAX_ROWS = ROWS_PER_INSERT * MAX_STATEMENTS;

const withinLimit = (size: number): Effect.Effect<number, ReturnType<typeof rejected>> =>
  Effect.filterOrFail(
    Effect.succeed(size),
    (rows) => rows <= MAX_ROWS,
    (rows) => rejected(`${rows} 行は 1 回では取り込めません。${MAX_ROWS} 行以下に分けて送る`),
  );

const insertAll = Effect.fn("insertAll")(function* insertAll(
  prepared: Prepared,
  rows: readonly NewRow[],
) {
  const createdAt = yield* Clock.currentTimeMillis;
  const { importId, request } = prepared;
  const header = db
    .insert(imports)
    .values({ id: importId, accountId: request.accountId, source: request.source, createdAt });
  const inserts = insertsOf(rows);
  yield* runAll([header, ...inserts]);
  const [counted] = yield* query(() =>
    db.select({ added: count() }).from(transactions).where(eq(transactions.importId, importId)),
  );
  return pipe(
    Option.fromUndefinedOr(counted),
    Option.match({ onNone: () => NOTHING, onSome: ({ added }) => added }),
  );
});

const dropEmptyImport = (importId: string, added: number): Effect.Effect<void, Failure> =>
  Effect.when(
    query(() => db.delete(imports).where(eq(imports.id, importId))),
    Effect.succeed(added === NOTHING),
  ).pipe(Effect.asVoid);

const importEntries = Effect.fn("importEntries")(function* importEntries(request: ImportRequest) {
  yield* accountNamed(request.accountId);
  yield* withinLimit(request.entries.length);
  const prints = yield* fingerprints({ accountId: request.accountId, entries: request.entries });
  const random = yield* SecureRandom.SecureRandom;
  const importId = yield* random.uuidV4();
  const rules = yield* userRules;
  const rows = pipe(Arr.zip(request.entries, prints), Arr.map(rowOf({ importId, rules, request })));
  const added = yield* insertAll({ importId, rules, request }, rows);
  yield* dropEmptyImport(importId, added);
  return {
    importId: Option.getOrNull(Option.liftPredicate(importId, () => added > NOTHING)),
    added,
    duplicates: rows.length - added,
  };
});

const deleteImport = Effect.fn("deleteImport")(function* deleteImport(importId: string) {
  const [deletedRows, deletedImports] = yield* query(() =>
    db.batch([
      db
        .delete(transactions)
        .where(eq(transactions.importId, importId))
        .returning({ id: transactions.id }),
      db.delete(imports).where(eq(imports.id, importId)).returning({ id: imports.id }),
    ]),
  );
  yield* pipe(
    deletedImports,
    Arr.head,
    Effect.fromOption,
    Effect.mapError(() => rejected(`取り込み ${importId} はありません`)),
  );
  return { deleted: deletedRows.length };
});

/** @internal */
export { deleteImport, importEntries };
