import { Effect, Option, Result, Schema, pipe } from "effect";

const PREFIX = "kikite.";

const taggedError = Schema.TaggedError;

class StorageBlocked extends taggedError<StorageBlocked, { readonly brand: unique symbol }>()(
  "StorageBlocked",
  { message: Schema.String },
) {}

type Stored = Readonly<{ key: string; value: string }>;

const blocked = (cause: unknown): StorageBlocked => StorageBlocked.make({ message: String(cause) });

const readStored = (key: string): Option.Option<string> =>
  pipe(
    Result.try({
      try: () => globalThis.localStorage.getItem(`${PREFIX}${key}`),
      catch: blocked,
    }),
    Result.getSuccess,
    Option.flatMap(Option.fromNullishOr),
  );

const writeStored = ({ key, value }: Stored): Effect.Effect<void> =>
  Effect.ignore(
    Effect.try({
      try: () => {
        globalThis.localStorage.setItem(`${PREFIX}${key}`, value);
      },
      catch: blocked,
    }),
  );

export { readStored, writeStored };
