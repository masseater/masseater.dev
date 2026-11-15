import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { TestClock } from "effect/testing";

import type { AnalysisRequestValue } from "#/entities/trait";
import { TraitAnalyst } from "#/entities/trait";
import type { ObservationValue } from "#/entities/trait/index.test.support";
import { buildStep } from "#/features/build-traits/index.test.support";
import type { StepFailure, StepOutcome } from "#/features/build-traits/index.test.support";

export type Respond = (request: AnalysisRequestValue) => readonly ObservationValue[];

const SETTLED = "2 minutes";

const NO_REQUESTS = 0;

export const requests: AnalysisRequestValue[] = [];

export const nothing: Respond = () => [];

export const forgetRequests = Effect.sync(() => {
  requests.splice(NO_REQUESTS);
});

export const settle = TestClock.adjust(SETTLED);

const PAST_BUDGET = "11 minutes";

export const pastBudget = TestClock.adjust(PAST_BUDGET);

export const step = (respond: Respond): Effect.Effect<StepOutcome, StepFailure> =>
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

export const drain = (respond: Respond): Effect.Effect<readonly StepOutcome[], StepFailure> =>
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

export const sourceWith =
  (words: string) =>
  (request: AnalysisRequestValue): string =>
    pipe(
      request.sources,
      Arr.findFirst((source) => Str.includes(words)(source.text)),
      Option.match({ onNone: () => "missing", onSome: (source) => source.ref }),
    );

export const sourcesOf = (outcomes: readonly StepOutcome[]): readonly number[] =>
  pipe(
    outcomes,
    Arr.flatMap((outcome) => {
      if (outcome.status === "progressed") {
        return [outcome.sources];
      }
      return [];
    }),
  );

export const requestAt = (index: number): Option.Option<AnalysisRequestValue> =>
  Arr.get(requests, index);
