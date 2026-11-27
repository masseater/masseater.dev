import { sum } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";

import type { InvalidRecord } from "#/shared/api/index.ts";
import { Database, query } from "#/shared/db/index.server.ts";
import type { Build } from "#/shared/db/index.server.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

import { transactions } from "./ledger.table.ts";

/** @internal */
export type Failure = StorageFailed | InvalidRecord;

/** @internal */
export type Services = Database | Digest.Digest | SecureRandom.SecureRandom;

const NO_YEN = 0;

export const summedAmount = sum(transactions.amount).mapWith(Number);

export const yenOf = (value: number | null): number =>
  pipe(
    value,
    Option.fromNullOr,
    Option.getOrElse(() => NO_YEN),
  );

export const runAll = Effect.fn("ledger.runAll")(function* runAll(
  build: Build<readonly BatchItem<"sqlite">[]>,
) {
  const db = yield* Database;
  return yield* pipe(
    build(db),
    Arr.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (nonEmpty) =>
        query(() => db.batch([Arr.headNonEmpty(nonEmpty), ...Arr.tailNonEmpty(nonEmpty)])).pipe(
          Effect.asVoid,
        ),
    }),
  );
});
