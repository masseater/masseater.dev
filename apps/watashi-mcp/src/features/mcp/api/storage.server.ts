import { or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  Array as Arr,
  DateTime,
  Effect,
  Option,
  Predicate,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { StorageFailed } from "#/features/mcp/model/storage-failed";

type WriteFailure = Readonly<{ duplicate: boolean; message: string }>;

const UNIQUE_VIOLATION = "UNIQUE constraint failed";

const messagesOf = (cause: unknown): readonly string[] =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({
      onNone: () => pipe(Option.fromNullishOr(cause), Option.map(String), Option.toArray),
      onSome: (error) => [error.message, ...messagesOf(error.cause)],
    }),
  );

const writeFailure = (cause: unknown): WriteFailure => {
  const messages = messagesOf(cause);
  return {
    duplicate: pipe(messages, Arr.some(Str.includes(UNIQUE_VIOLATION))),
    message: pipe(messages, Arr.join(": ")),
  };
};

const attempt = <Row>(run: () => Promise<Row>): Effect.Effect<Row, WriteFailure> =>
  Effect.tryPromise({ try: run, catch: writeFailure });

const storageFailed = ({ message }: WriteFailure): StorageFailed => StorageFailed.make({ message });

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, StorageFailed> =>
  attempt(run).pipe(Effect.mapError(storageFailed));

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

const FIRST = 1;

const nextAfterMax = (rows: readonly Readonly<{ max: number | null }>[]): number =>
  pipe(
    Arr.head(rows),
    Option.flatMap((row) => Option.fromNullishOr(row.max)),
    Option.match({ onNone: () => FIRST, onSome: (value) => value + FIRST }),
  );

const encodeJson = (value: unknown): Effect.Effect<string> =>
  Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown))(value).pipe(Effect.orDie);

export {
  anyTermMatches,
  attempt,
  encodeJson,
  firstRow,
  nextAfterMax,
  nowIso,
  query,
  storageFailed,
  termsOf,
};
export type { WriteFailure };
