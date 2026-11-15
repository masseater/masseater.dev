import { sum } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";

import type { InvalidRecord } from "#/shared/api";
import type { StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

import { transactions } from "./ledger.table.ts";

/** @internal */
export type Failure = StorageFailed | InvalidRecord;

/** @internal */
export type Services = Digest.Digest | SecureRandom.SecureRandom;

const NO_YEN = 0;

export const summedAmount = sum(transactions.amount).mapWith(Number);

export const yenOf = (value: number | null): number =>
  pipe(
    value,
    Option.fromNullOr,
    Option.getOrElse(() => NO_YEN),
  );

export const runAll = (items: readonly BatchItem<"sqlite">[]): Effect.Effect<void, StorageFailed> =>
  pipe(
    items,
    Arr.match({
      onEmpty: () => Effect.void,
      onNonEmpty: (nonEmpty) =>
        query(() => db.batch([Arr.headNonEmpty(nonEmpty), ...Arr.tailNonEmpty(nonEmpty)])).pipe(
          Effect.asVoid,
        ),
    }),
  );
