import { Effect, Option, Record as Rec } from "effect";

import type { Unplayable } from "./unplayable.ts";

export type Played = Effect.Effect<void, Unplayable>;

export const done = (run: () => void): Played => Effect.sync(run);

export const optional =
  <Key extends string>(key: Key) =>
  (value: Option.Option<number>): Partial<Record<Key, number>> =>
    Option.match(value, {
      onNone: (): Partial<Record<Key, number>> => ({}),
      onSome: (given): Partial<Record<Key, number>> => Rec.singleton(key, given),
    });
