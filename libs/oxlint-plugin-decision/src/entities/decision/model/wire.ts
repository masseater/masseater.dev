import { Array as Arr, Option, Predicate, pipe, Record as Rec } from "effect";

import { snippetRefOf } from "./request.ts";
import type { DecisionRequest, DecisionResponse, Question } from "./types.ts";

const MAX_QUESTIONS = 64;

type State = DecisionRequest["state"];

export interface WireRequest extends Readonly<Pick<DecisionRequest, "model" | "state">> {
  readonly questions: Readonly<Record<string, Question>>;
}

const only = (
  entries: Readonly<Record<string, string>>,
  ref: string,
): Readonly<Record<string, string>> =>
  Option.match(Option.fromUndefinedOr(entries[ref]), {
    onNone: () => ({}),
    onSome: (text) => ({ [ref]: text }),
  });

const stateOf = ({ snippets, contexts }: State, ref: string): State => {
  if (Predicate.isUndefined(contexts)) {
    return { snippets: only(snippets, ref) };
  }
  return { snippets: only(snippets, ref), contexts: only(contexts, ref) };
};

export const fileRequestsFor = (
  request: DecisionRequest,
): Arr.NonEmptyReadonlyArray<WireRequest> => {
  const wires = pipe(
    Arr.chunksOf(Rec.toEntries(request.questions), MAX_QUESTIONS),
    Arr.map((chunk): WireRequest => ({ ...request, questions: Rec.fromEntries(chunk) })),
  );
  if (Arr.isReadonlyArrayNonEmpty(wires)) {
    return wires;
  }
  return [request];
};

export const snippetRequestsFor = (
  request: DecisionRequest,
): Arr.NonEmptyReadonlyArray<WireRequest> => {
  const bySnippet = Arr.groupBy(Rec.toEntries(request.questions), ([id]) => snippetRefOf(id));
  const wires = pipe(
    Rec.toEntries(bySnippet),
    Arr.flatMap(([ref, questions]) =>
      pipe(
        Arr.chunksOf(questions, MAX_QUESTIONS),
        Arr.map((chunk): WireRequest => ({
          model: request.model,
          state: stateOf(request.state, ref),
          questions: Rec.fromEntries(chunk),
        })),
      ),
    ),
  );
  if (Arr.isReadonlyArrayNonEmpty(wires)) {
    return wires;
  }
  return [request];
};

export const mergeResponses = (
  responses: Arr.NonEmptyReadonlyArray<DecisionResponse>,
): DecisionResponse => ({
  model: Arr.headNonEmpty(responses).model,
  answers: pipe(
    responses,
    Arr.flatMap(({ answers }) => Rec.toEntries(answers)),
    Rec.fromEntries,
  ),
});
