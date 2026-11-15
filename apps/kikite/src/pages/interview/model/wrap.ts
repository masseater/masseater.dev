import { Array as Arr, Effect, Option, pipe } from "effect";

import { entriesAtom, phaseAtom } from "./atoms.ts";
import type { Entry } from "./atoms.ts";
import { upload } from "./autosave.ts";
import { read, write } from "./registry.ts";
import { summarize } from "./summarize.ts";

const WRAP = "wrap";

export const wrapsUp = (entry: Entry): boolean =>
  entry.kind === "question" && Option.contains(entry.strategy, WRAP);

export const wrapUp = Effect.fn("kikite.wrapUp")(function* wrapUp() {
  yield* summarize();
  yield* upload();
  yield* write(phaseAtom, { status: "report" });
});

export const wrapUpIfAsked = Effect.fn("kikite.wrapUpIfAsked")(function* wrapUpIfAsked() {
  const entries = yield* read(entriesAtom);
  if (pipe(Arr.last(entries), Option.exists(wrapsUp))) {
    yield* wrapUp();
  }
});

/** @internal */
