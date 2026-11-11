import { Effect, Option } from "effect";

import { nudgeAtom, previousThemeAtom } from "./atoms.ts";
import type { Nudge } from "./atoms.ts";
import { read, write } from "./registry.ts";

const FIRST = 1;
const FIRST_TIME = "さっきまで、何をしていましたか？";
const SMALLER = "今日は何時に起きましたか？";

const textFor = (level: number, previous: Option.Option<string>): string => {
  if (level > FIRST) {
    return SMALLER;
  }
  return Option.match(previous, {
    onNone: () => FIRST_TIME,
    onSome: (theme) => `前に話していた「${theme}」は、その後どうですか？`,
  });
};

const NONE = 0;

const levelOf = (shown: Option.Option<Nudge>): number =>
  Option.match(shown, { onNone: () => NONE, onSome: (current) => current.level });

const nudge = Effect.fn("kikite.nudge")(function* nudge(level: number) {
  const shown = yield* read(nudgeAtom);
  if (level <= levelOf(shown)) {
    return;
  }
  const previous = yield* read(previousThemeAtom);
  const next: Nudge = { level, text: textFor(level, previous) };
  yield* write(nudgeAtom, Option.some(next));
});

/** @internal */
export { nudge };
