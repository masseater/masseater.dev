import { Array as Arr, Effect, Option, pipe } from "effect";

import { entriesAtom, phaseAtom, upload } from "#/entities/interview/index.ts";
import type { Entry } from "#/entities/interview/index.ts";
import { read, write } from "#/shared/lib/registry.ts";

import { summarize } from "./summarize.ts";

const WRAP = "wrap";

/** @internal */
export const wrapsUp = (entry: Entry): boolean =>
  entry.kind === "question" && Option.contains(entry.strategy, WRAP);

/** @internal */
export const wrapUp = Effect.fn("kikite.wrapUp")(function* wrapUp() {
  yield* summarize();
  yield* upload();
  yield* write(phaseAtom, { status: "report" });
});

/** @internal */
export const wrapUpIfAsked = Effect.fn("kikite.wrapUpIfAsked")(function* wrapUpIfAsked() {
  const entries = yield* read(entriesAtom);
  if (pipe(Arr.last(entries), Option.exists(wrapsUp))) {
    yield* wrapUp();
  }
});
