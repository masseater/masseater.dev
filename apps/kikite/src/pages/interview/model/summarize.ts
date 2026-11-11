import { Array as Arr, Clock, Effect, Option, pipe } from "effect";
import type { AtomRegistry } from "effect/reactivity";

import { requestSummary } from "#/shared/api";
import type { InterviewSummary } from "#protocol";

import {
  entriesAtom,
  heardAtom,
  previousThemeAtom,
  progressAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import { rememberTheme } from "./memory.ts";
import { modify, read, write } from "./registry.ts";
import { linesOf, speechAfter } from "./transcript.ts";

const freshSpeech = Effect.fn("kikite.freshSpeech")(function* freshSpeech() {
  const heard = yield* read(heardAtom);
  const entries = yield* read(entriesAtom);
  const now = yield* Clock.currentTimeMillis;
  yield* modify(heardAtom, (current) => ({ ...current, lastSummaryAt: now }));
  return pipe(entries, speechAfter(heard.summarizedThrough));
});

const tracked = (
  summary: InterviewSummary,
): Effect.Effect<void, never, AtomRegistry.AtomRegistry> =>
  pipe(
    Clock.currentTimeMillis,
    Effect.flatMap((at) =>
      modify(progressAtom, (progress) =>
        Arr.append(progress, { at, open: summary.open.length, next: summary.next.length }),
      ),
    ),
  );

const remembered = Effect.fn("kikite.rememberTheme")(function* remembered(
  summary: InterviewSummary,
) {
  if (summary.theme !== "") {
    yield* rememberTheme(summary.theme);
    yield* write(previousThemeAtom, Option.some(summary.theme));
  }
});

const summarize = Effect.fn("kikite.summarize")(function* summarize() {
  const fresh = yield* freshSpeech();
  const last = Arr.last(fresh);
  if (Option.isNone(last)) {
    return;
  }
  const state = yield* read(summaryAtom);
  const previous = summaryOf(state);
  yield* write(summaryAtom, { status: "updating", summary: previous });
  yield* requestSummary({ previous, transcript: linesOf(fresh) }).pipe(
    Effect.matchEffect({
      onSuccess: (summary) =>
        Effect.all([
          write(summaryAtom, { status: "ready", summary: Option.some(summary) }),
          modify(heardAtom, (current) => ({ ...current, summarizedThrough: last.value.id })),
          tracked(summary),
          remembered(summary),
        ]),
      onFailure: ({ message }) =>
        write(summaryAtom, { status: "failed", summary: previous, message }),
    }),
  );
});

/** @internal */
export { summarize };
