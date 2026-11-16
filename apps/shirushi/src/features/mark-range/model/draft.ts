import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { songAtom } from "#/entities/song/index.ts";
import type { Aspect, Verb } from "#protocol";

export type Range = Readonly<{ from: number; to: number }>;

const perSong = <Value>(initial: Value): Atom.Writable<Value> =>
  Atom.writable(
    (get) => {
      get(songAtom);
      return initial;
    },
    (context, value: Value) => {
      context.setSelf(value);
    },
  ).pipe(Atom.keepAlive);

/** @internal */
export const rangeAtom = perSong(Option.none<Range>());

/** @internal */
export const anchorAtom = perSong(Option.none<number>());

/** @internal */
export const verbAtom = Atom.make<Verb>("like").pipe(Atom.keepAlive);

/** @internal */
export const aspectsAtom = Atom.make<readonly Aspect[]>([]).pipe(Atom.keepAlive);

/** @internal */
export const wordsAtom = Atom.make("").pipe(Atom.keepAlive);

export const spanOf = ([one, other]: readonly [number, number]): Range => ({
  from: Math.min(one, other),
  to: Math.max(one, other),
});
