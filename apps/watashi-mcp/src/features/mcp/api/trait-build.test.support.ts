import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";

import type { AnalysisRequestValue, ObservationValue } from "#/features/mcp/model/trait-analysis";

import { TraitAnalyst } from "./trait-analyst";
import { buildStep } from "./trait-build.server";
import type { StepFailure, StepOutcome } from "./trait-build.server";

type Respond = (request: AnalysisRequestValue) => readonly ObservationValue[];

const SETTLED = "2 minutes";

const NO_REQUESTS = 0;

const requests: AnalysisRequestValue[] = [];

const nothing: Respond = () => [];

const forgetRequests = Effect.sync(() => {
  requests.splice(NO_REQUESTS);
});

const settle = TestClock.adjust(SETTLED);

const PAST_BUDGET = "11 minutes";

const pastBudget = TestClock.adjust(PAST_BUDGET);

const step = (respond: Respond): Effect.Effect<StepOutcome, StepFailure> =>
  buildStep.pipe(
    Effect.provideService(
      TraitAnalyst,
      TraitAnalyst.of({
        analyze: (request) =>
          Effect.sync(() => {
            requests.push(request);
            return { observations: respond(request) };
          }),
      }),
    ),
  );

const drain = (respond: Respond): Effect.Effect<readonly StepOutcome[], StepFailure> =>
  Effect.gen(function* drainSteps() {
    yield* settle;
    const outcomes: StepOutcome[] = [];
    let outcome = yield* step(respond);
    while (outcome.status === "progressed") {
      outcomes.push(outcome);
      outcome = yield* step(respond);
    }
    return outcomes;
  });

const sourceWith =
  (words: string) =>
  (request: AnalysisRequestValue): string =>
    pipe(
      request.sources,
      Arr.findFirst((source) => Str.includes(words)(source.text)),
      Option.match({ onNone: () => "missing", onSome: (source) => source.ref }),
    );

const sourcesOf = (outcomes: readonly StepOutcome[]): readonly number[] =>
  pipe(
    outcomes,
    Arr.flatMap((outcome) => {
      if (outcome.status === "progressed") {
        return [outcome.sources];
      }
      return [];
    }),
  );

const requestAt = (index: number): Option.Option<AnalysisRequestValue> => Arr.get(requests, index);

export {
  drain,
  forgetRequests,
  nothing,
  requestAt,
  requests,
  pastBudget,
  settle,
  sourceWith,
  sourcesOf,
  step,
};
export type { Respond };
