import { Array as Arr, Effect, Option, pipe } from "effect";

import { requestResearch } from "#/shared/api";
import type { InterviewSummary } from "#protocol";

import {
  entriesAtom,
  heardAtom,
  leadsAtom,
  researchingAtom,
  summaryAtom,
  summaryOf,
} from "./atoms.ts";
import type { Lead } from "./atoms.ts";
import { modify, read, write } from "./registry.ts";
import { recentOf } from "./transcript.ts";

const KEPT_LEADS = 12;

const keyOf = ({ theme, points }: InterviewSummary): string =>
  pipe(points, Arr.prepend(theme), Arr.join("\n"));

const merged =
  (found: readonly Lead[]) =>
  (leads: readonly Lead[]): readonly Lead[] =>
    pipe(
      Arr.appendAll(leads, found),
      Arr.dedupeWith((left, right) => left.topic === right.topic),
      Arr.takeRight(KEPT_LEADS),
    );

const researchFor = Effect.fn("kikite.research")(function* researchFor(summary: InterviewSummary) {
  const known = yield* read(leadsAtom);
  const entries = yield* read(entriesAtom);
  yield* write(researchingAtom, { status: "running" });
  yield* modify(heardAtom, (heard) => ({ ...heard, researchedFor: keyOf(summary) }));
  yield* requestResearch({ summary, recent: recentOf(entries), known }).pipe(
    Effect.matchEffect({
      onSuccess: (found) =>
        Effect.all([modify(leadsAtom, merged(found)), write(researchingAtom, { status: "idle" })]),
      onFailure: ({ message }) => write(researchingAtom, { status: "failed", message }),
    }),
  );
});

const research = Effect.fn("kikite.researchIfChanged")(function* research() {
  const state = yield* read(summaryAtom);
  const summary = summaryOf(state);
  const heard = yield* read(heardAtom);
  const fresh = pipe(
    summary,
    Option.filter(({ theme }) => theme !== ""),
    Option.filter((current) => keyOf(current) !== heard.researchedFor),
  );
  if (Option.isSome(fresh)) {
    yield* researchFor(fresh.value);
  }
});

/** @internal */
export { research };
