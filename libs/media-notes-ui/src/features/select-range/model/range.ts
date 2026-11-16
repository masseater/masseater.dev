import { Option } from "effect";
import { Atom } from "effect/reactivity";

import { openedAtom } from "#src/entities/media/index.ts";

export type Range = Readonly<{ from: number; to: number }>;

export type Tone = "plain" | "warn" | "faint";

export type Span = Readonly<{ key: string; from: number; to: number; tone: Tone }>;

const perMedia = <Value>(initial: Value): Atom.Writable<Value> =>
  Atom.writable(
    (get) => {
      get(openedAtom);
      return initial;
    },
    (context, value: Value) => {
      context.setSelf(value);
    },
  ).pipe(Atom.keepAlive);

/** @internal */
export const rangeAtom = perMedia(Option.none<Range>());

/** @internal */
export const anchorAtom = perMedia(Option.none<number>());

export const spanOf = ([one, other]: readonly [number, number]): Range => ({
  from: Math.min(one, other),
  to: Math.max(one, other),
});
