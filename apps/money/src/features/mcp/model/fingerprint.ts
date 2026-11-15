import { Array as Arr, Effect, HashMap, Option, pipe } from "effect";
import { Digest } from "effect/crypto";

import { normalized } from "#/features/mcp/model/categories";

export type Entry = Readonly<{ date: string; amount: number; description: string }>;

export type Fingerprint = Readonly<{ normalized: string; hash: string }>;

export type Source = Readonly<{ accountId: string; entries: readonly Entry[] }>;

const SEPARATOR = "\u0000";

const FIRST = 0;

const STEP = 1;

const keyOf =
  (accountId: string) =>
  (entry: Entry): string =>
    Arr.join(
      [accountId, entry.date, String(entry.amount), normalized(entry.description)],
      SEPARATOR,
    );

const occurrences = (keys: readonly string[]): readonly number[] =>
  pipe(
    keys,
    Arr.mapAccum(HashMap.empty<string, number>(), (seen, key) => {
      const count = pipe(
        HashMap.get(seen, key),
        Option.getOrElse(() => FIRST),
      );
      return [HashMap.set(seen, key, count + STEP), count];
    }),
    ([, counts]) => counts,
  );

const hashOf = Effect.fn("hashOf")(function* hashOf(text: string) {
  const digest = yield* Digest.Digest;
  return yield* digest.digestHex(Digest.sha256, new TextEncoder().encode(text));
});

const printOf = ([entry, [key, nth]]: readonly [Entry, readonly [string, number]]): Effect.Effect<
  Fingerprint,
  never,
  Digest.Digest
> => {
  const keyed = Arr.join([key, String(nth)], SEPARATOR);
  const text = normalized(entry.description);
  return pipe(
    hashOf(keyed),
    Effect.map((hash): Fingerprint => ({ normalized: text, hash })),
  );
};

export const fingerprints = ({
  accountId,
  entries,
}: Source): Effect.Effect<readonly Fingerprint[], never, Digest.Digest> => {
  const keys = pipe(entries, Arr.map(keyOf(accountId)));
  const numbered = Arr.zip(keys, occurrences(keys));
  return pipe(Arr.zip(entries, numbered), Effect.forEach(printOf));
};

/** @internal */
