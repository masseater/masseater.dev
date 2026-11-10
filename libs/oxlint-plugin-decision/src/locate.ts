import type { Location } from "@oxlint/plugins";
import { Effect, Option, Function as Fn } from "effect";

import {
  EVERY_LINE,
  locates,
  locationCandidates,
  locationOfLine,
  locationQuestion,
  selectedLocation,
} from "./location.ts";
import type { LocatedMatch } from "./location.ts";
import { locationRefOf, parseVerdicts } from "./request.ts";
import { messageOf, nowMs, runOrElse } from "./runtime.ts";
import type {
  DecideInput,
  DecideResult,
  DecisionRequest,
  LineRange,
  Match,
  ModelRef,
  Verdicts,
} from "./types.ts";

const DATA_FIRST_ARITY_3 = 3;

const DATA_FIRST_ARITY = 2;

type VerdictResult =
  | { readonly ok: true; readonly verdicts: Verdicts; readonly cached: boolean | undefined }
  | { readonly ok: false; readonly reason: string };

interface Located {
  readonly loc: Location;
  readonly failure: Option.Option<string>;
}

interface Asking {
  readonly model: ModelRef;
  readonly deadline: number;
  readonly env: Readonly<Record<string, string>>;
}

interface Refinement {
  readonly asking: Asking;
  readonly match: Match & LocatedMatch;
  readonly ref: string;
  readonly state: DecisionRequest["state"];
}

const MINIMUM_TIMEOUT_MS = 1;

const remainingMs = (deadline: number): number => Math.max(MINIMUM_TIMEOUT_MS, deadline - nowMs());

const verdictsOf: {
  (request: DecisionRequest): (result: DecideResult) => VerdictResult;
  (result: DecideResult, request: DecisionRequest): VerdictResult;
} = Fn.dual(DATA_FIRST_ARITY, (result: DecideResult, request: DecisionRequest): VerdictResult => {
  if (!result.ok) {
    return result;
  }
  return runOrElse(
    Effect.sync((): VerdictResult => ({
      ok: true,
      verdicts: parseVerdicts(result.response, request),
      cached: result.cached,
    })),
    (cause) => ({ ok: false, reason: messageOf(cause) }),
  );
});

const inputOf: {
  (request: DecisionRequest): (asking: Asking) => DecideInput;
  (asking: Asking, request: DecisionRequest): DecideInput;
} = Fn.dual(DATA_FIRST_ARITY, (asking: Asking, request: DecisionRequest): DecideInput => ({
  request,
  timeoutMs: remainingMs(asking.deadline),
  env: asking.env,
}));

const fetchVerdicts = (asking: Asking, request: DecisionRequest): VerdictResult =>
  verdictsOf(asking.model.provider.decide(inputOf(asking, request)), request);

const isRange = (location: Option.Option<LineRange>): location is Option.Some<LineRange> =>
  Option.exists(location, ({ start, end }) => start !== end);

const refineOnce = (
  { asking, match, ref, state }: Refinement,
  within: LineRange,
): VerdictResult & { readonly next?: Option.Option<LineRange> } => {
  const questionId = locationRefOf(ref);
  const candidates = locationCandidates(match.snippet, within);
  const refined = fetchVerdicts(asking, {
    model: asking.model.model,
    state,
    questions: { [questionId]: locationQuestion(match, ref, candidates) },
  });
  if (!refined.ok) {
    return refined;
  }
  return {
    ...refined,
    next: selectedLocation(
      refined.verdicts.answers[questionId],
      candidates,
      match.rule.location.cutoff,
    ),
  };
};

const refine = (refinement: Refinement, first: Option.Option<LineRange>): Located => {
  let location = first;
  while (isRange(location)) {
    const step = refineOnce(refinement, location.value);
    if (!step.ok) {
      return { loc: refinement.match.loc, failure: Option.some(step.reason) };
    }
    location = step.next ?? Option.none();
  }
  return {
    loc: Option.match(location, {
      onNone: () => refinement.match.loc,
      onSome: ({ start }) => locationOfLine(refinement.match.snippet, start),
    }),
    failure: Option.none(),
  };
};

interface LocateInput {
  readonly ref: string;
  readonly verdicts: Verdicts;
  readonly request: DecisionRequest;
}

const locateMatch: {
  (match: Match, input: LocateInput): (asking: Asking) => Located;
  (asking: Asking, match: Match, input: LocateInput): Located;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (asking: Asking, match: Match, { ref, verdicts, request }: LocateInput): Located => {
    if (!locates(match)) {
      return { loc: match.loc, failure: Option.none() };
    }
    const first = selectedLocation(
      verdicts.answers[locationRefOf(ref)],
      locationCandidates(match.snippet, EVERY_LINE),
      match.rule.location.cutoff,
    );
    return refine({ asking, match, ref, state: request.state }, first);
  },
);

export { inputOf, locateMatch, verdictsOf };
export type { Asking, LocateInput, Located, VerdictResult };
