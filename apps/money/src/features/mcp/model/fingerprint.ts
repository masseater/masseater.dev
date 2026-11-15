import { Array as Arr, Effect, HashMap, Option, pipe } from "effect";

import { normalized } from "./categories";

type Entry = Readonly<{ date: string; amount: number; description: string }>;

type Fingerprinted<Row extends Entry> = Row & Readonly<{ normalized: string; hash: string }>;

const SEPARATOR = "\u0000";

const HEX = 16;

const BYTE_WIDTH = 2;

const keyOf = (accountId: string, row: Entry): string =>
  Arr.join([accountId, row.date, String(row.amount), normalized(row.description)], SEPARATOR);

const occurrences = (keys: readonly string[]): readonly number[] =>
  pipe(
    keys,
    Arr.mapAccum(HashMap.empty<string, number>(), (seen, key) => {
      const count = Option.getOrElse(HashMap.get(seen, key), () => 0);
      return [HashMap.set(seen, key, count + 1), count];
    }),
    ([, counts]) => counts,
  );

const sha256 = (text: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).pipe(
    Effect.map((digest) =>
      Arr.join(
        Arr.map([...new Uint8Array(digest)], (byte) =>
          byte.toString(HEX).padStart(BYTE_WIDTH, "0"),
        ),
        "",
      ),
    ),
  );

const fingerprinted = <Row extends Entry>(
  accountId: string,
  rows: readonly Row[],
): Effect.Effect<readonly Fingerprinted<Row>[]> => {
  const keys = Arr.map(rows, (row) => keyOf(accountId, row));
  return Effect.forEach(Arr.zip(rows, Arr.zip(keys, occurrences(keys))), ([row, [key, nth]]) =>
    sha256(`${key}${SEPARATOR}${nth}`).pipe(
      Effect.map((hash) => ({ ...row, normalized: normalized(row.description), hash })),
    ),
  );
};

export { fingerprinted };
export type { Entry, Fingerprinted };
