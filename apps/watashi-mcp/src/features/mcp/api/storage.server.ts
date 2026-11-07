import { or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, DateTime, Effect, Option, Predicate, String as Str, pipe } from "effect";

import { StorageFailed } from "#/features/mcp/model/storage-failed";

const messageOf = (cause: unknown): string =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({ onNone: () => String(cause), onSome: (error) => error.message }),
  );

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, StorageFailed> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => StorageFailed.make({ message: messageOf(cause) }),
  });

const firstRow =
  <Failure>(onEmpty: () => Failure) =>
  <Row>(rows: readonly Row[]): Effect.Effect<Row, Failure> =>
    Effect.fromOption(Arr.head(rows)).pipe(Effect.mapError(onEmpty));

const nowIso = DateTime.now.pipe(Effect.map(DateTime.formatIso));

const termsOf = (text: string): readonly string[] =>
  pipe(text, Str.split(/\s+/u), Arr.filter(Str.isNonEmpty), Arr.dedupe);

const anyTermMatches =
  (matchesOf: (pattern: string) => SQL[]) =>
  (terms: readonly string[]): Option.Option<SQL> => {
    const matches = pipe(
      terms,
      Arr.flatMap((term) => matchesOf(`%${term}%`)),
    );
    return Option.fromNullishOr(or(...matches));
  };

export { anyTermMatches, firstRow, nowIso, query, termsOf };
