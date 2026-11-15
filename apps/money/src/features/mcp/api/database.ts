import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { sum } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Digest, SecureRandom } from "effect/crypto";

import { transactions } from "./ledger.table";
import type { Rejected } from "./rejected";

type Failure = UpstreamFailed | Rejected;

type Services = Digest.Digest | SecureRandom.SecureRandom;

const NO_YEN = 0;

const failed = failedAt("ledger");

const summedAmount = sum(transactions.amount).mapWith(Number);

const yenOf = (value: number | null): number =>
  pipe(
    value,
    Option.fromNullOr,
    Option.getOrElse(() => NO_YEN),
  );

const db = drizzle(env.LEDGER);

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, UpstreamFailed> =>
  Effect.tryPromise({ try: run, catch: failed });

const runAll = (items: readonly BatchItem<"sqlite">[]): Effect.Effect<void, UpstreamFailed> =>
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

export { db, query, runAll, summedAmount, yenOf };
/** @internal */
export type { Failure, Services };
