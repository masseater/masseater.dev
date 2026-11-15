import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { sum } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";

import type { Rejected } from "#/shared/api/index.ts";

import { transactions } from "./ledger.table.ts";

/** @internal */
export type Failure = UpstreamFailed | Rejected;

/** @internal */
export type Services = Digest.Digest | SecureRandom.SecureRandom;

const NO_YEN = 0;

const failed = failedAt("ledger");

export const summedAmount = sum(transactions.amount).mapWith(Number);

export const yenOf = (value: number | null): number =>
  pipe(
    value,
    Option.fromNullOr,
    Option.getOrElse(() => NO_YEN),
  );

export const db = drizzle(env.LEDGER);

export const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, UpstreamFailed> =>
  Effect.tryPromise({ try: run, catch: failed });

export const runAll = (
  items: readonly BatchItem<"sqlite">[],
): Effect.Effect<void, UpstreamFailed> =>
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
