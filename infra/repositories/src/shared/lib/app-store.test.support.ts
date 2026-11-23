import { Array as Arr, Effect, Option, Record as Rec, Result, String as Str, pipe } from "effect";
import { Hex } from "effect/encoding";

import type { BoundStatement } from "#/shared/api/index.test.support.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

const KEY_BYTES = 32;

export type MemoryStore = Readonly<{
  env: AppStoreEnv;
  rows: Readonly<{
    get: (name: string) => Option.Option<string>;
    set: (name: string, value: string) => void;
    remove: (name: string) => void;
    names: () => readonly string[];
  }>;
}>;

type Rows = MemoryStore["rows"];

export const randomKey = (): string =>
  Hex.encode(crypto.getRandomValues(new Uint8Array(KEY_BYTES)));

const unsupported = (query: string): Promise<never> =>
  Promise.reject(new Error(`the fake store does not run: ${query}`));

const selecting = (rows: Rows, [name = ""]: readonly string[]): BoundStatement => ({
  first: () => Promise.resolve(Option.getOrNull(rows.get(name))),
  run: () => unsupported("SELECT with run"),
});

const isSwappable = (current: Option.Option<string>, expected: string): boolean =>
  Option.match(current, { onNone: () => true, onSome: (value) => value === expected });

const swapping = (
  rows: Rows,
  [name = "", value = "", expected = ""]: readonly string[],
): BoundStatement => ({
  first: () => {
    const swapped = Option.liftPredicate(name, () => isSwappable(rows.get(name), expected));
    if (Option.isSome(swapped)) {
      rows.set(name, value);
    }
    return Promise.resolve(Option.getOrNull(swapped));
  },
  run: () => unsupported("swap with run"),
});

const upserting = (rows: Rows, [name = "", value = ""]: readonly string[]): BoundStatement => ({
  first: () => unsupported("upsert with first"),
  run: () => {
    rows.set(name, value);
    return Promise.resolve({});
  },
});

const taking = (rows: Rows, [name = "", expected = ""]: readonly string[]): BoundStatement => ({
  first: () => {
    const taken = Option.liftPredicate(name, () =>
      Option.exists(rows.get(name), (value) => value === expected),
    );
    if (Option.isSome(taken)) {
      rows.remove(name);
    }
    return Promise.resolve(Option.getOrNull(taken));
  },
  run: () => unsupported("take with run"),
});

const sweeping = (rows: Rows, [from = "", to = ""]: readonly string[]): BoundStatement => ({
  first: () => unsupported("sweep with first"),
  run: () => {
    const swept = pipe(
      rows.names(),
      Arr.filter((name) => name >= from && name < to),
      Arr.map(rows.remove),
    );
    return Promise.resolve({ swept: swept.length });
  },
});

const DELETIONS: Readonly<
  Record<string, (rows: Rows, values: readonly string[]) => BoundStatement>
> = {
  "DELETE FROM github_app WHERE key = ? AND value = ? RETURNING key": taking,
  "DELETE FROM github_app WHERE key >= ? AND key < ?": sweeping,
};

const binding = (rows: Rows, query: string, values: readonly string[]): BoundStatement => {
  const deletion = Rec.get(DELETIONS, query);
  if (Option.isSome(deletion)) {
    return deletion.value(rows, values);
  }
  if (Str.startsWith("SELECT value FROM github_app WHERE key = ?")(query)) {
    return selecting(rows, values);
  }
  if (Str.endsWith("WHERE github_app.value = ? RETURNING key")(query)) {
    return swapping(rows, values);
  }
  if (Str.endsWith("DO UPDATE SET value = excluded.value")(query)) {
    return upserting(rows, values);
  }
  return { first: () => unsupported(query), run: () => unsupported(query) };
};

const rowsOf = (seed: Readonly<Record<string, string>>): Rows => {
  const stored = new Map(Rec.toEntries(seed));
  return {
    get: (name) => Option.fromNullishOr(stored.get(name)),
    set: (name, value) => {
      stored.set(name, value);
    },
    remove: (name) => {
      stored.delete(name);
    },
    names: () => [...stored.keys()],
  };
};

export const memoryStore = (seed: Readonly<Record<string, string>> = {}): MemoryStore => {
  const rows = rowsOf(seed);
  return {
    env: {
      GITHUB_APP: {
        prepare: (query) => ({ bind: (...values) => binding(rows, query, values) }),
      },
      SEAL_KEY: randomKey(),
    },
    rows,
  };
};

export const fails = <Value, Failure>(
  effect: Effect.Effect<Value, Failure>,
): Effect.Effect<boolean> => effect.pipe(Effect.result, Effect.map(Result.isFailure));
