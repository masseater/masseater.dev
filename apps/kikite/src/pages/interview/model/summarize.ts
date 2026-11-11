import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { requestSummary } from "#/shared/api";
import type { InterviewSetup } from "#protocol";

import { entriesAtom, heardAtom, summaryAtom, summaryOf } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";
import { linesOf, speechAfter } from "./transcript.ts";

const freshSpeech = Effect.fn("kikite.freshSpeech")(function* freshSpeech() {
  const heard = yield* read(heardAtom);
  const entries = yield* read(entriesAtom);
  const now = yield* Clock.currentTimeMillis;
  yield* modify(heardAtom, (current) => ({ ...current, lastSummaryAt: now }));
  return pipe(entries, speechAfter(heard.summarizedThrough));
});

const summarize = Effect.fn("kikite.summarize")(function* summarize(setup: InterviewSetup) {
  const fresh = yield* freshSpeech();
  const last = Arr.last(fresh);
  if (Option.isNone(last)) {
    return;
  }
  const state = yield* read(summaryAtom);
  const previous = summaryOf(state);
  yield* write(summaryAtom, { status: "updating", summary: previous });
  yield* requestSummary({ setup, previous, transcript: linesOf(fresh) }).pipe(
    Effect.matchEffect({
      onSuccess: (summary) =>
        Effect.andThen(
          write(summaryAtom, { status: "ready", summary: Option.some(summary) }),
          modify(heardAtom, (current) => ({ ...current, summarizedThrough: last.value.id })),
        ),
      onFailure: ({ message }) =>
        write(summaryAtom, { status: "failed", summary: previous, message }),
    }),
  );
});

/** @internal */
export { summarize };
