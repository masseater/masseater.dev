import { Array as Arr, Option, Predicate, pipe, Record as Rec, Function as Fn } from "effect";

import { snippetRefOf } from "./request.ts";
import type {
  ChoiceQuestion,
  DecisionRequest,
  DecisionResponse,
  NoulQuestion,
  Question,
} from "./types.ts";
import {
  isRespan,
  withChoices,
  isSeverityScale,
  levelsAboveNone,
  optionIdOf,
} from "./wire-choice.ts";

const DATA_FIRST_ARITY = 2;

const MAX_QUESTIONS = 64;

type State = DecisionRequest["state"];

export interface WireRequest extends Readonly<Pick<DecisionRequest, "model">> {
  readonly state: DecisionRequest["state"] | string;
  readonly questions: Readonly<Record<string, Question>>;
}

const sectionsOf = (name: string, entries: Readonly<Record<string, string>>): readonly string[] =>
  pipe(
    Rec.toEntries(entries),
    Arr.map(([ref, text]) => `state.${name}.${ref}:\n${text}`),
  );

const stateAsText = ({ snippets, contexts = {} }: State): string =>
  pipe(
    [...sectionsOf("snippets", snippets), ...sectionsOf("contexts", contexts)],
    Arr.join("\n\n"),
  );

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

const optionText = (label: string, description: string | null): string =>
  Option.match(Option.fromNullishOr(description), {
    onNone: () => `"${label}"`,
    onSome: (text) => `"${label}" (${text})`,
  });

const labelQuestion = (
  instructions: string,
  label: string,
  description: string | null,
): NoulQuestion => ({
  type: "noul",
  instructions: `${instructions} Does the label ${optionText(label, description)} fit?`,
});

const levelQuestion = (
  instructions: string,
  label: string,
  description: string | null,
): NoulQuestion => ({
  type: "noul",
  instructions: `${instructions} Is it at least as serious as ${optionText(label, description)}?`,
});

const yesNoQuestionsOf = (
  id: string,
  { instructions, criteria }: ChoiceQuestion,
): readonly (readonly [string, NoulQuestion])[] => {
  if (isSeverityScale(criteria)) {
    return pipe(
      levelsAboveNone(criteria),
      Arr.map(([label, description]) => [
        optionIdOf(id, label),
        levelQuestion(instructions, label, description),
      ]),
    );
  }
  return pipe(
    Rec.toEntries(criteria),
    Arr.map(([label, description]) => [
      optionIdOf(id, label),
      labelQuestion(instructions, label, description),
    ]),
  );
};

const asYesNo = ([id, question]: readonly [string, Question]): readonly (readonly [
  string,
  Question,
])[] => {
  if (question.type === "choice") {
    return yesNoQuestionsOf(id, question);
  }
  return [[id, question]];
};

type SnippetQuestions = Arr.NonEmptyReadonlyArray<readonly [string, Question]>;

const perSnippet =
  (wiresOf: (ref: string, questions: SnippetQuestions) => readonly WireRequest[]) =>
  (request: DecisionRequest): Arr.NonEmptyReadonlyArray<WireRequest> => {
    const bySnippet = Arr.groupBy(Rec.toEntries(request.questions), ([id]) => snippetRefOf(id));
    const wires = pipe(
      Rec.toEntries(bySnippet),
      Arr.flatMap(([ref, questions]) => wiresOf(ref, questions)),
    );
    if (Arr.isReadonlyArrayNonEmpty(wires)) {
      return wires;
    }
    return [request];
  };

export const yesNoRequestsFor = (
  request: DecisionRequest,
): Arr.NonEmptyReadonlyArray<WireRequest> =>
  perSnippet((ref, questions) => [
    {
      model: request.model,
      state: stateAsText(stateOf(request.state, ref)),
      questions: Rec.fromEntries(
        pipe(
          questions,
          Arr.flatMap((entry) => asYesNo(entry)),
        ),
      ),
    },
  ])(request);

export const snippetRequestsFor = (
  request: DecisionRequest,
): Arr.NonEmptyReadonlyArray<WireRequest> =>
  perSnippet((ref, questions) =>
    pipe(
      Arr.chunksOf(questions, MAX_QUESTIONS),
      Arr.map((chunk): WireRequest => ({
        model: request.model,
        state: stateOf(request.state, ref),
        questions: Rec.fromEntries(chunk),
      })),
    ),
  )(request);

export const wireRequestsFor = (
  request: DecisionRequest,
): Arr.NonEmptyReadonlyArray<WireRequest> => {
  if (isRespan(request.model)) {
    return yesNoRequestsFor(request);
  }
  return [request];
};

type Collapse = (
  request: DecisionRequest,
  answers: DecisionResponse["answers"],
) => DecisionResponse["answers"];

const merging =
  (collapse: Collapse) =>
  (
    request: DecisionRequest,
    responses: Arr.NonEmptyReadonlyArray<DecisionResponse>,
  ): DecisionResponse => ({
    ...Arr.headNonEmpty(responses),
    answers: collapse(
      request,
      pipe(
        responses,
        Arr.flatMap(({ answers }) => Rec.toEntries(answers)),
        Rec.fromEntries,
      ),
    ),
  });

export interface Merge {
  (
    responses: Arr.NonEmptyReadonlyArray<DecisionResponse>,
  ): (request: DecisionRequest) => DecisionResponse;
  (
    request: DecisionRequest,
    responses: Arr.NonEmptyReadonlyArray<DecisionResponse>,
  ): DecisionResponse;
}

export const mergeResponses: Merge = Fn.dual(DATA_FIRST_ARITY, merging(withChoices));
